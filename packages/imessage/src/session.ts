import { describePolicy, mergeDraft, parsePolicy, type DraftPolicy } from "./parse.js";

// Onboarding is a confirmation state machine, mirroring PING's "never act on an
// unconfirmed intent" rule. The leash is only signed after an explicit YES.
//
//   greeting --(policy text)--> drafted --(yes)--> signing --> done
//                                  ^  |
//                                  |  (edit / new text re-drafts)
//                                  +--+
export type SessionStage = "greeting" | "drafted" | "signing" | "done";

export type Session = {
  sender: string; // iMessage handle / phone — Photon resourceId
  stage: SessionStage;
  draft: DraftPolicy | null;
  // Photon: serialize per sender. While a chain is processing this sender's
  // turn, later messages must not interleave — they carry forward instead.
  processing: boolean;
};

export type Reply = {
  text: string;
  // signal to the transport layer that a confirmed policy is ready to commit
  commit: boolean;
};

const YES = /^\s*(y|yes|yep|yeah|confirm|sign|go|do it|approve|ok(ay)?)\b/i;
const NO = /^\s*(n|no|nope|cancel|stop|abort|nah)\b/i;
const RESET = /^\s*(start over|restart|reset|new agent)\b/i;

export function newSession(sender: string): Session {
  return { sender, stage: "greeting", draft: null, processing: false };
}

const GREETING =
  "🛡️ WARDEN — set up a self-custodied RWA trading agent.\n\n" +
  "Tell me the leash in plain English, e.g.:\n" +
  '"TSLA only, max €50 per trade, no trades between 22:00 and 06:00, valid for 7 days."';

/**
 * Pure reducer: given the current session and the user's text, returns the
 * next session and the reply. No I/O — the transport layer handles signing
 * when `reply.commit` is true. This keeps the conversation logic unit-testable
 * and free of side effects (important under Photon cancellation/retry).
 */
export function reduce(session: Session, text: string): { session: Session; reply: Reply } {
  const trimmed = text.trim();

  if (RESET.test(trimmed)) {
    return {
      session: { ...session, stage: "greeting", draft: null },
      reply: { text: GREETING, commit: false },
    };
  }

  switch (session.stage) {
    case "greeting": {
      // First substantive message: try to parse a policy out of it. If it's
      // just "hi", greet and wait.
      if (looksLikePolicy(trimmed)) {
        return draftFrom(session, trimmed);
      }
      return { session, reply: { text: GREETING, commit: false } };
    }

    case "drafted": {
      if (YES.test(trimmed)) {
        if (session.draft && !session.draft.assetLive) {
          return {
            session,
            reply: {
              text:
                `${session.draft.assetSymbol} isn't live on this deployment yet, ` +
                "so I can't activate that leash. Try TSLA, or say 'start over'.",
              commit: false,
            },
          };
        }
        return {
          session: { ...session, stage: "signing" },
          reply: { text: "Signing your policy and activating the vault on Robinhood Chain…", commit: true },
        };
      }
      if (NO.test(trimmed)) {
        return {
          session: { ...session, stage: "greeting", draft: null },
          reply: { text: "Cancelled. Nothing signed. Send a new leash whenever you're ready.", commit: false },
        };
      }
      // Anything else = an edit. Re-draft from the new description.
      return draftFrom(session, trimmed);
    }

    case "signing":
      // Commit already in flight; ignore stray input until done.
      return { session, reply: { text: "One sec — still activating your agent on-chain…", commit: false } };

    case "done":
      return {
        session: { ...session, stage: "greeting", draft: null },
        reply: { text: "Your agent is live. Send a new leash to set up another, or 'start over'.", commit: false },
      };
  }
}

function draftFrom(session: Session, text: string): { session: Session; reply: Reply } {
  // If we're already mid-draft, treat this as an edit that patches the prior
  // leash rather than replacing it wholesale.
  const parsed = parsePolicy(text);
  const draft = session.draft ? mergeDraft(session.draft, parsed) : parsed;
  const confirm =
    "Here's the leash I'll put on your agent:\n\n" +
    describePolicy(draft) +
    "\n\nReply YES to sign & activate on Robinhood Chain, or describe any change.";
  return { session: { ...session, stage: "drafted", draft }, reply: { text: confirm, commit: false } };
}

function looksLikePolicy(text: string): boolean {
  // Cheap gate: mentions money, an asset, a time, or trading verbs.
  return /\b(amd|ramd|tsla|rtsla|amzn|ramzn|pltr|rpltr|nflx|rnflx|eur|euro|€|\$|trade|max|limit|cap|between|am|pm|\d)\b/i.test(
    text,
  );
}

export { GREETING };
