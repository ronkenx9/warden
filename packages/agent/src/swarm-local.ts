/**
 * WARDEN autonomous agent swarm — local Anvil stress test.
 *
 * Spins up N independent (owner, agent) pairs sharing one WARDEN vault, then turns
 * the agents loose for R rounds. Each agent autonomously picks a trade — most are
 * in-policy, but each agent has a "personality" that makes it occasionally try to
 * break its policy (over-notional, blocked hours, wrong asset, or impersonating
 * another owner's agent). A monitor watches every attempt and slashes confirmed
 * violations.
 *
 * The point is the invariant, not the choreography: a policy violation must ALWAYS
 * revert before any asset leaves the vault, and an allowed trade must move exactly
 * its amountIn. The harness asserts both on every single attempt and fails loudly
 * if the vault ever lets a violation move funds.
 *
 *   pnpm --filter @warden/agent swarm
 *   WARDEN_SWARM_AGENTS=8 WARDEN_SWARM_ROUNDS=10 WARDEN_SWARM_SEED=7 pnpm ... swarm
 *   WARDEN_REUSE_ANVIL=1 pnpm ... swarm   # reuse an anvil already on :8547
 */
import { spawn, type ChildProcess } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import {
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  createTestClient,
  createWalletClient,
  encodeFunctionData,
  getContract,
  http,
  keccak256,
  parseEther,
  parseUnits,
  toHex,
  type Abi,
  type Address,
  type Hex,
} from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { foundry } from "viem/chains";

const rpcUrl = "http://127.0.0.1:8547";
const anvilMnemonic = "test test test test test test test test test test test junk";

const AGENT_COUNT = Math.max(2, Number(process.env.WARDEN_SWARM_AGENTS ?? 6));
const ROUNDS = Math.max(1, Number(process.env.WARDEN_SWARM_ROUNDS ?? 8));
const SEED = Number(process.env.WARDEN_SWARM_SEED ?? 1);
const SLASH_AMOUNT = parseUnits("10", 6); // USDC paid to owner per confirmed violation
const STAKE = parseUnits("100", 6);
const MAX_TRADE_EUR = parseEther("50");

type Artifact = { abi: Abi; bytecode: { object: Hex } | Hex };
type Personality = "honest" | "reckless" | "nightowl" | "wronghand" | "imposter";
type ViolationReason =
  | "TradeValueTooHigh"
  | "TradingWindowClosed"
  | "AssetNotAllowed"
  | "UnauthorizedAgent"
  | "PolicyExpired";

const REASONS: ViolationReason[] = [
  "TradeValueTooHigh",
  "TradingWindowClosed",
  "AssetNotAllowed",
  "UnauthorizedAgent",
  "PolicyExpired",
];

const AGENT_NAMES = ["YieldAgent", "IndexPilot", "HedgeLite", "ArbBot", "DcaDroid", "NightDesk", "BasisMaxi", "Quanta"];

// Where the run writes a JSON snapshot the dashboard reads. Override with WARDEN_SWARM_OUT.
const DASHBOARD_OUT = process.env.WARDEN_SWARM_OUT
  ? new URL(`file://${process.env.WARDEN_SWARM_OUT}`)
  : new URL("../../dashboard/src/swarm-data.json", import.meta.url);

interface SwarmEvent {
  round: number;
  agent: string;
  personality: Personality;
  action: string;
  timeCet: string;
  outcome: string; // "Allowed" or a ViolationReason
  slashed: boolean;
}
const events: SwarmEvent[] = [];

// Deterministic RNG so a seed reproduces a run exactly.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(SEED);
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
const between = (lo: number, hi: number): number => lo + rng() * (hi - lo);

const publicClient = createPublicClient({ chain: foundry, transport: http(rpcUrl) });
const testClient = createTestClient({ chain: foundry, mode: "anvil", transport: http(rpcUrl) });

const deployer = mnemonicToAccount(anvilMnemonic, { addressIndex: 0 });
const monitor = mnemonicToAccount(anvilMnemonic, { addressIndex: 1 });
const deployerClient = createWalletClient({ account: deployer, chain: foundry, transport: http(rpcUrl) });
const monitorClient = createWalletClient({ account: monitor, chain: foundry, transport: http(rpcUrl) });

