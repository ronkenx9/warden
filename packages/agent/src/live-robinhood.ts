import { readFile } from "node:fs/promises";
import {
  createPublicClient,
  createWalletClient,
  encodeAbiParameters,
  encodeFunctionData,
  formatUnits,
  getContract,
  http,
  parseEther,
  parseUnits,
  keccak256,
  defineChain,
  getAddress,
  type Abi,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

type Artifact = {
  abi: Abi;
};

type LiveMode = "blocked-now" | "allowed";

const robinhood = defineChain({
  id: 46_630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.ROBINHOOD_RPC_URL ?? "https://rpc.testnet.chain.robinhood.com"] },
  },
  blockExplorers: {
    default: { name: "Robinhood Explorer", url: "https://explorer.testnet.chain.robinhood.com" },
  },
  testnet: true,
});

const defaultDeployment = {
  tsla: "0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E",
  usdg: "0x7E955252E15c84f5768B83c41a71F9eba181802F",
  permissionEngine: "0xd63eFdD5F4774f48F678bD9d12A3cE85c758C428",
  vault: "0x5e8b55278FC2c1d0Ddb29A8973Bbba9f5CD55c98",
  identityRegistry: "0x68c451578B0E70e19A9369146061b5c311387cD3",
  slashPool: "0xE9F0F8BE0B079d5A910e651aF62A1a3756057Dc8",
  mockRouter: "0x1E1e8528760B310d0b23b32ee9B5a0025a280FF7",
} as const satisfies Record<string, Address>;

type Deployment = Record<keyof typeof defaultDeployment, Address>;

let deployment: Deployment = defaultDeployment;

