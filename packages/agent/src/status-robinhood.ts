import { readFile } from "node:fs/promises";
import { createPublicClient, defineChain, formatEther, formatUnits, http, parseUnits, type Abi, type Address } from "viem";

type Artifact = {
  abi: Abi;
};

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

const deployment = {
  deployer: "0xAdAd6565e19c5d256E1114226735D5496Ab9a627",
  tsla: "0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E",
  usdg: "0x7E955252E15c84f5768B83c41a71F9eba181802F",
  permissionEngine: "0xd63eFdD5F4774f48F678bD9d12A3cE85c758C428",
  vault: "0x5e8b55278FC2c1d0Ddb29A8973Bbba9f5CD55c98",
  identityRegistry: "0x68c451578B0E70e19A9369146061b5c311387cD3",
  slashPool: "0xE9F0F8BE0B079d5A910e651aF62A1a3756057Dc8",
  mockRouter: "0x1E1e8528760B310d0b23b32ee9B5a0025a280FF7",
} as const satisfies Record<string, Address>;

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

async function artifact(path: string): Promise<Artifact> {
  return JSON.parse(await readFile(new URL(`../../contracts/out/${path}`, import.meta.url), "utf8")) as Artifact;
}

async function main() {
  await loadDotEnv();

  const rpcUrl = process.env.ROBINHOOD_RPC_URL ?? "https://rpc.testnet.chain.robinhood.com";
  const watchedAgent = (process.env.WARDEN_AGENT_ADDRESS ?? deployment.deployer) as Address;
  const publicClient = createPublicClient({ chain: robinhood, transport: http(rpcUrl) });
  const vaultArtifact = await artifact("WARDENVault.sol/WARDENVault.json");
  const slashPoolArtifact = await artifact("SlashPool.sol/SlashPool.json");
  const identityArtifact = await artifact("AgentIdentityRegistry.sol/AgentIdentityRegistry.json");
  const erc20Artifact = await artifact("MockERC20.sol/MockERC20.json");

  const [
    chainId,
    blockNumber,
    deployerEth,
    tslaName,
    tslaSymbol,
    tslaDecimals,
    usdgSymbol,
    usdgDecimals,
    vaultAsset,
    vaultName,
    vaultTotalAssets,
    deployerVaultShares,
    vaultTslaBalance,
    routerTslaBalance,
    slashCollateral,
    slashRegistry,
    slashRecorder,
    deployerUsdg,
    slashPoolUsdg,
    agentId,
    agentStake,
    agentUsdg,
  ] = await Promise.all([
    publicClient.getChainId(),
    publicClient.getBlockNumber(),
    publicClient.getBalance({ address: deployment.deployer }),
    publicClient.readContract({ address: deployment.tsla, abi: erc20Artifact.abi, functionName: "name" }),
    publicClient.readContract({ address: deployment.tsla, abi: erc20Artifact.abi, functionName: "symbol" }),
    publicClient.readContract({ address: deployment.tsla, abi: erc20Artifact.abi, functionName: "decimals" }),
    publicClient.readContract({ address: deployment.usdg, abi: erc20Artifact.abi, functionName: "symbol" }),
    publicClient.readContract({ address: deployment.usdg, abi: erc20Artifact.abi, functionName: "decimals" }),
    publicClient.readContract({ address: deployment.vault, abi: vaultArtifact.abi, functionName: "asset" }),
    publicClient.readContract({ address: deployment.vault, abi: vaultArtifact.abi, functionName: "name" }),
    publicClient.readContract({ address: deployment.vault, abi: vaultArtifact.abi, functionName: "totalAssets" }),
    publicClient.readContract({
      address: deployment.vault,
      abi: vaultArtifact.abi,
      functionName: "balanceOf",
      args: [deployment.deployer],
    }),
    publicClient.readContract({
      address: deployment.tsla,
      abi: erc20Artifact.abi,
      functionName: "balanceOf",
      args: [deployment.vault],
    }),
    publicClient.readContract({
      address: deployment.tsla,
      abi: erc20Artifact.abi,
      functionName: "balanceOf",
      args: [deployment.mockRouter],
    }),
    publicClient.readContract({ address: deployment.slashPool, abi: slashPoolArtifact.abi, functionName: "collateral" }),
    publicClient.readContract({
      address: deployment.slashPool,
      abi: slashPoolArtifact.abi,
      functionName: "identityRegistry",
    }),
    publicClient.readContract({
      address: deployment.identityRegistry,
      abi: identityArtifact.abi,
      functionName: "slashRecorder",
    }),
    publicClient.readContract({
      address: deployment.usdg,
      abi: erc20Artifact.abi,
      functionName: "balanceOf",
      args: [deployment.deployer],
    }),
    publicClient.readContract({
      address: deployment.usdg,
      abi: erc20Artifact.abi,
      functionName: "balanceOf",
      args: [deployment.slashPool],
    }),
    publicClient.readContract({
      address: deployment.identityRegistry,
      abi: identityArtifact.abi,
      functionName: "agentIdOfWallet",
      args: [watchedAgent],
    }),
    publicClient.readContract({
      address: deployment.slashPool,
      abi: slashPoolArtifact.abi,
      functionName: "stakeOf",
      args: [watchedAgent],
    }),
    publicClient.readContract({
      address: deployment.usdg,
      abi: erc20Artifact.abi,
      functionName: "balanceOf",
      args: [watchedAgent],
    }),
  ]);

  const tslaUnit = Number(tslaDecimals);
  const usdgUnit = Number(usdgDecimals);
  const liveSlashAmount = parseUnits(process.env.WARDEN_LIVE_SLASH_AMOUNT ?? "100", usdgUnit);
  const agentViolationCount =
    (agentId as bigint) === 0n
      ? 0n
      : ((await publicClient.readContract({
          address: deployment.identityRegistry,
          abi: identityArtifact.abi,
          functionName: "violationCount",
          args: [agentId],
        })) as bigint);

  console.log("WARDEN Robinhood deployment status");
  console.log(`RPC: ${rpcUrl}`);
  console.log(`Chain ID: ${chainId}`);
  console.log(`Block: ${blockNumber}`);
  console.log(`Deployer: ${deployment.deployer}`);
  console.log(`Deployer ETH: ${formatEther(deployerEth)}`);
  console.log("");
  console.log(`Vault: ${deployment.vault}`);
  console.log(`Vault name: ${vaultName}`);
  console.log(`Vault asset: ${vaultAsset}`);
  console.log(`TSLA token: ${tslaName} (${tslaSymbol}), decimals ${tslaDecimals}`);
  console.log(`Vault totalAssets: ${formatUnits(vaultTotalAssets as bigint, tslaUnit)} ${tslaSymbol}`);
  console.log(`Deployer vault shares: ${formatUnits(deployerVaultShares as bigint, tslaUnit)} wTSLA`);
  console.log(`Vault TSLA balance: ${formatUnits(vaultTslaBalance as bigint, tslaUnit)} ${tslaSymbol}`);
  console.log(`Router TSLA balance: ${formatUnits(routerTslaBalance as bigint, tslaUnit)} ${tslaSymbol}`);
  console.log("");
  console.log(`SlashPool: ${deployment.slashPool}`);
  console.log(`Slash collateral: ${slashCollateral}`);
  console.log(`USDG token: ${usdgSymbol}, decimals ${usdgDecimals}`);
  console.log(`Slash identity registry: ${slashRegistry}`);
  console.log(`Registry slash recorder: ${slashRecorder}`);
  console.log(`Deployer USDG balance: ${formatUnits(deployerUsdg as bigint, usdgUnit)} ${usdgSymbol}`);
  console.log(`SlashPool USDG balance: ${formatUnits(slashPoolUsdg as bigint, usdgUnit)} ${usdgSymbol}`);
  console.log("");
  console.log(`Watched agent: ${watchedAgent}`);
  console.log(`Agent identity id: ${agentId}`);
  console.log(`Agent violation count: ${agentViolationCount}`);
  console.log(`Agent USDG wallet balance: ${formatUnits(agentUsdg as bigint, usdgUnit)} ${usdgSymbol}`);
  console.log(`Agent SlashPool stake: ${formatUnits(agentStake as bigint, usdgUnit)} ${usdgSymbol}`);
  console.log(`Configured live slash amount: ${formatUnits(liveSlashAmount, usdgUnit)} ${usdgSymbol}`);

  const checks = [
    ["chain id is Robinhood testnet", chainId === robinhood.id],
    ["vault wraps official TSLA", String(vaultAsset).toLowerCase() === deployment.tsla.toLowerCase()],
    ["vault has TSLA deposited", (vaultTotalAssets as bigint) > 0n],
    ["slash pool uses official USDG", String(slashCollateral).toLowerCase() === deployment.usdg.toLowerCase()],
    ["registry points to slash pool", String(slashRecorder).toLowerCase() === deployment.slashPool.toLowerCase()],
    [
      "watched agent has or can fund one live slash",
      (agentStake as bigint) >= liveSlashAmount || (agentUsdg as bigint) + (agentStake as bigint) >= liveSlashAmount,
    ],
  ] as const;

  console.log("");
  console.log("Checks:");
  for (const [label, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
  }

  if ((agentStake as bigint) < liveSlashAmount && (agentUsdg as bigint) + (agentStake as bigint) < liveSlashAmount) {
    const needed = liveSlashAmount - ((agentUsdg as bigint) + (agentStake as bigint));
    console.log(
      `OPEN live USDG collateral is short by ${formatUnits(
        needed,
        usdgUnit,
      )} ${usdgSymbol}; fund the watched agent or lower WARDEN_LIVE_SLASH_AMOUNT.`,
    );
  }

  if ((agentId as bigint) === 0n) {
    console.log("OPEN watched agent identity is not registered yet; live slash mode will register it before staking.");
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
