# WARDEN Final Submission Draft

Use this as the hackathon submission source of truth. It keeps the public claim tight: the Solidity WARDEN stack is live and verified on Robinhood Chain testnet; the Rust/Stylus Slash Pool is deployed and activated on Robinhood Chain testnet; the Arbitrum One deployment is a mock-asset demo stack because official Robinhood stock tokens live on Robinhood Chain.

## Project Name

WARDEN

## One-Liner

WARDEN is a trustless ERC-4626 vault for tokenized stocks that enforces AI-agent portfolio rules on-chain, then slashes collateral and updates portable reputation when a monitor proves a violation.

## Short Description

Agentic DeFi normally trusts the agent's own code to obey user limits. WARDEN moves those limits into contracts. A retail user signs one EIP-712 policy for their tokenized-stock vault: allowed asset, max EUR trade size, delegated agent, expiry, and blocked CET trading window. The agent can call `execute()` only through the vault. If it violates the policy, the transaction reverts before external router calls and no user funds move. The current vault code also has an emergency pause that blocks new policy activation and agent execution while preserving user withdrawals.

The demo uses official Robinhood Chain testnet stock tokens and USDG contracts. Sarah deposits TSLA into WARDEN, signs a TSLA-only policy with a 50 EUR limit and 22:00-06:00 CET block, and YieldAgent attempts a blocked trade. `WARDENVault` rejects it with `TradingWindowClosed()`. A monitor packages the failed-call proof, `SlashPool` slashes the agent/operator collateral, and the agent's ERC-8004-style identity records the violation. Additional official-stock ERC-4626 vaults are live and funded for AMD, AMZN, PLTR, and NFLX.

The monitor service is x402-shaped: `GET /quote` returns an exact-payment quote, `POST /violations` requires an `x-payment` header matching the quote, reconciles the payment transaction against ERC-20 `Transfer` logs, and then submits the resulting proof hash to `SlashPool.submitViolation`. The production contract version also includes a `MonitorRegistry` so independent runners can self-register endpoint and payment metadata before submitting proofs.

## Built For

- Overall track: consumer-protection infrastructure for tokenized RWA portfolios.
- Agentic track: autonomous agents get bounded delegated authority plus economic accountability.
- Stylus track: Rust/Stylus Slash Pool mirrors the Solidity slashing path and is deployed/activated on Robinhood Chain testnet.
- Robinhood Chain: live verified vaults wrap official Robinhood Chain testnet TSLA, AMD, AMZN, PLTR, and NFLX tokens.

## Coming Soon: Text The Leash (iMessage Front Door)

The next WARDEN surface is a consumer front door over iMessage: describe the leash in plain English ("TSLA only, max EUR 50 a trade, nothing 22:00-06:00"), and WARDEN turns it into a signed on-chain policy and activates the agent's vault. This is the onboarding layer on top of the same contracts above — it does not change the protocol.

Status is honest and scoped:

- The natural-language -> EIP-712 policy -> `activatePolicy` path is implemented in `packages/imessage` and unit-tested (parser + confirmation gate + per-asset vault routing). The signature is verified against the deployed `PermissionEngine` domain offline, with zero creds, via `pnpm --filter @warden/imessage demo`.
- All five per-asset vaults were verified on-chain to share the single `PermissionEngine`, so one signing domain is valid for every asset (`pnpm --filter @warden/imessage verify:vaults`).
- The live iMessage transport (Photon Spectrum 5-stage pipeline) is not shipped yet; it is the documented production swap in `packages/imessage/src/spectrum-live.ts`.

Because the texting transport is not live, the landing page presents it as a waitlist feature, not a shipped capability. Early-access signups are captured on the dashboard.

## Live Robinhood Chain Testnet Contracts

Chain:

- Chain ID: `46630`
- RPC: `https://rpc.testnet.chain.robinhood.com`
- Explorer: `https://explorer.testnet.chain.robinhood.com`

Contracts:

| Contract | Address |
| --- | --- |
| PermissionEngine | `0x049527f5331FaeA8f0e9E86be8FDdCB86BdeE1ba` |
| TSLA WARDENVault | `0x02e658d8F20bbF94d85D0eCC0365Ab4aa5c26Daf` |
| AMD WARDENVault | `0x7f8E3269f6c2DE4394d46c3dacBF12DA21dd2092` |
| AMZN WARDENVault | `0x212f89c78f6E98AB82B76b9b9f3652b48a16526e` |
| PLTR WARDENVault | `0xb7cbF30123382E7d29E127e974b53868a16Aa20d` |
| NFLX WARDENVault | `0xAA976c519485465f299853019AA780AbD47F77F9` |
| AgentIdentityRegistry | `0x4D566c927d0B4d40AcC880b9729d8c5D905867D1` |
| SlashPool | `0x6745b7CE66756085cF1254d2028EB9e3b4407bbE` |
| Stylus SlashPool | `0xb50d8f8eb201124e5e1cea1de2bdb49c6ae513c8` |