interface Pair {
  i: number;
  name: string;
  personality: Personality;
  owner: ReturnType<typeof mnemonicToAccount>;
  agent: ReturnType<typeof mnemonicToAccount>;
  ownerClient: ReturnType<typeof createWalletClient>;
  agentClient: ReturnType<typeof createWalletClient>;
  agentId: bigint;
  stats: {
    attempts: number;
    allowed: number;
    violations: number;
    slashed: bigint;
    byReason: Record<ViolationReason, number>;
  };
}

async function artifact(path: string): Promise<Artifact> {
  return JSON.parse(await readFile(new URL(`../../contracts/out/${path}`, import.meta.url), "utf8")) as Artifact;
}
const bytecodeOf = (a: Artifact): Hex => (typeof a.bytecode === "string" ? a.bytecode : a.bytecode.object);

async function deploy(name: string, item: Artifact, args: readonly unknown[] = []): Promise<Address> {
  const hash = await deployerClient.deployContract({ abi: item.abi, bytecode: bytecodeOf(item), args });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (!receipt.contractAddress) throw new Error(`${name} deployment returned no address`);
  return receipt.contractAddress;
}

async function mined(hash: Hex): Promise<void> {
  await publicClient.waitForTransactionReceipt({ hash });
}

async function waitForAnvil(): Promise<void> {
  for (let i = 0; i < 50; i++) {
    try {
      await publicClient.getBlockNumber();
      return;
    } catch {
      await delay(100);
    }
  }
  throw new Error("anvil did not become ready");
}

// Next timestamp strictly after `after` whose CET minute-of-day equals the target.
function cetTimestamp(hour: number, minute: number, after: bigint): bigint {
  const minuteOfDay = (hour * 60 + minute + 1_440 - 60) % 1_440; // shift CET->UTC
  let ts = (after / 86_400n) * 86_400n + BigInt(minuteOfDay) * 60n;
  while (ts <= after + 2n) ts += 86_400n;
  return ts;
}

function classifyRevert(error: unknown): ViolationReason | "Unknown" {
  if (error instanceof BaseError) {
    const reverted = error.walk((e) => e instanceof ContractFunctionRevertedError);
    if (reverted instanceof ContractFunctionRevertedError) {
      const name = reverted.data?.errorName ?? reverted.reason ?? "";
      for (const r of REASONS) if (name.includes(r)) return r;
    }
  }
  const msg = String((error as { shortMessage?: string })?.shortMessage ?? error);
  for (const r of REASONS) if (msg.includes(r)) return r;
  return "Unknown";
}

function emptyReasons(): Record<ViolationReason, number> {
  return { TradeValueTooHigh: 0, TradingWindowClosed: 0, AssetNotAllowed: 0, UnauthorizedAgent: 0, PolicyExpired: 0 };
}