async function loadDotEnv() {
  if (process.env.WARDEN_SKIP_DOTENV === "1") {
    return;
  }

  try {
    const env = await readFile(new URL("../../../.env", import.meta.url), "utf8");
    for (const line of env.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separator = trimmed.indexOf("=");
      if (separator === -1) {
        continue;
      }

      const key = trimmed.slice(0, separator).trim();
      const rawValue = trimmed.slice(separator + 1).trim();
      const value = rawValue.replace(/^['"]|['"]$/g, "");
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      throw error;
    }
  }
}

function requiredPrivateKey(name: string): Hex {
  const value = process.env[name];
  if (!value?.match(/^0x[0-9a-fA-F]{64}$/)) {
    throw new Error(
      `${name} must be set to a hex private key in local .env. Run pnpm preflight:robinhood first to verify funds and wiring without signing transactions.`,
    );
  }
  return value as Hex;
}

function addressEnv(name: string, fallback: Address): Address {
  const value = process.env[name];
  return value && value.length > 0 ? getAddress(value) : fallback;
}

function loadDeploymentFromEnv(): Deployment {
  return {
    tsla: addressEnv("WARDEN_ASSET", defaultDeployment.tsla),
    usdg: addressEnv("WARDEN_COLLATERAL", defaultDeployment.usdg),
    permissionEngine: addressEnv("WARDEN_PERMISSION_ENGINE", defaultDeployment.permissionEngine),
    vault: addressEnv("WARDEN_VAULT", defaultDeployment.vault),
    identityRegistry: addressEnv("WARDEN_IDENTITY_REGISTRY", defaultDeployment.identityRegistry),
    slashPool: addressEnv("WARDEN_SLASH_POOL", defaultDeployment.slashPool),
    mockRouter: addressEnv("WARDEN_MOCK_ROUTER", defaultDeployment.mockRouter),
  };
}

async function artifact(path: string): Promise<Artifact> {
  return JSON.parse(await readFile(new URL(`../../contracts/out/${path}`, import.meta.url), "utf8")) as Artifact;
}

async function transact(publicClient: { waitForTransactionReceipt: (args: { hash: Hex }) => Promise<{ status: string }> }, hash: Hex): Promise<Hex> {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error(`transaction failed: ${hash}`);
  }
  return hash;
}

function currentMinutePolicyWindow(timestamp: bigint): { start: number; end: number; minute: number } {
  const minute = Number(((timestamp + 3_600n) / 60n) % 1_440n);
  return { minute, start: minute, end: (minute + 2) % 1_440 };
}

async function main() {
  await loadDotEnv();
  deployment = loadDeploymentFromEnv();

  const mode = (process.env.WARDEN_LIVE_MODE ?? "blocked-now") as LiveMode;
  if (mode !== "blocked-now" && mode !== "allowed") {
    throw new Error("WARDEN_LIVE_MODE must be blocked-now or allowed");
  }

  const ownerKey = requiredPrivateKey("DEPLOYER_PRIVATE_KEY");
  const owner = privateKeyToAccount(ownerKey);
  const agent = privateKeyToAccount((process.env.WARDEN_AGENT_PRIVATE_KEY as Hex | undefined) ?? ownerKey);
  const rpcUrl = process.env.ROBINHOOD_RPC_URL ?? "https://rpc.testnet.chain.robinhood.com";
  const publicClient = createPublicClient({ chain: robinhood, transport: http(rpcUrl) });
  const ownerClient = createWalletClient({ account: owner, chain: robinhood, transport: http(rpcUrl) });
  const agentClient = createWalletClient({ account: agent, chain: robinhood, transport: http(rpcUrl) });

  const vaultArtifact = await artifact("WARDENVault.sol/WARDENVault.json");
  const routerArtifact = await artifact("MockRouter.sol/MockRouter.json");
  const identityArtifact = await artifact("AgentIdentityRegistry.sol/AgentIdentityRegistry.json");
  const slashPoolArtifact = await artifact("SlashPool.sol/SlashPool.json");
  const erc20Artifact = await artifact("MockERC20.sol/MockERC20.json");

  const vaultAsOwner = getContract({
    address: deployment.vault,
    abi: vaultArtifact.abi,
    client: { public: publicClient, wallet: ownerClient },
  });
  const vaultAsAgent = getContract({
    address: deployment.vault,
    abi: vaultArtifact.abi,
    client: { public: publicClient, wallet: agentClient },
  });

  const block = await publicClient.getBlock();
  const blockedWindow =
    mode === "blocked-now"
      ? currentMinutePolicyWindow(block.timestamp)
      : { minute: Number(((block.timestamp + 3_600n) / 60n) % 1_440n), start: 22 * 60, end: 6 * 60 };

  const policy = {
    owner: owner.address,
    agent: agent.address,
    allowedAsset: deployment.tsla,
    maxTradeValueEur: parseEther("50"),
    forbiddenStartMinute: blockedWindow.start,
    forbiddenEndMinute: blockedWindow.end,
    validUntil: block.timestamp + 7n * 86_400n,
    nonce: BigInt(Date.now()),
  } as const;

  const signature = await owner.signTypedData({
    domain: {
      name: "WARDEN Permission Engine",
      version: "1",
      chainId: robinhood.id,
      verifyingContract: deployment.permissionEngine,
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

  const totalAssetsBefore = (await publicClient.readContract({
    address: deployment.vault,
    abi: vaultArtifact.abi,
    functionName: "totalAssets",
  })) as bigint;
  const routerTslaBefore = (await publicClient.readContract({
    address: deployment.tsla,
    abi: erc20Artifact.abi,
    functionName: "balanceOf",
    args: [deployment.mockRouter],
  })) as bigint;
  const usdgDecimals = (await publicClient.readContract({
    address: deployment.usdg,
    abi: erc20Artifact.abi,
    functionName: "decimals",
  })) as number;

  console.log("WARDEN Robinhood live demo");
  console.log(`Mode: ${mode}`);
  console.log(`Owner: ${owner.address}`);
  console.log(`Agent: ${agent.address}${agent.address === owner.address ? " (same key fallback)" : ""}`);
  console.log(`Current CET minute: ${blockedWindow.minute}`);
  console.log(`Policy blocked window: ${blockedWindow.start}-${blockedWindow.end}`);
  console.log(`Vault totalAssets before: ${totalAssetsBefore}`);

  const activationHash = await transact(
    publicClient,
    await vaultAsOwner.write.activatePolicy([policy, signature]),
  );
  console.log(`PolicyActivated tx: ${activationHash}`);

  const amountIn = parseEther("0.01");
  const routerCall = encodeFunctionData({
    abi: routerArtifact.abi,
    functionName: "executeTrade",
    args: [deployment.tsla, amountIn, 0n, deployment.usdg, owner.address],
  });
  const trade = {
    asset: deployment.tsla,
    valueEur: parseEther("25"),
    amountIn,
    minAmountOut: 0n,
    target: deployment.mockRouter,
    data: routerCall,
  } as const;

  if (mode === "blocked-now") {
    let reverted = false;
    try {
      await vaultAsAgent.write.execute([owner.address, trade]);
    } catch (error) {
      reverted = String(error).includes("TradingWindowClosed");
    }
    if (!reverted) {
      throw new Error("expected execute() to revert with TradingWindowClosed");
    }

    const totalAssetsAfter = (await publicClient.readContract({
      address: deployment.vault,
      abi: vaultArtifact.abi,
      functionName: "totalAssets",
    })) as bigint;
    const routerTslaAfter = (await publicClient.readContract({
      address: deployment.tsla,
      abi: erc20Artifact.abi,
      functionName: "balanceOf",
      args: [deployment.mockRouter],
    })) as bigint;
    if (totalAssetsAfter !== totalAssetsBefore || routerTslaAfter !== routerTslaBefore) {
      throw new Error("blocked execution changed vault or router TSLA balances");
    }
    console.log("Blocked execute() reverted with TradingWindowClosed; no TSLA moved.");
    await maybeSlashViolation({
      publicClient,
      ownerClient,
      agentClient,
      agent: agent.address,
      beneficiary: owner.address,
      blockNumber: block.number ?? 0n,
      identityAbi: identityArtifact.abi,
      slashPoolAbi: slashPoolArtifact.abi,
      erc20Abi: erc20Artifact.abi,
      usdgDecimals,
    });
    return;
  }

  const executeHash = await transact(publicClient, await vaultAsAgent.write.execute([owner.address, trade]));
  console.log(`Allowed execute tx: ${executeHash}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function maybeSlashViolation({
  publicClient,
  ownerClient,
  agentClient,
  agent,
  beneficiary,
  blockNumber,
  identityAbi,
  slashPoolAbi,
  erc20Abi,
  usdgDecimals,
}: {
  publicClient: ReturnType<typeof createPublicClient>;
  ownerClient: ReturnType<typeof createWalletClient>;
  agentClient: ReturnType<typeof createWalletClient>;
  agent: Address;
  beneficiary: Address;
  blockNumber: bigint;
  identityAbi: Abi;
  slashPoolAbi: Abi;
  erc20Abi: Abi;
  usdgDecimals: number;
}) {
  if (process.env.WARDEN_LIVE_SLASH !== "1") {
    console.log("Skipping live slash; set WARDEN_LIVE_SLASH=1 after funding agent USDG collateral.");
    return;
  }

  const slashAmount = parseUnits(process.env.WARDEN_LIVE_SLASH_AMOUNT ?? "100", usdgDecimals);
  const identityAsAgent = getContract({
    address: deployment.identityRegistry,
    abi: identityAbi,
    client: { public: publicClient, wallet: agentClient },
  });
  const slashAsAgent = getContract({
    address: deployment.slashPool,
    abi: slashPoolAbi,
    client: { public: publicClient, wallet: agentClient },
  });
  const slashAsMonitor = getContract({
    address: deployment.slashPool,
    abi: slashPoolAbi,
    client: { public: publicClient, wallet: ownerClient },
  });
  const usdgAsAgent = getContract({
    address: deployment.usdg,
    abi: erc20Abi,
    client: { public: publicClient, wallet: agentClient },
  });

  let agentId = (await publicClient.readContract({
    address: deployment.identityRegistry,
    abi: identityAbi,
    functionName: "agentIdOfWallet",
    args: [agent],
  })) as bigint;

  if (agentId === 0n) {
    const registerHash = await transact(
      publicClient,
      await identityAsAgent.write.register(["ipfs://warden/yield-agent-live"]),
    );
    console.log(`Agent identity registered tx: ${registerHash}`);
    agentId = (await publicClient.readContract({
      address: deployment.identityRegistry,
      abi: identityAbi,
      functionName: "agentIdOfWallet",
      args: [agent],
    })) as bigint;
  }

  const agentUsdg = (await publicClient.readContract({
    address: deployment.usdg,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [agent],
  })) as bigint;
  const currentStake = (await publicClient.readContract({
    address: deployment.slashPool,
    abi: slashPoolAbi,
    functionName: "stakeOf",
    args: [agent],
  })) as bigint;

  if (currentStake < slashAmount) {
    const needed = slashAmount - currentStake;
    if (agentUsdg < needed) {
      console.log(
        `Skipping live slash; agent has ${formatUnits(agentUsdg, usdgDecimals)} USDG and needs ${formatUnits(
          needed,
          usdgDecimals,
        )} more USDG collateral.`,
      );
      return;
    }

    await transact(publicClient, await usdgAsAgent.write.approve([deployment.slashPool, needed]));
    const depositHash = await transact(publicClient, await slashAsAgent.write.deposit([needed]));
    console.log(`USDG collateral deposited tx: ${depositHash}`);
  }

  const violationCountBefore = (await publicClient.readContract({
    address: deployment.identityRegistry,
    abi: identityAbi,
    functionName: "violationCount",
    args: [agentId],
  })) as bigint;
  const stakeBefore = (await publicClient.readContract({
    address: deployment.slashPool,
    abi: slashPoolAbi,
    functionName: "stakeOf",
    args: [agent],
  })) as bigint;
  const beneficiaryBefore = (await publicClient.readContract({
    address: deployment.usdg,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [beneficiary],
  })) as bigint;
  const proofHash = keccak256(
    encodeAbiParameters(
      [
        { name: "vault", type: "address" },
        { name: "agent", type: "address" },
        { name: "beneficiary", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "blockNumber", type: "uint256" },
        { name: "reason", type: "string" },
      ],
      [deployment.vault, agent, beneficiary, slashAmount, blockNumber, "TradingWindowClosed"],
    ),
  );

  const slashHash = await transact(
    publicClient,
    await slashAsMonitor.write.submitViolation([agent, beneficiary, slashAmount, proofHash]),
  );
  const stakeAfter = (await publicClient.readContract({
    address: deployment.slashPool,
    abi: slashPoolAbi,
    functionName: "stakeOf",
    args: [agent],
  })) as bigint;
  const beneficiaryAfter = (await publicClient.readContract({
    address: deployment.usdg,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [beneficiary],
  })) as bigint;
  const violationCountAfter = (await publicClient.readContract({
    address: deployment.identityRegistry,
    abi: identityAbi,
    functionName: "violationCount",
    args: [agentId],
  })) as bigint;

  if (
    stakeAfter !== stakeBefore - slashAmount ||
    beneficiaryAfter !== beneficiaryBefore + slashAmount ||
    violationCountAfter !== violationCountBefore + 1n
  ) {
    throw new Error("live slash postconditions failed");
  }

  console.log(`Violation proof: ${proofHash}`);
  console.log(`Slash tx: ${slashHash}`);
  console.log(`Slashed ${formatUnits(slashAmount, usdgDecimals)} USDG and recorded agent reputation.`);
}
