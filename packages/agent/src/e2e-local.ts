import { spawn, type ChildProcess } from "node:child_process";
import { readFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import {
  createPublicClient,
  createTestClient,
  createWalletClient,
  encodeFunctionData,
  getContract,
  http,
  parseEther,
  parseUnits,
  type Abi,
  type Address,
  type Hex,
} from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { foundry } from "viem/chains";

type Artifact = {
  abi: Abi;
  bytecode: { object: Hex } | Hex;
};

const rpcUrl = "http://127.0.0.1:8547";
const anvilMnemonic = "test test test test test test test test test test test junk";

const accounts = {
  deployer: mnemonicToAccount(anvilMnemonic, { addressIndex: 0 }),
  sarah: mnemonicToAccount(anvilMnemonic, { addressIndex: 1 }),
  yieldAgent: mnemonicToAccount(anvilMnemonic, { addressIndex: 2 }),
  monitor: mnemonicToAccount(anvilMnemonic, { addressIndex: 3 }),
};

const publicClient = createPublicClient({ chain: foundry, transport: http(rpcUrl) });
const testClient = createTestClient({ chain: foundry, mode: "anvil", transport: http(rpcUrl) });

const deployerClient = createWalletClient({ account: accounts.deployer, chain: foundry, transport: http(rpcUrl) });
const sarahClient = createWalletClient({ account: accounts.sarah, chain: foundry, transport: http(rpcUrl) });
const agentClient = createWalletClient({ account: accounts.yieldAgent, chain: foundry, transport: http(rpcUrl) });
const monitorClient = createWalletClient({ account: accounts.monitor, chain: foundry, transport: http(rpcUrl) });

async function artifact(path: string): Promise<Artifact> {
  return JSON.parse(await readFile(new URL(`../../contracts/out/${path}`, import.meta.url), "utf8")) as Artifact;
}

function bytecodeOf(item: Artifact): Hex {
  return typeof item.bytecode === "string" ? item.bytecode : item.bytecode.object;
}

function futureTimestampForCetMinute(minuteOfDay: number, minAfter: bigint): bigint {
  const utcMinute = BigInt((minuteOfDay + 1_440 - 60) % 1_440);
  let timestamp = (minAfter / 86_400n) * 86_400n + utcMinute * 60n;
  if (timestamp <= minAfter) {
    timestamp += 86_400n;
  }
  return timestamp;
}

async function deploy(name: string, item: Artifact, args: readonly unknown[] = []): Promise<Address> {
  const hash = await deployerClient.deployContract({
    abi: item.abi,
    bytecode: bytecodeOf(item),
    args,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (!receipt.contractAddress) {
    throw new Error(`${name} deployment did not return a contract address`);
  }
  console.log(`${name}: ${receipt.contractAddress}`);
  return receipt.contractAddress;
}

async function waitForAnvil(): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      await publicClient.getBlockNumber();
      return;
    } catch {
      await delay(100);
    }
  }
  throw new Error("anvil did not become ready");
}

async function transact(hash: Hex): Promise<void> {
  await publicClient.waitForTransactionReceipt({ hash });
}

