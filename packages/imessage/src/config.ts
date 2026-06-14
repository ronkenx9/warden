import { defineChain, type Address } from "viem";

// Live WARDEN deployment on Robinhood Chain testnet (Arbitrum Orbit).
// Mirrors packages/agent/src/live-robinhood.ts so the iMessage front door
// signs against the exact same contracts the rest of the protocol uses.
export const robinhood = defineChain({
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

export const deployment = {
  amd: "0x71178BAc73cBeb415514eB542a8995b82669778d",
  tsla: "0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E",
  amzn: "0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02",
  pltr: "0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0",
  nflx: "0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93",
  usdg: "0x7E955252E15c84f5768B83c41a71F9eba181802F",
  permissionEngine: "0x049527f5331FaeA8f0e9E86be8FDdCB86BdeE1ba",
  vault: "0x02e658d8F20bbF94d85D0eCC0365Ab4aa5c26Daf", // TSLA vault (default)
  identityRegistry: "0x4D566c927d0B4d40AcC880b9729d8c5D905867D1",
  slashPool: "0x6745b7CE66756085cF1254d2028EB9e3b4407bbE",
  mockRouter: "0x55081762b22FDD6f3FACa9c1c153397352a9cf63",
} as const satisfies Record<string, Address>;

// One ERC-4626 vault per asset. Verified on-chain (verify-vaults.ts): each
// vault's asset() matches the token below and every vault shares the single
// PermissionEngine above — so one EIP-712 signing domain is valid for all.
export const ASSET_VAULTS = {
  tsla: "0x02e658d8F20bbF94d85D0eCC0365Ab4aa5c26Daf",
  amd: "0x7f8E3269f6c2DE4394d46c3dacBF12DA21dd2092",
  amzn: "0x212f89c78f6E98AB82B76b9b9f3652b48a16526e",
  pltr: "0xb7cbF30123382E7d29E127e974b53868a16Aa20d",
  nflx: "0xAA976c519485465f299853019AA780AbD47F77F9",
} as const satisfies Record<string, Address>;

// EIP-712 domain + Policy type — must match PermissionEngine.sol exactly.
export const POLICY_DOMAIN = {
  name: "WARDEN Permission Engine",
  version: "1",
  chainId: robinhood.id,
  verifyingContract: deployment.permissionEngine,
} as const;

export const POLICY_TYPES = {
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
} as const;

// Official Robinhood Chain testnet stock tokens the parser can resolve. Each
// maps to its token CA + the dedicated ERC-4626 vault that custodies it. A
// policy must be activated on the asset's own vault — never a shared one.
export type AssetInfo = { address: Address; vault: Address; live: boolean };
export const KNOWN_ASSETS: Record<string, AssetInfo> = {
  AMD: { address: deployment.amd, vault: ASSET_VAULTS.amd, live: true },
  RAMD: { address: deployment.amd, vault: ASSET_VAULTS.amd, live: true },
  TSLA: { address: deployment.tsla, vault: ASSET_VAULTS.tsla, live: true },
  RTSLA: { address: deployment.tsla, vault: ASSET_VAULTS.tsla, live: true },
  AMZN: { address: deployment.amzn, vault: ASSET_VAULTS.amzn, live: true },
  RAMZN: { address: deployment.amzn, vault: ASSET_VAULTS.amzn, live: true },
  PLTR: { address: deployment.pltr, vault: ASSET_VAULTS.pltr, live: true },
  RPLTR: { address: deployment.pltr, vault: ASSET_VAULTS.pltr, live: true },
  NFLX: { address: deployment.nflx, vault: ASSET_VAULTS.nflx, live: true },
  RNFLX: { address: deployment.nflx, vault: ASSET_VAULTS.nflx, live: true },
};
