# WARDEN Final Submission Draft

Use this as the hackathon submission source of truth. It keeps the public claim tight: the Solidity WARDEN stack is live and verified on Robinhood Chain testnet; the Rust/Stylus Slash Pool is implemented and activation-checked, but not broadcast until the Stylus deployment path is resolved.

## Project Name

WARDEN

## One-Liner

WARDEN is a trustless ERC-4626 vault for tokenized stocks that enforces AI-agent portfolio rules on-chain, then slashes collateral and updates portable reputation when a monitor proves a violation.

## Short Description

Agentic DeFi normally trusts the agent's own code to obey user limits. WARDEN moves those limits into contracts. A retail user signs one EIP-712 policy for their tokenized-stock vault: allowed asset, max EUR trade size, delegated agent, expiry, and blocked CET trading window. The agent can call `execute()` only through the vault. If it violates the policy, the transaction reverts before external router calls and no user funds move.

The demo uses official Robinhood Chain testnet TSLA and USDG contracts. Sarah deposits TSLA into WARDEN, signs a TSLA-only policy with a 50 EUR limit and 22:00-06:00 CET block, and YieldAgent attempts a blocked trade. `WARDENVault` rejects it with `TradingWindowClosed()`. A monitor packages the failed-call proof, `SlashPool` slashes the agent/operator collateral, and the agent's ERC-8004-style identity records the violation.

## Built For

- Overall track: consumer-protection infrastructure for tokenized RWA portfolios.
- Agentic track: autonomous agents get bounded delegated authority plus economic accountability.
- Stylus track: Rust/Stylus Slash Pool mirrors the Solidity slashing path and passes WASM/activation checks.
- Robinhood Chain: live verified vault wraps the official Robinhood Chain testnet TSLA token.

## Live Robinhood Chain Testnet Contracts

Chain:

- Chain ID: `46630`
- RPC: `https://rpc.testnet.chain.robinhood.com`
- Explorer: `https://explorer.testnet.chain.robinhood.com`

Contracts:

| Contract | Address |
| --- | --- |
| PermissionEngine | `0xd63eFdD5F4774f48F678bD9d12A3cE85c758C428` |
| WARDENVault | `0x5e8b55278FC2c1d0Ddb29A8973Bbba9f5CD55c98` |
| AgentIdentityRegistry | `0x68c451578B0E70e19A9369146061b5c311387cD3` |
| SlashPool | `0xE9F0F8BE0B079d5A910e651aF62A1a3756057Dc8` |
| MockRouter | `0x1E1e8528760B310d0b23b32ee9B5a0025a280FF7` |

Official Robinhood Chain testnet tokens:

| Token | Address |
| --- | --- |
| TSLA | `0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E` |
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

- The deployer fallback agent `0xAdAd6565e19c5d256E1114226735D5496Ab9a627` has `100 USDG`, enough for the default slash amount.
- `WARDEN_LIVE_SLASH_AMOUNT` defaults to `100`; lower it only if the funded balance changes.
- If `WARDEN_AGENT_PRIVATE_KEY` is set, fund that agent wallet instead because slash collateral is staked from the delegated agent address.

Dashboard:

```bash
pnpm dev
```

Then open `http://127.0.0.1:5173/`.

## What To Show In The Video

1. `pnpm preflight:robinhood`: verified Robinhood TSLA vault, 1 TSLA deposited, SlashPool uses official USDG, registry points to SlashPool, and watched agent slash readiness.
2. `pnpm test`: policy rules, revert cases, no-funds-moved check, fuzz tests, slash/reputation tests.
3. `pnpm e2e`: local end-to-end Sarah/YieldAgent/monitor path with allowed trade, blocked trade, slash, and reputation update.
4. `pnpm live:robinhood`: live Robinhood blocked execution reverting with `TradingWindowClosed()` and unchanged TSLA balances.
5. Dashboard: Sarah's vault, blocked incident, x402-style monitor proof, and slash/reputation outcome. Present slash/reputation as local E2E evidence until the signed live slash proof is recorded.

## Evidence Links Inside Repo

- Requirement audit: `docs/evidence-audit.md`
- Completion audit: `docs/completion-audit-2026-06-01.md`
- Live evidence snapshot: `docs/live-evidence-2026-06-01.md`
- Judge Q&A: `docs/judge-qa.md`
- Recording runbook: `docs/recording-runbook.md`
- Deployment details: `docs/deployments/robinhood-testnet-46630.md`
- Architecture: `docs/architecture.md`
- Demo script: `docs/demo-script.md`
- Submission checklist: `docs/submission.md`
- Solidity contracts: `packages/contracts/src/`
- Rust/Stylus Slash Pool: `packages/slash-pool/`
- Monitor demo: `packages/monitor/`
- Dashboard: `packages/dashboard/`

## Honest Limitations To Keep In Submission

- The Solidity WARDEN stack is live and verified on Robinhood Chain testnet.
- The live vault currently has official TSLA deposited.
- Live USDG collateral is funded for one default slash, but live slash/reputation evidence still needs a local `.env` with `DEPLOYER_PRIVATE_KEY` before the transaction can be recorded.
- The Rust/Stylus Slash Pool passes native tests, WASM build, ABI export, and Robinhood activation validation. It is not yet broadcast because the default `cargo stylus deploy --estimate-gas` path returned an unusable estimate.
- Do not claim Arbitrum One deployment unless a real Arbitrum One address and explorer link are added before submission.

## Closing Line

The agent tried. The vault enforced the user's rules. No funds moved. WARDEN turns agent trust into contract-enforced policy.
