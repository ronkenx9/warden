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
  }>;
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
      },
    ],
  };
}
