import { keccak256, encodeAbiParameters, parseAbiParameters, type Address, type Hex } from "viem";

export type ViolationReason =
  | "UnauthorizedAgent"
  | "PolicyExpired"
  | "AssetNotAllowed"
  | "TradeValueTooHigh"
  | "TradingWindowClosed";

export type ViolationProof = {
  vault: Address;
  owner: Address;
  agent: Address;
  beneficiary: Address;
  slashAmount: bigint;
  reason: ViolationReason;
  blockNumber: bigint;
  simulationHash: Hex;
  proofHash: Hex;
};

export type X402Quote = {
  status: 402;
  resource: string;
  accepts: Array<{
    scheme: "exact";
    network: string;
    asset: Address;
    amount: string;
    payTo: Address;
    resource: string;
  }>;
};

export type X402PaymentPayload = {
  x402Version: 1;
  scheme: "exact";
  network: string;
  payload: {
    asset: Address;
    amount: string;
    payTo: Address;
    resource: string;
    txHash: Hex;
  };
};

export function createViolationProof(input: Omit<ViolationProof, "proofHash">): ViolationProof {
  const proofHash = keccak256(
    encodeAbiParameters(parseAbiParameters("address,address,address,address,uint256,string,uint256,bytes32"), [
      input.vault,
      input.owner,
      input.agent,
      input.beneficiary,
      input.slashAmount,
      input.reason,
      input.blockNumber,
      input.simulationHash,
    ]),
  );

  return { ...input, proofHash };
}

export function encodeSlashSubmission(proof: ViolationProof): {
  operator: Address;
  beneficiary: Address;
  amount: bigint;
  proofHash: Hex;
} {
  return {
    operator: proof.agent,
    beneficiary: proof.beneficiary,
    amount: proof.slashAmount,
    proofHash: proof.proofHash,
  };
}

export function verifyProof(proof: ViolationProof): boolean {
  return createViolationProof(proof).proofHash === proof.proofHash;
}

export function quoteMonitorReward(resource: string, usdc: Address, payTo: Address): X402Quote {
  return {
    status: 402,
    resource,
    accepts: [
      {
        scheme: "exact",
        network: "eip155:42161",
        asset: usdc,
        amount: "1000000",
        payTo,
        resource,
      },
    ],
  };
}

export function encodeX402Payment(payment: X402PaymentPayload): string {
  return Buffer.from(JSON.stringify(payment), "utf8").toString("base64url");
}

export function decodeX402Payment(header: string): X402PaymentPayload {
  const trimmed = header.trim();
  const json = trimmed.startsWith("{") ? trimmed : Buffer.from(trimmed, "base64url").toString("utf8");
  const parsed = JSON.parse(json) as Partial<X402PaymentPayload>;

  if (parsed.x402Version !== 1) throw new Error("unsupported x402Version");
  if (parsed.scheme !== "exact") throw new Error("unsupported x402 scheme");
  if (typeof parsed.network !== "string") throw new Error("missing x402 network");
  if (!parsed.payload || typeof parsed.payload !== "object") throw new Error("missing x402 payload");

  const payload = parsed.payload as Partial<X402PaymentPayload["payload"]>;
  if (typeof payload.amount !== "string" || !payload.amount.match(/^\d+$/)) throw new Error("invalid x402 amount");
  if (typeof payload.resource !== "string" || payload.resource.length === 0) throw new Error("invalid x402 resource");
  if (typeof payload.asset !== "string" || !payload.asset.match(/^0x[0-9a-fA-F]{40}$/)) {
    throw new Error("invalid x402 asset");
  }
  if (typeof payload.payTo !== "string" || !payload.payTo.match(/^0x[0-9a-fA-F]{40}$/)) {
    throw new Error("invalid x402 payTo");
  }
  if (typeof payload.txHash !== "string" || !payload.txHash.match(/^0x[0-9a-fA-F]{64}$/)) {
    throw new Error("invalid x402 txHash");
  }

  return {
    x402Version: 1,
    scheme: "exact",
    network: parsed.network,
    payload: {
      asset: payload.asset as Address,
      amount: payload.amount,
      payTo: payload.payTo as Address,
      resource: payload.resource,
      txHash: payload.txHash as Hex,
    },
  };
}

export function verifyX402Payment(header: string, quote: X402Quote): X402PaymentPayload {
  const payment = decodeX402Payment(header);
  const acceptable = quote.accepts.some(
    (accept) =>
      accept.scheme === payment.scheme &&
      accept.network === payment.network &&
      accept.asset.toLowerCase() === payment.payload.asset.toLowerCase() &&
      accept.amount === payment.payload.amount &&
      accept.payTo.toLowerCase() === payment.payload.payTo.toLowerCase() &&
      accept.resource === payment.payload.resource,
  );

  if (!acceptable) throw new Error("x402 payment does not satisfy quote");
  return payment;
}