async function main() {
  let anvil: ChildProcess | undefined;
  if (process.env.WARDEN_REUSE_ANVIL !== "1") {
    anvil = spawn("anvil", ["--port", "8547", "--silent"], { stdio: "ignore" });
    anvil.on("exit", (code) => {
      if (code !== null && code !== 0) {
        console.error(`anvil exited with code ${code}`);
      }
    });
  }

  try {
    await waitForAnvil();

    const mockErc20 = await artifact("MockERC20.sol/MockERC20.json");
    const routerArtifact = await artifact("MockRouter.sol/MockRouter.json");
    const permissionArtifact = await artifact("PermissionEngine.sol/PermissionEngine.json");
    const vaultArtifact = await artifact("WARDENVault.sol/WARDENVault.json");
    const identityArtifact = await artifact("AgentIdentityRegistry.sol/AgentIdentityRegistry.json");
    const slashPoolArtifact = await artifact("SlashPool.sol/SlashPool.json");

    console.log("WARDEN local E2E: deploying demo stack on Anvil.");
    const tsla = await deploy("rTSLA", mockErc20, ["Robinhood TSLA", "rTSLA", 18]);
    const usdc = await deploy("USDC", mockErc20, ["USD Coin", "USDC", 6]);
    const router = await deploy("MockRouter", routerArtifact);
    const permissionEngine = await deploy("PermissionEngine", permissionArtifact);
    const vault = await deploy("WARDENVault", vaultArtifact, [tsla, "WARDEN TSLA Vault", "wTSLA", permissionEngine]);
    const identity = await deploy("AgentIdentityRegistry", identityArtifact);
    const slashPool = await deploy("SlashPool", slashPoolArtifact, [usdc, identity]);

    const tslaContract = getContract({ address: tsla, abi: mockErc20.abi, client: { public: publicClient, wallet: deployerClient } });
    const usdcContract = getContract({ address: usdc, abi: mockErc20.abi, client: { public: publicClient, wallet: deployerClient } });
    await transact(await tslaContract.write.mint([accounts.sarah.address, parseEther("1000")]));
    await transact(await usdcContract.write.mint([accounts.yieldAgent.address, parseUnits("500", 6)]));

    const identityAsDeployer = getContract({
      address: identity,
      abi: identityArtifact.abi,
      client: { public: publicClient, wallet: deployerClient },
    });
    await transact(await identityAsDeployer.write.setSlashRecorder([slashPool]));

    const identityAsAgent = getContract({
      address: identity,
      abi: identityArtifact.abi,
      client: { public: publicClient, wallet: agentClient },
    });
    await transact(await identityAsAgent.write.register(["ipfs://yield-agent"]));

    const usdcAsAgent = getContract({ address: usdc, abi: mockErc20.abi, client: { public: publicClient, wallet: agentClient } });
    await transact(await usdcAsAgent.write.approve([slashPool, parseUnits("500", 6)]));
    const slashAsAgent = getContract({
      address: slashPool,
      abi: slashPoolArtifact.abi,
      client: { public: publicClient, wallet: agentClient },
    });
    await transact(await slashAsAgent.write.deposit([parseUnits("500", 6)]));

    const tslaAsSarah = getContract({ address: tsla, abi: mockErc20.abi, client: { public: publicClient, wallet: sarahClient } });
    await transact(await tslaAsSarah.write.approve([vault, parseEther("100")]));
    const vaultAsSarah = getContract({ address: vault, abi: vaultArtifact.abi, client: { public: publicClient, wallet: sarahClient } });
    await transact(await vaultAsSarah.write.deposit([parseEther("100"), accounts.sarah.address]));

    const latestBlock = await publicClient.getBlock();
    const validUntil = latestBlock.timestamp + 30n * 86_400n;

    const policy = {
      owner: accounts.sarah.address,
      agent: accounts.yieldAgent.address,
      allowedAsset: tsla,
      maxTradeValueEur: parseEther("50"),
      forbiddenStartMinute: 22 * 60,
      forbiddenEndMinute: 6 * 60,
      validUntil,
      nonce: 1n,
    } as const;

    const signature = await accounts.sarah.signTypedData({
      domain: {
        name: "WARDEN Permission Engine",
        version: "1",
        chainId: foundry.id,
        verifyingContract: permissionEngine,
      },
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
    await transact(await vaultAsSarah.write.activatePolicy([policy, signature]));

    const routerData = (amountIn: bigint) =>
      encodeFunctionData({
        abi: routerArtifact.abi,
        functionName: "executeTrade",
        args: [tsla, amountIn, 0n, usdc, accounts.sarah.address],
      });

    const trade = (valueEur: bigint, amountIn: bigint) => ({
      asset: tsla,
      valueEur,
      amountIn,
      minAmountOut: 0n,
      target: router,
      data: routerData(amountIn),
    });

    const vaultAsAgent = getContract({ address: vault, abi: vaultArtifact.abi, client: { public: publicClient, wallet: agentClient } });

    const allowedAt = futureTimestampForCetMinute(12 * 60 + 30, latestBlock.timestamp);
    await testClient.setNextBlockTimestamp({ timestamp: allowedAt });
    await testClient.mine({ blocks: 1 });
    await transact(await vaultAsAgent.write.execute([accounts.sarah.address, trade(parseEther("25"), parseEther("10"))]));
    console.log("Allowed trade executed by YieldAgent.");

    const blockedAt = futureTimestampForCetMinute(1 * 60 + 30, allowedAt);
    await testClient.setNextBlockTimestamp({ timestamp: blockedAt });
    await testClient.mine({ blocks: 1 });
    let blocked = false;
    try {
      await vaultAsAgent.write.execute([accounts.sarah.address, trade(parseEther("25"), parseEther("1"))]);
    } catch (error) {
      blocked = String(error).includes("TradingWindowClosed");
    }
    if (!blocked) {
      throw new Error("blocked-hours trade did not revert with TradingWindowClosed");
    }
    console.log("Blocked-hours trade reverted with TradingWindowClosed().");

    const proofHash = "0xdcaadfb1e15ba3c9685dee80af1bc2ce4e72edcc309c4b519c0e4aaac12434eb" as Hex;
    const slashAsMonitor = getContract({
      address: slashPool,
      abi: slashPoolArtifact.abi,
      client: { public: publicClient, wallet: monitorClient },
    });
    await transact(
      await slashAsMonitor.write.submitViolation([
        accounts.yieldAgent.address,
        accounts.sarah.address,
        parseUnits("100", 6),
        proofHash,
      ]),
    );

    const sarahUsdc = await publicClient.readContract({
      address: usdc,
      abi: mockErc20.abi,
      functionName: "balanceOf",
      args: [accounts.sarah.address],
    });
    const agentStake = await publicClient.readContract({
      address: slashPool,
      abi: slashPoolArtifact.abi,
      functionName: "stakeOf",
      args: [accounts.yieldAgent.address],
    });
    const violationCount = await publicClient.readContract({
      address: identity,
      abi: identityArtifact.abi,
      functionName: "violationCount",
      args: [1n],
    });

    if (sarahUsdc !== parseUnits("100", 6) || agentStake !== parseUnits("400", 6) || violationCount !== 1n) {
      throw new Error("slash/reputation postconditions failed");
    }

    console.log("Monitor proof slashed 100 USDC to Sarah and recorded YieldAgent reputation.");
    console.log("WARDEN local E2E passed.");
  } finally {
    if (anvil) {
      anvil.kill("SIGTERM");
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
