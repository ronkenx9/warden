import { privateKeyToAccount } from "viem/accounts";
import { POLICY_DOMAIN, POLICY_TYPES } from "./config.js";
import { buildOnChainPolicy, signPolicy } from "./policy.js";
import { newSession, reduce, type Session } from "./session.js";

// Offline end-to-end demo. Drives a scripted iMessage conversation through the
// real reducer, and when the user confirms, signs a REAL EIP-712 policy with a
// throwaway key and recovers it locally to prove the signature is valid against
// the deployed PermissionEngine domain. No RPC, no funds, no creds required —
// so `pnpm --filter @warden/imessage demo` is a deterministic, reviewable proof
// of the whole front-door path. Swap in spectrum-live.ts for the on-chain run.

const OWNER_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as const;
const AGENT_KEY = "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba" as const;

const owner = privateKeyToAccount(OWNER_KEY);
const agent = privateKeyToAccount(AGENT_KEY);

const script = [
  "hey",
  "TSLA only, max €50 per trade, no trades between 22:00 and 06:00, valid for 7 days",
  "actually make it €30 per trade",
  "yes",
];

function line(from: "user" | "warden", text: string) {
  const tag = from === "user" ? "📱 user " : "🛡️ warden";
  console.log(`${tag} │ ${text.replace(/\n/g, "\n         │ ")}`);
}

async function main() {
  console.log("WARDEN × iMessage — offline onboarding demo\n");
  let session: Session = newSession("+15550100");

  for (const msg of script) {
    line("user", msg);
    const { session: next, reply } = reduce(session, msg);
    session = next;
    line("warden", reply.text);

    if (reply.commit && session.draft) {
      const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
      const policy = buildOnChainPolicy(session.draft, owner.address, agent.address, nowSeconds);
      const signature = await signPolicy(owner, policy);

      // Recover locally to prove the signature is valid for PermissionEngine.
      const { recoverTypedDataAddress } = await import("viem");
      const recovered = await recoverTypedDataAddress({
        domain: POLICY_DOMAIN,
        types: POLICY_TYPES,
        primaryType: "Policy",
        message: policy,
        signature,
      });

      const ok = recovered.toLowerCase() === owner.address.toLowerCase();
      session = { ...session, stage: "done" };
      line(
        "warden",
        ok
          ? `✅ Policy signed by owner ${short(owner.address)} and verified against PermissionEngine.\n` +
              `   Agent ${short(agent.address)} is leashed.\n` +
              `   sig ${signature.slice(0, 18)}…  nonce ${policy.nonce}\n` +
              `   (live run would now send activatePolicy + register to Robinhood Chain)`
          : "❌ signature failed local verification",
      );
      if (!ok) process.exit(1);
    }
    console.log();
  }

  console.log("Done. The confirmed leash produced a valid EIP-712 signature for the live PermissionEngine domain.");
}

function short(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