Official Robinhood Chain testnet tokens:

| Token | Address |
| --- | --- |
| AMD | `0x71178BAc73cBeb415514eB542a8995b82669778d` |
| TSLA | `0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E` |
| AMZN | `0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02` |
| PLTR | `0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0` |
| NFLX | `0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93` |
| USDG | `0x7E955252E15c84f5768B83c41a71F9eba181802F` |

Source verification links are recorded in `docs/deployments/robinhood-testnet-46630.md`.

## Demo Commands

```bash
pnpm install
pnpm verify:submission
```

`pnpm verify:submission` does not require a private key. It runs Solidity tests, TypeScript/dashboard builds, local demos, local Anvil E2E, Stylus check, and Robinhood preflight.

Keyed live proof after `.env` is configured:

```bash
pnpm env:robinhood
pnpm live:robinhood
```

Live slash proof after `DEPLOYER_PRIVATE_KEY` is set locally:

```bash
pnpm live:robinhood:slash
```

Funding status for the live slash proof:

- The canonical deployer fallback agent `0x6727A665ef9257E2A4e9A4ED58B9136f62b0E1b1` has `100 USDG`, enough for the default slash amount.
- `WARDEN_LIVE_SLASH_AMOUNT` defaults to `100`; lower it only if the funded balance changes.
- If `WARDEN_AGENT_PRIVATE_KEY` is set, fund that agent wallet instead because slash collateral is staked from the delegated agent address.

Dashboard:

```bash
pnpm dev
```

Then open `http://127.0.0.1:5173/`.

## What To Show In The Video

1. `pnpm preflight:robinhood`: verified Robinhood TSLA/AMD/AMZN/PLTR/NFLX vaults, each with 1 official stock token deposited, each unpaused and owned by the expected owner, SlashPool uses official USDG, registry points to SlashPool, and watched agent slash readiness.
2. `pnpm test`: policy rules, revert cases, no-funds-moved check, fuzz tests, slash/reputation tests.
3. `pnpm e2e`: local end-to-end Sarah/YieldAgent/monitor path with allowed trade, blocked trade, slash, and reputation update.
4. `pnpm live:robinhood`: live Robinhood blocked execution reverting with `TradingWindowClosed()` and unchanged TSLA balances.
5. Dashboard: Sarah's vault, blocked incident, x402-style monitor proof, live slash/reputation outcome, and the funded official-stock vault set.

Adversarial fuzzing coverage is included in `packages/contracts/test/WARDENVaultFuzz.t.sol`. The fuzz suite stresses policy limit boundaries, every minute inside the midnight-wrapped CET blocked window, allowed-window execution, and delegated-caller restrictions, so the demo claim is not based only on one hand-picked Sarah scenario.

## Evidence Links Inside Repo

- Requirement audit: `docs/evidence-audit.md`
- Completion audit: `docs/completion-audit-2026-06-01.md`
- Live evidence snapshot: `docs/live-evidence-2026-06-01.md`
- Judge Q&A: `docs/judge-qa.md`
- Recording runbook: `docs/recording-runbook.md`
- Production readiness runbook: `docs/production-readiness.md`
- Deployment details: `docs/deployments/robinhood-testnet-46630.md`
- Architecture: `docs/architecture.md`
- Demo script: `docs/demo-script.md`
- Submission checklist: `docs/submission.md`
- Solidity contracts: `packages/contracts/src/`
- Rust/Stylus Slash Pool: `packages/slash-pool/`
- Monitor demo: `packages/monitor/`
- iMessage front door (coming soon): `packages/imessage/`
- Dashboard: `packages/dashboard/`

## Honest Limitations To Keep In Submission

- The Solidity WARDEN stack is live and verified on Robinhood Chain testnet.
- The live Robinhood vault set currently has official TSLA, AMD, AMZN, PLTR, and NFLX deposited.
- Live USDG collateral is funded and the live slash/reputation proof has been recorded.
- The Rust/Stylus Slash Pool is deployed and activated on Robinhood Chain testnet.
- The iMessage front door is in development. The natural-language-to-signed-policy path is implemented and tested in `packages/imessage`, but the live texting transport is not yet shipped; the landing page presents it as a waitlist feature, not a live capability.
- The Arbitrum One deployment is a mock demo stack. Do not describe it as wrapping official Robinhood stock tokens unless Robinhood publishes official stock contracts on Arbitrum One.
- The repo includes production admin/timelock scripts, `Ownable2Step` SlashPool ownership, monitor registry, and x402 settlement reconciliation.
- Do not claim retail production readiness until external audit, external compliance review, live timelock ownership transfer, and independent monitor operators are complete.

## Closing Line

The agent tried. The vault enforced the user's rules. No funds moved. WARDEN turns agent trust into contract-enforced policy.
