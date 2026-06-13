import { readFile } from "node:fs/promises";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  formatUnits,
  getContract,
  http,
  isAddress,
  parseUnits,
  type Abi,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createViolationProof, type ViolationReason } from "./index.js";

type Artifact = { abi: Abi };

export type SubmitViolationResult = {
  chainId: number;
  monitor: Address;
  agentId: string;
  proofHash: Hex;
  slashAmount: string;
  tx: Hex;
};

const defaults = {
  rpcUrl: "https://rpc.testnet.chain.robinhood.com",
  chainId: 46_630,
  chainName: "Robinhood Chain Testnet",
  vault: "0x02e658d8F20bbF94d85D0eCC0365Ab4aa5c26Daf",
  identityRegistry: "0x4D566c927d0B4d40AcC880b9729d8c5D905867D1",
  slashPool: "0x6745b7CE66756085cF1254d2028EB9e3b4407bbE",
  collateral: "0x7E955252E15c84f5768B83c41a71F9eba181802F",
} as const;

export async function loadDotEnv() {
  if (process.env.WARDEN_SKIP_DOTENV === "1") return;

  try {
    const env = await readFile(new URL("../../../.env", import.meta.url), "utf8");
    for (const line of env.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;
      const key = trimmed.slice(0, separator).trim();
      const rawValue = trimmed.slice(separator + 1).trim();
      const value = rawValue.replace(/^['"]|['"]$/g, "");
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  } catch (error) {
    if ((error as { code?: string }).code !== "ENOENT") throw error;
  }
}

async function artifact(path: string): Promise<Artifact> {
  return JSON.parse(await readFile(new URL(`../../contracts/out/${path}`, import.meta.url), "utf8")) as Artifact;
}

function envValue(env: NodeJS.ProcessEnv, name: string, fallback?: string): string | undefined {
  const value = env[name];
  return value && value.length > 0 ? value : fallback;
}

export function requiredAddress(env: NodeJS.ProcessEnv, name: string, fallback?: string): Address {
  const value = envValue(env, name, fallback);
  if (!value || !isAddress(value)) throw new Error(`${name} must be a valid address`);
  return value;
}

export function requiredPrivateKey(env: NodeJS.ProcessEnv, name: string): Hex {
  const value = env[name];
  if (!value?.match(/^0x[0-9a-fA-F]{64}$/)) throw new Error(`${name} must be a hex private key`);
  return value as Hex;
}

function optionalHex32(env: NodeJS.ProcessEnv, name: string): Hex | undefined {
  const value = env[name];
  if (!value) return undefined;
  if (!value.match(/^0x[0-9a-fA-F]{64}$/)) throw new Error(`${name} must be a bytes32 hex value`);
  return value as Hex;
}

export function monitorQuoteConfig(env: NodeJS.ProcessEnv = process.env): {
  resource: string;
  asset: Address;
  payTo: Address;
} {
  return {
    resource: env.WARDEN_MONITOR_RESOURCE ?? "/violations",
    asset: requiredAddress(env, "WARDEN_X402_ASSET", env.WARDEN_COLLATERAL ?? defaults.collateral),
    payTo: requiredAddress(env, "WARDEN_PAYMENT_RECEIVER", env.WARDEN_MONITOR_ADDRESS),
  };
}

export async function submitViolationFromEnv(env: NodeJS.ProcessEnv = process.env): Promise<SubmitViolationResult> {
  await loadDotEnv();

  const rpcUrl = env.WARDEN_RPC_URL ?? env.ROBINHOOD_RPC_URL ?? defaults.rpcUrl;
  const chainId = Number(env.WARDEN_CHAIN_ID ?? env.ROBINHOOD_CHAIN_ID ?? defaults.chainId);
  const chain = defineChain({
    id: chainId,
    name: env.WARDEN_CHAIN_NAME ?? defaults.chainName,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  });

  const monitor = privateKeyToAccount(requiredPrivateKey(env, "WARDEN_MONITOR_PRIVATE_KEY"));
  const vault = requiredAddress(env, "WARDEN_VAULT", defaults.vault);
  const identityRegistry = requiredAddress(env, "WARDEN_IDENTITY_REGISTRY", defaults.identityRegistry);
  const slashPool = requiredAddress(env, "WARDEN_SLASH_POOL", defaults.slashPool);
  const collateral = requiredAddress(env, "WARDEN_COLLATERAL", defaults.collateral);
  const owner = requiredAddress(env, "WARDEN_OWNER");
  const agent = requiredAddress(env, "WARDEN_AGENT");
  const beneficiary = requiredAddress(env, "WARDEN_BENEFICIARY", owner);
  const reason = (env.WARDEN_VIOLATION_REASON ?? "TradingWindowClosed") as ViolationReason;
  const blockNumber = BigInt(env.WARDEN_VIOLATION_BLOCK ?? "0");
  const simulationHash =
    optionalHex32(env, "WARDEN_SIMULATION_HASH") ??
    "0x0000000000000000000000000000000000000000000000000000000000000000";

  const slashPoolArtifact = await artifact("SlashPool.sol/SlashPool.json");
  const identityArtifact = await artifact("AgentIdentityRegistry.sol/AgentIdentityRegistry.json");
  const erc20Artifact = await artifact("MockERC20.sol/MockERC20.json");

  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const monitorClient = createWalletClient({ account: monitor, chain, transport: http(rpcUrl) });

  const slash = getContract({
    address: slashPool,
    abi: slashPoolArtifact.abi,
    client: { public: publicClient, wallet: monitorClient },
  });

  const decimals = (await publicClient.readContract({
    address: collateral,
    abi: erc20Artifact.abi,
    functionName: "decimals",
  })) as number;
  const slashAmount = parseUnits(env.WARDEN_SLASH_AMOUNT ?? "100", decimals);

  const agentId = (await publicClient.readContract({
    address: identityRegistry,
    abi: identityArtifact.abi,
    functionName: "agentIdOfWallet",
    args: [agent],
  })) as bigint;
  if (agentId === 0n) throw new Error(`agent ${agent} has no registered identity; register before monitor submission`);

  const stake = (await publicClient.readContract({
    address: slashPool,
    abi: slashPoolArtifact.abi,
    functionName: "stakeOf",
    args: [agent],
  })) as bigint;
  if (stake < slashAmount) {
    throw new Error(`insufficient stake: ${formatUnits(stake, decimals)} < ${formatUnits(slashAmount, decimals)}`);
  }

  const authorized = (await publicClient.readContract({
    address: slashPool,
    abi: slashPoolArtifact.abi,
    functionName: "authorizedMonitors",
    args: [monitor.address],
  })) as boolean;
  if (!authorized) throw new Error(`monitor ${monitor.address} is not authorized by SlashPool ${slashPool}`);

  const proofHash =
    optionalHex32(env, "WARDEN_PROOF_HASH") ??
    createViolationProof({
      vault,
      owner,
      agent,
      beneficiary,
      slashAmount,
      reason,
      blockNumber,
      simulationHash,
    }).proofHash;

  const alreadyUsed = (await publicClient.readContract({
    address: slashPool,
    abi: slashPoolArtifact.abi,
    functionName: "usedProofs",
    args: [proofHash],
  })) as boolean;
  if (alreadyUsed) throw new Error(`proof already used: ${proofHash}`);

  const tx = await slash.write.submitViolation([agent, beneficiary, slashAmount, proofHash]);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
  if (receipt.status !== "success") throw new Error(`slash transaction failed: ${tx}`);

  return {
    chainId,
    monitor: monitor.address,
    agentId: agentId.toString(),
    proofHash,
    slashAmount: formatUnits(slashAmount, decimals),
    tx,
  };
}
