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
  vault: "0x02e658d8F20bbF94d85D0eCC0365Ab4aa5c26Daf",
  identityRegistry: "0x4D566c927d0B4d40AcC880b9729d8c5D905867D1",
  slashPool: "0x6745b7CE66756085cF1254d2028EB9e3b4407bbE",
  mockRouter: "0x55081762b22FDD6f3FACa9c1c153397352a9cf63",
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

// Official Robinhood Chain testnet stock tokens the parser can resolve.
// ERC-4626 stays one-asset-per-vault; TSLA is the live funded vault today,
// and the other official CAs can be wrapped by deploying additional vaults.
export const KNOWN_ASSETS: Record<string, { address: Address; live: boolean }> = {
  AMD: { address: deployment.amd, live: true },
  RAMD: { address: deployment.amd, live: true },
  TSLA: { address: deployment.tsla, live: true },
  RTSLA: { address: deployment.tsla, live: true },
  AMZN: { address: deployment.amzn, live: true },
  RAMZN: { address: deployment.amzn, live: true },
  PLTR: { address: deployment.pltr, live: true },
  RPLTR: { address: deployment.pltr, live: true },
  NFLX: { address: deployment.nflx, live: true },
  RNFLX: { address: deployment.nflx, live: true },
};