async function main() {
  let anvil: ChildProcess | undefined;
  if (process.env.WARDEN_REUSE_ANVIL !== "1") {
    anvil = spawn("anvil", ["--port", "8547", "--accounts", "40", "--silent"], { stdio: "ignore" });
    anvil.on("exit", (code) => {
      if (code !== null && code !== 0) console.error(`anvil exited with code ${code}`);
    });
  }

  try {
    await waitForAnvil();

    const erc20 = await artifact("MockERC20.sol/MockERC20.json");
    const routerArtifact = await artifact("MockRouter.sol/MockRouter.json");
    const permissionArtifact = await artifact("PermissionEngine.sol/PermissionEngine.json");
    const vaultArtifact = await artifact("WARDENVault.sol/WARDENVault.json");
    const identityArtifact = await artifact("AgentIdentityRegistry.sol/AgentIdentityRegistry.json");
    const monitorRegistryArtifact = await artifact("MonitorRegistry.sol/MonitorRegistry.json");
    const slashArtifact = await artifact("SlashPool.sol/SlashPool.json");

    console.log(`\nWARDEN swarm: deploying shared stack on Anvil (agents=${AGENT_COUNT}, rounds=${ROUNDS}, seed=${SEED}).`);
    const tsla = await deploy("rTSLA", erc20, ["Robinhood TSLA", "rTSLA", 18]);
    const amd = await deploy("rAMD", erc20, ["Robinhood AMD", "rAMD", 18]); // the "wrong asset"
    const usdc = await deploy("USDC", erc20, ["USD Coin", "USDC", 6]);
    const router = await deploy("MockRouter", routerArtifact);
    const permissionEngine = await deploy("PermissionEngine", permissionArtifact);
    const vault = await deploy("WARDENVault", vaultArtifact, [tsla, "WARDEN TSLA Vault", "wTSLA", permissionEngine]);
    const identity = await deploy("AgentIdentityRegistry", identityArtifact);
    const monitorRegistry = await deploy("MonitorRegistry", monitorRegistryArtifact);
    const slashPool = await deploy("SlashPool", slashArtifact, [usdc, identity, monitorRegistry]);

    const tslaW = getContract({ address: tsla, abi: erc20.abi, client: { public: publicClient, wallet: deployerClient } });
    const amdW = getContract({ address: amd, abi: erc20.abi, client: { public: publicClient, wallet: deployerClient } });
    const usdcW = getContract({ address: usdc, abi: erc20.abi, client: { public: publicClient, wallet: deployerClient } });
    const identityAsDeployer = getContract({
      address: identity,
      abi: identityArtifact.abi,
      client: { public: publicClient, wallet: deployerClient },
    });
    await mined(await identityAsDeployer.write.setSlashRecorder([slashPool]));
    const slashAsDeployer = getContract({
      address: slashPool,
      abi: slashArtifact.abi,
      client: { public: publicClient, wallet: deployerClient },
    });
    await mined(await slashAsDeployer.write.setMonitorAuthorization([monitor.address, true]));

    const personalities: Personality[] = ["honest", "reckless", "nightowl", "wronghand", "imposter"];
    const pairs: Pair[] = [];

    console.log("Onboarding agents (deposit, register, stake, sign policy)...");
    for (let i = 0; i < AGENT_COUNT; i++) {
      const owner = mnemonicToAccount(anvilMnemonic, { addressIndex: 2 + i });
      const agent = mnemonicToAccount(anvilMnemonic, { addressIndex: 2 + AGENT_COUNT + i });
      const ownerClient = createWalletClient({ account: owner, chain: foundry, transport: http(rpcUrl) });
      const agentClient = createWalletClient({ account: agent, chain: foundry, transport: http(rpcUrl) });

      // Fund + deposit owner collateral into the shared vault.
      await mined(await tslaW.write.mint([owner.address, parseEther("1000")]));
      const tslaAsOwner = getContract({ address: tsla, abi: erc20.abi, client: { public: publicClient, wallet: ownerClient } });
      await mined(await tslaAsOwner.write.approve([vault, parseEther("100")]));
      const vaultAsOwner = getContract({ address: vault, abi: vaultArtifact.abi, client: { public: publicClient, wallet: ownerClient } });
      await mined(await vaultAsOwner.write.deposit([parseEther("100"), owner.address]));

      // Agent identity + slash collateral.
      await mined(await usdcW.write.mint([agent.address, STAKE]));
      const identityAsAgent = getContract({ address: identity, abi: identityArtifact.abi, client: { public: publicClient, wallet: agentClient } });
      await mined(await identityAsAgent.write.register([`ipfs://warden-agent-${i}`]));
      const usdcAsAgent = getContract({ address: usdc, abi: erc20.abi, client: { public: publicClient, wallet: agentClient } });
      await mined(await usdcAsAgent.write.approve([slashPool, STAKE]));
      const slashAsAgent = getContract({ address: slashPool, abi: slashArtifact.abi, client: { public: publicClient, wallet: agentClient } });
      await mined(await slashAsAgent.write.deposit([STAKE]));

      const agentId = (await publicClient.readContract({
        address: identity,
        abi: identityArtifact.abi,
        functionName: "agentIdOfWallet",
        args: [agent.address],
      })) as bigint;

      // Owner signs and activates the policy for this agent.
      const block = await publicClient.getBlock();
      const policy = {
        owner: owner.address,
        agent: agent.address,
        allowedAsset: tsla,
        maxTradeValueEur: MAX_TRADE_EUR,
        forbiddenStartMinute: 22 * 60,
        forbiddenEndMinute: 6 * 60,
        validUntil: block.timestamp + 30n * 86_400n,
        nonce: 1n,
      } as const;
      const signature = await owner.signTypedData({
        domain: { name: "WARDEN Permission Engine", version: "1", chainId: foundry.id, verifyingContract: permissionEngine },
        types: {
          Policy: [
            { name: "owner", type: "address" },
            { name: "agent", type: "address" },
            { name: "allowedAsset", type: "address" },
            { name: "maxTradeValueEur", type: "uint256" },
            { name: "forbiddenStartMinute", type: "uint16" },
            { name: "forbiddenEndMinute", type: "uint16" },
            { name: "validUntil", type: "uint256" },
            { name: "nonce", type: "uint256" },
          ],
        },
        primaryType: "Policy",
        message: policy,
      });
      await mined(await vaultAsOwner.write.activatePolicy([policy, signature]));

      pairs.push({
        i,
        name: AGENT_NAMES[i % AGENT_NAMES.length] + (i >= AGENT_NAMES.length ? `-${i}` : ""),
        personality: personalities[i % personalities.length],
        owner,
        agent,
        ownerClient,
        agentClient,
        agentId,
        stats: { attempts: 0, allowed: 0, violations: 0, slashed: 0n, byReason: emptyReasons() },
      });
    }

    const vaultBalance = async (): Promise<bigint> =>
      (await publicClient.readContract({ address: tsla, abi: erc20.abi, functionName: "balanceOf", args: [vault] })) as bigint;

    // Each agent decides its own trade for this tick.
    function decideTrade(p: Pair): {
      label: string;
      expectViolation: boolean;
      targetOwner: Address;
      asset: Address;
      valueEur: bigint;
      amountIn: bigint;
      hour: number;
      minute: number;
    } {
      const misbehave = rng() < 0.45;
      let hour = Math.floor(between(9, 19));
      let valueEur = parseEther(between(5, 48).toFixed(2));
      let asset = tsla;
      let targetOwner = p.owner.address;
      let label = "in-policy trade";
      let expectViolation = false;

      if (misbehave) {
        switch (p.personality) {
          case "reckless":
            valueEur = parseEther(between(60, 140).toFixed(2));
            label = "over-notional";
            expectViolation = true;
            break;
          case "nightowl":
            hour = pick([0, 1, 2, 3, 23]);
            label = "blocked-hours";
            expectViolation = true;
            break;
          case "wronghand":
            asset = amd;
            label = "wrong-asset";
            expectViolation = true;
            break;
          case "imposter": {
            const victim = pick(pairs.filter((q) => q.i !== p.i));
            targetOwner = victim.owner.address;
            label = "impersonation";
            expectViolation = true;
            break;
          }
          case "honest":
          default:
            break; // honest agents stay in policy even when they "feel like" trading more
        }
      }
      const amountIn = parseEther(between(1, 8).toFixed(3));
      const minute = Math.floor(between(5, 50));
      return { label, expectViolation, targetOwner, asset, valueEur, amountIn, hour, minute };
    }

    // Invariant accumulators.
    let movedOnViolation = 0n; // must stay 0n forever
    let violationAttempts = 0;
    let allowedTrades = 0;
    let totalSlashed = 0n;
    let proofCounter = 0;
    let clock = (await publicClient.getBlock()).timestamp;

    console.log("\nReleasing the swarm.\n" + "-".repeat(72));
    for (let round = 1; round <= ROUNDS; round++) {
      const order = [...pairs].sort(() => rng() - 0.5);
      for (const p of order) {
        const plan = decideTrade(p);
        p.stats.attempts += 1;

        const ts = cetTimestamp(plan.hour, plan.minute, clock);
        await testClient.setNextBlockTimestamp({ timestamp: ts });
        await testClient.mine({ blocks: 1 });
        clock = ts + 1n;

        const before = await vaultBalance();
        const vaultAsAgent = getContract({
          address: vault,
          abi: vaultArtifact.abi,
          client: { public: publicClient, wallet: p.agentClient },
        });
        const trade = {
          asset: plan.asset,
          valueEur: plan.valueEur,
          amountIn: plan.amountIn,
          minAmountOut: 0n,
          target: router,
          data: encodeFunctionData({
            abi: routerArtifact.abi,
            functionName: "executeTrade",
            args: [plan.asset, plan.amountIn, 0n, usdc, plan.targetOwner],
          }),
        };

        let reason: ViolationReason | "Unknown" | null = null;
        try {
          await mined(await vaultAsAgent.write.execute([plan.targetOwner, trade]));
        } catch (error) {
          reason = classifyRevert(error);
        }
        const after = await vaultBalance();
        const moved = before - after;

        const tag = `R${round} a${p.i}/${p.personality.padEnd(9)}`;
        const timeCet = `${String(plan.hour).padStart(2, "0")}:${String(plan.minute).padStart(2, "0")} CET`;
        if (reason === null) {
          // Allowed trade: the router must have pulled exactly amountIn.
          p.stats.allowed += 1;
          allowedTrades += 1;
          if (moved !== plan.amountIn) {
            throw new Error(`${tag}: allowed trade moved ${moved}, expected ${plan.amountIn}`);
          }
          events.push({ round, agent: p.name, personality: p.personality, action: plan.label, timeCet, outcome: "Allowed", slashed: false });
          console.log(`${tag} [OK ]  ${plan.label.padEnd(14)} moved ${(Number(moved) / 1e18).toFixed(3)} rTSLA`);
        } else {
          // Violation: nothing may have left the vault. THIS is the core invariant.
          violationAttempts += 1;
          p.stats.violations += 1;
          movedOnViolation += moved;
          if (moved !== 0n) {
            throw new Error(`${tag}: VIOLATION MOVED FUNDS (${moved}) — invariant breached`);
          }
          if (reason !== "Unknown") p.stats.byReason[reason] += 1;

          // Monitor confirms the attempt and slashes (if the agent still has stake).
          const stake = (await publicClient.readContract({
            address: slashPool,
            abi: slashArtifact.abi,
            functionName: "stakeOf",
            args: [p.agent.address],
          })) as bigint;
          let slashNote = "no stake left";
          if (stake >= SLASH_AMOUNT) {
            const proofHash = keccak256(toHex(`${p.agent.address}:${reason}:${proofCounter++}:${ts}`));
            const slashAsMonitor = getContract({
              address: slashPool,
              abi: slashArtifact.abi,
              client: { public: publicClient, wallet: monitorClient },
            });
            await mined(await slashAsMonitor.write.submitViolation([p.agent.address, p.owner.address, SLASH_AMOUNT, proofHash]));
            p.stats.slashed += SLASH_AMOUNT;
            totalSlashed += SLASH_AMOUNT;
            slashNote = `slashed ${(Number(SLASH_AMOUNT) / 1e6).toFixed(0)} USDC -> owner`;
          }
          events.push({
            round,
            agent: p.name,
            personality: p.personality,
            action: plan.label,
            timeCet,
            outcome: reason === "Unknown" ? "Reverted" : reason,
            slashed: stake >= SLASH_AMOUNT,
          });
          console.log(`${tag} [REVERT] ${plan.label.padEnd(12)} ${String(reason).padEnd(20)} ${slashNote}`);
        }
      }
    }

    console.log("-".repeat(72));
    console.log("\nPer-agent ledger:");
    console.log(
      "  id  personality  attempts  allowed  violations  slashed(USDC)  stakeLeft  repViolations",
    );
    const agentRows: Array<{
      name: string;
      personality: Personality;
      score: number;
      stake: string;
      violations: number;
      ownerPaid: number;
      state: string;
    }> = [];
    for (const p of pairs) {
      const stake = (await publicClient.readContract({
        address: slashPool,
        abi: slashArtifact.abi,
        functionName: "stakeOf",
        args: [p.agent.address],
      })) as bigint;
      const rep = (await publicClient.readContract({
        address: identity,
        abi: identityArtifact.abi,
        functionName: "violationCount",
        args: [p.agentId],
      })) as bigint;
      const ownerUsdc = (await publicClient.readContract({
        address: usdc,
        abi: erc20.abi,
        functionName: "balanceOf",
        args: [p.owner.address],
      })) as bigint;
      console.log(
        `  ${String(p.i).padEnd(3)} ${p.personality.padEnd(11)} ${String(p.stats.attempts).padStart(8)} ${String(
          p.stats.allowed,
        ).padStart(8)} ${String(p.stats.violations).padStart(11)} ${(Number(p.stats.slashed) / 1e6)
          .toFixed(0)
          .padStart(13)} ${(Number(stake) / 1e6).toFixed(0).padStart(10)} ${String(rep).padStart(14)}` +
          `   (owner +${(Number(ownerUsdc) / 1e6).toFixed(0)} USDC)`,
      );

      // Per-agent reputation must match the proofs the monitor actually submitted.
      const expectedRep = BigInt(Number(p.stats.slashed / SLASH_AMOUNT));
      if (rep !== expectedRep) {
        throw new Error(`agent ${p.i}: reputation ${rep} != slashed-count ${expectedRep}`);
      }

      const score = Math.round((p.stats.allowed / Math.max(1, p.stats.attempts)) * 100);
      const state = p.stats.violations === 0 ? "Clean" : Number(stake) / 1e6 >= 50 ? "Watch" : "At risk";
      agentRows.push({
        name: p.name,
        personality: p.personality,
        score,
        stake: `${(Number(stake) / 1e6).toFixed(0)} USDG`,
        violations: Number(rep),
        ownerPaid: Number(ownerUsdc) / 1e6,
        state,
      });
    }

    const monitorPaidOut = (await publicClient.readContract({
      address: usdc,
      abi: erc20.abi,
      functionName: "balanceOf",
      args: [slashPool],
    })) as bigint;
    const remainingInPool = monitorPaidOut;
    const totalStaked = STAKE * BigInt(AGENT_COUNT);

    console.log("\n" + "=".repeat(72));
    console.log("INVARIANT REPORT");
    console.log(`  allowed trades executed ............ ${allowedTrades}`);
    console.log(`  violation attempts blocked ......... ${violationAttempts}`);
    console.log(`  funds moved on violation ........... ${movedOnViolation}  (MUST be 0)`);
    console.log(`  total slashed to owners ............ ${Number(totalSlashed) / 1e6} USDC`);
    console.log(`  slash pool: ${Number(totalStaked) / 1e6} staked -> ${Number(remainingInPool) / 1e6} remaining`);

    const ok = movedOnViolation === 0n && totalStaked - remainingInPool === totalSlashed;

    // Curated timeline: first allowed trade + first occurrence of each outcome, by round.
    const seenOutcomes = new Set<string>();
    const timeline = events
      .filter((e) => {
        if (seenOutcomes.has(e.outcome)) return false;
        seenOutcomes.add(e.outcome);
        return true;
      })
      .sort((a, b) => a.round - b.round)
      .slice(0, 7)
      .map((e) => ({
        time: e.timeCet,
        actor: e.agent,
        action: e.action === "in-policy trade" ? "In-policy rebalance" : `Attempted ${e.action} trade`,
        result: e.outcome === "Allowed" ? "Allowed" : e.slashed ? `${e.outcome} -> slashed` : `${e.outcome} -> reverted`,
      }));

    const snapshot = {
      generatedAt: process.env.WARDEN_SWARM_GENERATED_AT ?? "2026-06-12T00:00:00.000Z",
      seed: SEED,
      agentCount: AGENT_COUNT,
      rounds: ROUNDS,
      metrics: {
        allowedTrades,
        violationAttempts,
        fundsMovedOnViolation: Number(movedOnViolation),
        totalSlashed: Number(totalSlashed) / 1e6,
        staked: Number(totalStaked) / 1e6,
        remaining: Number(remainingInPool) / 1e6,
        invariantPass: ok,
      },
      agents: agentRows,
      timeline,
    };
    await writeFile(DASHBOARD_OUT, JSON.stringify(snapshot, null, 2) + "\n");
    console.log(`\nWrote dashboard snapshot -> ${DASHBOARD_OUT.pathname}`);

    console.log("=".repeat(72));
    if (!ok) {
      console.log("RESULT: FAIL — invariant breached.");
      throw new Error("swarm invariant check failed");
    }
    console.log("RESULT: PASS — every violation reverted before funds moved; slashing balanced.");
  } finally {
    if (anvil) anvil.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
