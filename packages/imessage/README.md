# @warden/imessage

The consumer front door for WARDEN: **set up a self-custodied RWA trading agent by texting, and sign its on-chain leash from your phone.**

WARDEN's contracts already enforce the hard part — a signed policy, on-chain reverts on violation, slashing, portable reputation. This package is the human surface: natural language in iMessage → a `PermissionEngine` EIP-712 policy → `activatePolicy` on the live vault + ERC-8004 identity mint. Same contracts the rest of the protocol uses ([packages/contracts](../contracts), [packages/agent](../agent)).

> Cute agent. Hard leash.

## Flow

```
user texts a leash in plain English
        │
        ▼
parse.ts        deterministic NL → DraftPolicy (asset, max €/trade, blocked hours, validity)
        │
        ▼
session.ts      confirmation state machine — NEVER signs without an explicit YES;
                edits patch the prior draft instead of replacing it
        │  YES
        ▼
policy.ts       DraftPolicy → PolicyTypes.Policy → owner EIP-712 signature
                → vault.activatePolicy(policy, sig) + registry.register(agentURI)
        │
        ▼
on Robinhood Chain: agent may now trade — but only inside the leash.
Any violation reverts in WARDENVault and is recorded against the agent's identity.
```

## Commands

```bash
pnpm --filter @warden/imessage test   # 29 assertions: parser + confirmation gate + edit-merge
pnpm --filter @warden/imessage demo   # offline scripted convo; signs a REAL EIP-712 policy
                                      #   and verifies it against the live PermissionEngine
                                      #   domain — no RPC, no funds, no creds
pnpm --filter @warden/imessage live   # interactive on-chain onboarding (needs keys + funds)
```

`demo` is the reviewable proof: it runs the exact reducer + signing path end to end and
recovers the signer locally to show the signature is valid for the deployed
`PermissionEngine`. `live` swaps the scripted input for stdin and commits to chain.

## Production transport

`spectrum-live.ts` drives the reducer over the terminal. To ship real iMessage, replace
that loop with the **Photon Spectrum 5-stage pipeline** (`Batch queue → flush (5s
debounce) → mark read → reduce() → send paced`). The reducer (`session.ts`) and the
on-chain commit (`policy.ts`) are transport-agnostic and unchanged. Photon rules that
apply: per-sender serialization (cancel in-flight chain on new inbound, carry drained
messages forward), stable `clientGuids` for retry-safe sends, inbound-first only (no
cold DMs, no links in the first message). See the header comment in `spectrum-live.ts`.

## Env (live only)

```
WARDEN_OWNER_PRIVATE_KEY=0x…   # the user's wallet (Circle/EOA in prod) that signs the policy
WARDEN_AGENT_PRIVATE_KEY=0x…   # the agent acting under the leash (falls back to DEPLOYER_PRIVATE_KEY)
ROBINHOOD_RPC_URL=…            # defaults to the public testnet RPC
```
