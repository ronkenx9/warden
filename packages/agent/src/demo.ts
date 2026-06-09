import { encodeFunctionData, parseEther } from "viem";

const sarah = "0xe05fcC23807536bEe418f142D19fa0d21BB0cfF7" as const;
const yieldAgent = "0x3507A251bbd388eb31C630627E2DdFE10Eb5aD6F" as const;
const tsla = "0x1111111111111111111111111111111111111001" as const;
const usdc = "0x1111111111111111111111111111111111111002" as const;
const mockRouter = "0x1111111111111111111111111111111111112001" as const;

const routerAbi = [
  {
    type: "function",
    name: "executeTrade",
    stateMutability: "nonpayable",
    inputs: [
      { name: "assetIn", type: "address" },
      { name: "amountIn", type: "uint256" },
      { name: "minAmountOut", type: "uint256" },
      { name: "assetOut", type: "address" },
      { name: "beneficiary", type: "address" },
    ],
    outputs: [],
  },
] as const;

const vaultAbi = [
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

const policy = {
  owner: sarah,
  agent: yieldAgent,
  allowedAsset: tsla,
  maxTradeValueEur: parseEther("50"),
  forbiddenStartMinute: 22 * 60,
  forbiddenEndMinute: 6 * 60,
  validUntil: 1_800_000_000n,
  nonce: 1n,
};

const routerCall = encodeFunctionData({
  abi: routerAbi,
  functionName: "executeTrade",
  args: [tsla, parseEther("10"), 0n, usdc, sarah],
});

const executeCall = encodeFunctionData({
  abi: vaultAbi,
  functionName: "execute",
  args: [
    sarah,
    {
      asset: tsla,
      valueEur: parseEther("25"),
      amountIn: parseEther("10"),
      minAmountOut: 0n,
      target: mockRouter,
      data: routerCall,
    },
  ],
});

console.log("WARDEN demo: Sarah delegates bounded TSLA authority to YieldAgent.");
console.log(`Sarah: ${sarah}`);
console.log(`YieldAgent: ${yieldAgent}`);
console.log("Policy:");
console.log({
  ...policy,
  maxTradeValueEur: policy.maxTradeValueEur.toString(),
  validUntil: policy.validUntil.toString(),
  nonce: policy.nonce.toString(),
});
console.log("Allowed path: YieldAgent calls WARDENVault.execute during permitted CET hours.");
console.log(`Encoded execute calldata: ${executeCall}`);
console.log("Blocked path: the same call at 01:30 CET reverts with TradingWindowClosed().");
console.log("Authoritative executable proof: pnpm test");
