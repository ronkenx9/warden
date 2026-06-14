import { defineChain, parseEther, type Address } from "viem";

// Live WARDEN deployment on Robinhood Chain testnet — same contracts the
// protocol and packages/imessage use.
export const robinhood = defineChain({
  id: 46_630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.chain.robinhood.com"] } },
  blockExplorers: { default: { name: "Robinhood Explorer", url: "https://explorer.testnet.chain.robinhood.com" } },
  testnet: true,
});

export const deployment = {
  permissionEngine: "0x049527f5331FaeA8f0e9E86be8FDdCB86BdeE1ba",
  mockRouter: "0x55081762b22FDD6f3FACa9c1c153397352a9cf63",
  usdg: "0x7E955252E15c84f5768B83c41a71F9eba181802F",
} as const satisfies Record<string, Address>;

export type AssetInfo = { token: Address; vault: Address };
export const KNOWN_ASSETS: Record<string, AssetInfo> = {
  TSLA: { token: "0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E", vault: "0x02e658d8F20bbF94d85D0eCC0365Ab4aa5c26Daf" },
  AMD: { token: "0x71178BAc73cBeb415514eB542a8995b82669778d", vault: "0x7f8E3269f6c2DE4394d46c3dacBF12DA21dd2092" },
  AMZN: { token: "0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02", vault: "0x212f89c78f6E98AB82B76b9b9f3652b48a16526e" },
  PLTR: { token: "0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0", vault: "0xb7cbF30123382E7d29E127e974b53868a16Aa20d" },
  NFLX: { token: "0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93", vault: "0xAA976c519485465f299853019AA780AbD47F77F9" },
};

// EIP-712 — must match PermissionEngine.sol.
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

export const VAULT_ABI = [
  {
    type: "function",
    name: "activatePolicy",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "policy",
        type: "tuple",
        components: [
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
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "execute",
    stateMutability: "nonpayable",
    inputs: [
      { name: "owner", type: "address" },
      {
        name: "request",
        type: "tuple",
        components: [
          { name: "asset", type: "address" },
          { name: "valueEur", type: "uint256" },
          { name: "amountIn", type: "uint256" },
          { name: "minAmountOut", type: "uint256" },
          { name: "target", type: "address" },
          { name: "data", type: "bytes" },
        ],
      },
    ],
    outputs: [{ name: "result", type: "bytes" }],
  },
] as const;

export const ROUTER_ABI = [
  {
    type: "function",
    name: "executeTrade",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenIn", type: "address" },
      { name: "amountIn", type: "uint256" },
      { name: "minOut", type: "uint256" },
      { name: "tokenOut", type: "address" },
      { name: "recipient", type: "address" },
    ],
    outputs: [],
  },
] as const;

// Known public faucets. Robinhood Chain bridges value in from Arbitrum
// Sepolia / Ethereum Sepolia, so these ecosystem faucets are the way to get
// gas. Confirm the Robinhood Chain entry against their current docs.
export const FAUCETS: { name: string; note: string; url: string }[] = [
  { name: "Robinhood Chain faucet", note: "Native testnet gas — start here", url: "https://faucet.testnet.chain.robinhood.com/" },
  { name: "Alchemy — Arbitrum Sepolia", note: "Free ETH, no strings", url: "https://www.alchemy.com/faucets/arbitrum-sepolia" },
  { name: "QuickNode — Arbitrum Sepolia", note: "Drip Sepolia ETH", url: "https://faucet.quicknode.com/arbitrum/sepolia" },
  { name: "Chainlink faucets", note: "Multi-network testnet ETH", url: "https://faucets.chain.link/arbitrum-sepolia" },
];

// ---- Deterministic NL → policy parser (browser port of packages/imessage) ----
export type DraftPolicy = {
  assetSymbol: string;
  maxEurLabel: string;
  forbiddenStartMinute: number;
  forbiddenEndMinute: number;
  forbiddenLabel: string | null;
  validForDays: number;
};

function clockToMinute(raw: string): number | null {
  const m = raw.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (h > 23 || min > 59) return null;
  if (m[3] === "pm" && h < 12) h += 12;
  if (m[3] === "am" && h === 12) h = 0;
  return (h * 60 + min) % 1440;
}
function fmt(mins: number): string {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

export function parsePolicy(text: string): DraftPolicy {
  const lower = text.toLowerCase();
  const sym = Object.keys(KNOWN_ASSETS).find((s) => new RegExp(`\\b${s.toLowerCase()}\\b`).test(lower)) ?? "TSLA";

  const v =
    lower.match(/(?:max|up to|limit(?:\s+of)?|cap(?:\s+at)?)\s*€?\s*(\d+(?:\.\d+)?)/) ??
    lower.match(/€\s*(\d+(?:\.\d+)?)/) ??
    lower.match(/(\d+(?:\.\d+)?)\s*(?:eur|euros?)\b/);
  const maxEurLabel = v ? v[1] : "50";

  let start = 0, end = 0, label: string | null = null;
  const w = lower.match(
    /(?:no trad\w*|don'?t trade|not? between|avoid)\D{0,20}?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:and|to|-|until|till|–)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/,
  );
  if (w) {
    const s = clockToMinute(w[1]);
    const e = clockToMinute(w[2]);
    if (s !== null && e !== null) { start = s; end = e; label = `${fmt(s)}–${fmt(e)} CET`; }
  }

  const d = lower.match(/(\d+)\s*days?\b/);
  const wk = lower.match(/(\d+)\s*weeks?\b/);
  const validForDays = d ? Number(d[1]) : wk ? Number(wk[1]) * 7 : 7;

  return { assetSymbol: sym, maxEurLabel, forbiddenStartMinute: start, forbiddenEndMinute: end, forbiddenLabel: label, validForDays };
}

export function maxEurWei(d: DraftPolicy): bigint {
  return parseEther(d.maxEurLabel);
}
