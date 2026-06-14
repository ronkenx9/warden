import {
  createPublicClient,
  createWalletClient,
  http,
  type Account,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  POLICY_DOMAIN,
  POLICY_TYPES,
  deployment,
  robinhood,
} from "./config.js";
import type { DraftPolicy } from "./parse.js";

// Minimal ABIs — only the entrypoints the onboarding flow touches.
const VAULT_ABI = [
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
] as const;

const REGISTRY_ABI = [
  {
    type: "function",
    name: "register",
    stateMutability: "nonpayable",
    inputs: [{ name: "agentURI", type: "string" }],
    outputs: [{ name: "agentId", type: "uint256" }],
  },
] as const;

export type OnChainPolicy = {
  owner: Address;
  agent: Address;
  allowedAsset: Address;
  maxTradeValueEur: bigint;
  forbiddenStartMinute: number;
  forbiddenEndMinute: number;
  validUntil: bigint;
  nonce: bigint;
};

/** Lift a parsed DraftPolicy into the exact tuple PermissionEngine signs over. */
export function buildOnChainPolicy(
  draft: DraftPolicy,
  owner: Address,
  agent: Address,
  nowSeconds: bigint,
): OnChainPolicy {
  return {
    owner,
    agent,
    allowedAsset: draft.allowedAsset,
    maxTradeValueEur: draft.maxTradeValueEur,
    forbiddenStartMinute: draft.forbiddenStartMinute,
    forbiddenEndMinute: draft.forbiddenEndMinute,
    validUntil: nowSeconds + BigInt(draft.validForDays) * 86_400n,
    // nonce is unique-per-owner; ms timestamp is monotonic enough for the demo.
    nonce: BigInt(Date.now()),
  };
}

/**
 * Produces the owner's EIP-712 signature over the policy. This is the moment
 * the user "signs the leash" — in production the owner key lives in their own
 * Circle/EOA wallet (as in PING); for the live demo it's a local key.
 */
export async function signPolicy(
  owner: Account,
  policy: OnChainPolicy,
): Promise<Hex> {
  return owner.signTypedData!({
    domain: POLICY_DOMAIN,
    types: POLICY_TYPES,
    primaryType: "Policy",
    message: policy,
  });
}

export type ActivationResult = {
  activationTx: Hex;
  agentId: bigint | null;
  registrationTx: Hex | null;
  explorer: string;
};

/**
 * On-chain commit: owner activates the signed policy on the vault, then the
 * agent registers its ERC-8004 identity. Both go to the live Robinhood Chain
 * deployment. Returns tx hashes + explorer base for the iMessage receipt.
 */
export async function activateOnChain(
  ownerWallet: WalletClient,
  agentWallet: WalletClient,
  policy: OnChainPolicy,
  signature: Hex,
  publicClient: PublicClient,
  vault: Address,
): Promise<ActivationResult> {
  const activationTx = await ownerWallet.writeContract({
    account: ownerWallet.account!,
    chain: robinhood,
    address: vault,
    abi: VAULT_ABI,
    functionName: "activatePolicy",
    args: [policy, signature],
  });
  await publicClient.waitForTransactionReceipt({ hash: activationTx });

  // Register the agent's portable identity so violations can later be recorded
  // against it (AgentIdentityRegistry.recordViolation -> on-chain reputation).
  let registrationTx: Hex | null = null;
  let agentId: bigint | null = null;
  try {
    const uri = `warden:imessage:${policy.owner}:${policy.agent}`;
    registrationTx = await agentWallet.writeContract({
      account: agentWallet.account!,
      chain: robinhood,
      address: deployment.identityRegistry,
      abi: REGISTRY_ABI,
      functionName: "register",
      args: [uri],
    });
    await publicClient.waitForTransactionReceipt({ hash: registrationTx });
  } catch {
    // Agent may already be registered from a prior session — non-fatal.
    registrationTx = null;
  }

  return {
    activationTx,
    agentId,
    registrationTx,
    explorer: robinhood.blockExplorers.default.url,
  };
}

export function makeClients(ownerKey: Hex, agentKey: Hex) {
  const owner: Account = privateKeyToAccount(ownerKey);
  const agent: Account = privateKeyToAccount(agentKey);
  const transport = http(robinhood.rpcUrls.default.http[0]);
  const publicClient = createPublicClient({ chain: robinhood, transport });
  const ownerWallet = createWalletClient({ account: owner, chain: robinhood, transport });
  const agentWallet = createWalletClient({ account: agent, chain: robinhood, transport });
  return { owner, agent, publicClient, ownerWallet, agentWallet };
}
