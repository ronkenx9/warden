import { readFile } from "node:fs/promises";
import {
  createPublicClient,
  defineChain,
  formatEther,
  formatUnits,
  getAddress,
  http,
  parseUnits,
  type Abi,
  type Address,
} from "viem";

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

const defaultDeployment = {
  deployer: "0x6727A665ef9257E2A4e9A4ED58B9136f62b0E1b1",
  amd: "0x71178BAc73cBeb415514eB542a8995b82669778d",
  tsla: "0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E",
  amzn: "0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02",
  pltr: "0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0",
  nflx: "0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93",
  usdg: "0x7E955252E15c84f5768B83c41a71F9eba181802F",
  permissionEngine: "0x049527f5331FaeA8f0e9E86be8FDdCB86BdeE1ba",
  vault: "0x02e658d8F20bbF94d85D0eCC0365Ab4aa5c26Daf",
  identityRegistry: "0x4D566c927d0B4d40AcC880b9729d8c5D905867D1",
  slashPool: "0x6745b7CE66756085cF1254d2028EB9e3b4407bbE",
  mockRouter: "0x55081762b22FDD6f3FACa9c1c153397352a9cf63",
} as const satisfies Record<string, Address>;

const robinhoodStocks = [
  ["AMD", defaultDeployment.amd],
  ["TSLA", defaultDeployment.tsla],
  ["AMZN", defaultDeployment.amzn],
  ["PLTR", defaultDeployment.pltr],
  ["NFLX", defaultDeployment.nflx],
] as const;

const officialVaults = [
  ["AMD", defaultDeployment.amd, "0x7f8E3269f6c2DE4394d46c3dacBF12DA21dd2092"],
  ["TSLA", defaultDeployment.tsla, defaultDeployment.vault],
  ["AMZN", defaultDeployment.amzn, "0x212f89c78f6E98AB82B76b9b9f3652b48a16526e"],
  ["PLTR", defaultDeployment.pltr, "0xb7cbF30123382E7d29E127e974b53868a16Aa20d"],
  ["NFLX", defaultDeployment.nflx, "0xAA976c519485465f299853019AA780AbD47F77F9"],
] as const satisfies readonly (readonly [string, Address, Address])[];

type Deployment = Record<keyof typeof defaultDeployment, Address>;

function addressEnv(name: string, fallback: Address): Address {
  const value = process.env[name];
  return value && value.length > 0 ? getAddress(value) : fallback;
}

function loadDeploymentFromEnv(): Deployment {
  return {
    deployer: addressEnv("WARDEN_EXPECTED_DEPLOYER_ADDRESS", defaultDeployment.deployer),
    amd: defaultDeployment.amd,
    tsla: addressEnv("WARDEN_ASSET", defaultDeployment.tsla),
    amzn: defaultDeployment.amzn,
    pltr: defaultDeployment.pltr,
    nflx: defaultDeployment.nflx,
    usdg: addressEnv("WARDEN_COLLATERAL", defaultDeployment.usdg),
    permissionEngine: addressEnv("WARDEN_PERMISSION_ENGINE", defaultDeployment.permissionEngine),
    vault: addressEnv("WARDEN_VAULT", defaultDeployment.vault),
    identityRegistry: addressEnv("WARDEN_IDENTITY_REGISTRY", defaultDeployment.identityRegistry),
    slashPool: addressEnv("WARDEN_SLASH_POOL", defaultDeployment.slashPool),
    mockRouter: addressEnv("WARDEN_MOCK_ROUTER", defaultDeployment.mockRouter),
  };
}

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
  const deployment = loadDeploymentFromEnv();
  const watchedAgent = (process.env.WARDEN_AGENT_ADDRESS ?? deployment.deployer) as Address;
  const publicClient = createPublicClient({ chain: robinhood, transport: http(rpcUrl) });
  const vaultArtifact = await artifact("WARDENVault.sol/WARDENVault.json");
  const slashPoolArtifact = await artifact("SlashPool.sol/SlashPool.json");
  const identityArtifact = await artifact("AgentIdentityRegistry.sol/AgentIdentityRegistry.json");
  const erc20Artifact = await artifact("MockERC20.sol/MockERC20.json");
  const stockBalances = await Promise.all(
    robinhoodStocks.map(async ([symbol, address]) => ({
      symbol,
      address,
      balance: (await publicClient.readContract({
        address,
        abi: erc20Artifact.abi,
        functionName: "balanceOf",
        args: [deployment.deployer],
      })) as bigint,
      decimals: Number(
        await publicClient.readContract({
          address,
          abi: erc20Artifact.abi,
          functionName: "decimals",
        }),
      ),
    })),
  );
  const vaultBalances = await Promise.all(
    officialVaults.map(async ([symbol, expectedAsset, vault]) => ({
      symbol,
      expectedAsset,
      vault,
      asset: (await publicClient.readContract({
        address: vault,
        abi: vaultArtifact.abi,
        functionName: "asset",
      })) as Address,
      totalAssets: (await publicClient.readContract({
        address: vault,
        abi: vaultArtifact.abi,
        functionName: "totalAssets",
      })) as bigint,
      shares: (await publicClient.readContract({
        address: vault,
        abi: vaultArtifact.abi,
        functionName: "balanceOf",
        args: [deployment.deployer],
      })) as bigint,
      owner: (await publicClient.readContract({
        address: vault,
        abi: vaultArtifact.abi,
        functionName: "owner",
      })) as Address,
      paused: (await publicClient.readContract({
        address: vault,
        abi: vaultArtifact.abi,
        functionName: "paused",
      })) as boolean,
    })),
  );

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
  console.log("Official stock token balances:");
  for (const stock of stockBalances) {
    console.log(`- ${stock.symbol}: ${formatUnits(stock.balance, stock.decimals)} @ ${stock.address}`);
  }
  console.log("Official WARDEN vaults:");
  for (const vault of vaultBalances) {
    console.log(
      `- ${vault.symbol}: ${formatUnits(vault.totalAssets, 18)} deposited, ${formatUnits(
        vault.shares,
        18,
      )} shares, paused=${vault.paused}, owner=${vault.owner} @ ${vault.vault}`,
    );
  }
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
    [
      "all official stock vaults wrap expected assets",
      vaultBalances.every((vault) => vault.asset.toLowerCase() === vault.expectedAsset.toLowerCase()),
    ],
    ["all official stock vaults hold deposits", vaultBalances.every((vault) => vault.totalAssets > 0n)],
    [
      "all official stock vaults are unpaused",
      vaultBalances.every((vault) => vault.paused === false),
    ],
    [
      "all official stock vaults are owned by expected deployer",
      vaultBalances.every((vault) => vault.owner.toLowerCase() === deployment.deployer.toLowerCase()),
    ],
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
