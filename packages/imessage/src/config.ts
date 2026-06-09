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
  tsla: "0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E",
  usdg: "0x7E955252E15c84f5768B83c41a71F9eba181802F",
  permissionEngine: "0xd63eFdD5F4774f48F678bD9d12A3cE85c758C428",
  vault: "0x5e8b55278FC2c1d0Ddb29A8973Bbba9f5CD55c98",
  identityRegistry: "0x68c451578B0E70e19A9369146061b5c311387cD3",
  slashPool: "0xE9F0F8BE0B079d5A910e651aF62A1a3756057Dc8",
  mockRouter: "0x1E1e8528760B310d0b23b32ee9B5a0025a280FF7",
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

// Tradeable tokenized RWAs the parser can resolve by symbol.
// Only TSLA is wired to a live mock asset on the current deployment; others
// are accepted by the parser but flagged as unsupported until deployed.
export const KNOWN_ASSETS: Record<string, { address: Address; live: boolean }> = {
  TSLA: { address: deployment.tsla, live: true },
  RTSLA: { address: deployment.tsla, live: true },
};
