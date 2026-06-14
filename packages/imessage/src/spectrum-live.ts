import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import type { Hex } from "viem";
import { activateOnChain, buildOnChainPolicy, makeClients, signPolicy } from "./policy.js";
import { newSession, reduce, type Session } from "./session.js";

// Live onboarding runner against Robinhood Chain.
//
// This drives the SAME reducer the production iMessage transport uses; here the
// "transport" is just the terminal (one sender, one chat). To go to real
// iMessage, replace the readline loop with the Photon Spectrum 5-stage pipeline
// — the reducer and on-chain commit below are transport-agnostic and unchanged:
//
//   Batch queue → Batch flush (5s debounce) → Mark read → reduce() → Send (paced)
//
//   • Per-sender serialization: one in-flight chain per `session.sender`
//     (resourceId). New inbound for that sender cancels the in-flight chain and
//     carries drained messages forward (carried_messages) so an edit mid-sign
//     isn't lost.
//   • Cancellation: compare inflight.cancelled_at > chainStartedAt before the
//     send stage; abort via AbortController if a newer message arrived.
//   • Recovery: stable clientGuids `${jobId}-${index}`; persist startIndex after
//     each send so retries resume without double-texting the user.
//   • Working memory scoped { resourceId: sender, threadId: `chat-${sender}` }.
//   • Inbound-first only — the user always texts WARDEN first; we never cold-DM,
//     never put links/media in the first message (deliverability rules).
//
// The commit step is the irreversible one (signs + sends two txs), so it only
// runs after the reducer has gated on an explicit YES.

function reqKey(name: string): Hex {
  const v = process.env[name];
  if (!v?.match(/^0x[0-9a-fA-F]{64}$/)) {
    throw new Error(`${name} must be a 0x hex private key in .env to run the live on-chain onboarding.`);
  }
  return v as Hex;
}

async function main() {
  const ownerKey = reqKey("WARDEN_OWNER_PRIVATE_KEY");
  // Reuse the agent key the rest of the stack already uses.
  const agentKey = reqKey(process.env.WARDEN_AGENT_PRIVATE_KEY ? "WARDEN_AGENT_PRIVATE_KEY" : "DEPLOYER_PRIVATE_KEY");
  const { owner, agent, publicClient, ownerWallet, agentWallet } = makeClients(ownerKey, agentKey);

  console.log(`WARDEN × iMessage — LIVE on Robinhood Chain`);
  console.log(`Owner ${owner.address}  Agent ${agent.address}\n`);

  const rl = createInterface({ input: stdin, output: stdout });
  let session: Session = newSession(owner.address);

  // Print the opening prompt (inbound-first: in prod the user texts first).
  printWarden(reduce(session, "hi").reply.text);

  while (true) {
    const text = (await rl.question("you ▸ ")).trim();
    if (!text || /^(exit|quit)$/i.test(text)) break;

    const { session: next, reply } = reduce(session, text);
    session = next;
    printWarden(reply.text);

    if (reply.commit && session.draft) {
      const draft = session.draft;
      const block = await publicClient.getBlock();
      const policy = buildOnChainPolicy(draft, owner.address, agent.address, block.timestamp);
      const signature = await signPolicy(owner, policy);
      const result = await activateOnChain(ownerWallet, agentWallet, policy, signature, publicClient, draft.vault);

      session = { ...session, stage: "done" };
      printWarden(
        `✅ Leashed on-chain.\n` +
          `   activatePolicy: ${result.explorer}/tx/${result.activationTx}\n` +
          (result.registrationTx
            ? `   identity register: ${result.explorer}/tx/${result.registrationTx}\n`
            : `   (agent identity already registered)\n`) +
          `   Your agent can now trade ${draft.assetSymbol} — but only inside the leash. ` +
          `Any violation reverts in the vault and is recorded against the agent's reputation.`,
      );
    }
  }
  rl.close();
}

function printWarden(text: string) {
  console.log(`\nwarden ▸ ${text.replace(/\n/g, "\n          ")}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
