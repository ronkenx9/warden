# WARDEN

Trustless agent vault for tokenized real-world assets.

WARDEN moves AI-agent portfolio rules on-chain. A user signs one policy, the agent can act only through the vault, and policy violations revert before funds move.

## Week 1 Slice

- `WARDENVault.sol`: ERC-4626 vault wrapper for tokenized stock assets.
- `PermissionEngine.sol`: EIP-712 policy verifier for one-signature delegated agent sessions.
- `AgentIdentityRegistry.sol`: ERC-8004-style ERC-721 agent identity registry with URI and metadata support.
- `SlashPool.sol`: executable Solidity slashing path that moves USDC collateral to affected users and records agent violations.
- `packages/slash-pool`: Rust/Stylus slashing contract with native core tests, WASM build, and exported Solidity ABI.
- `packages/monitor`: x402-style monitor proof and reward quote scaffold.
- `packages/dashboard`: local dashboard and agent marketplace for the hackathon demo.
- `docs/deployment.md`: deploy commands and chain-specific handoff notes.
- `docs/submission.md`: recording checklist and evidence matrix.
- Foundry tests covering Sarah's TSLA-only, max 50 EUR/trade, no 22:00-06:00 CET policy.
- TypeScript demo harness that narrates the allowed and blocked agent paths.
- Hooks for ERC-8004 identity, Stylus slashing, and x402 monitors through interfaces and vault events.

## Commands

```bash
pnpm install
pnpm test
pnpm build
pnpm demo
pnpm e2e
pnpm verify:submission
pnpm env:robinhood
pnpm preflight:robinhood
pnpm status:robinhood
pnpm live:robinhood
pnpm live:robinhood:slash
pnpm dev
pnpm stylus:check
```

The Foundry test suite is the authoritative executable demo.
`pnpm e2e` starts Anvil, deploys the full local stack, signs Sarah's policy, executes an allowed YieldAgent trade, proves the blocked trade reverts, slashes 100 USDC, and records the reputation violation.
`pnpm dev` starts the dashboard at `http://127.0.0.1:5173/`.

`pnpm verify:submission` runs the full non-secret evidence gate: Solidity tests, TypeScript/dashboard builds, local demos, local Anvil E2E, Stylus check, and Robinhood preflight. It does not sign live transactions.

`pnpm env:robinhood` checks local `.env` without printing secrets. It derives the deployer and agent addresses, verifies the deployer key matches the funded deployment wallet, and confirms the watched agent matches the signing agent.

`pnpm preflight:robinhood` and `pnpm status:robinhood` both read the verified Robinhood Chain testnet deployment without a private key. They check that the vault wraps official TSLA, TSLA is deposited, SlashPool uses official USDG, the registry points to SlashPool, and the watched agent has enough wallet USDG or SlashPool stake for one live slash. Set `WARDEN_AGENT_ADDRESS` to inspect a separate delegated agent wallet; otherwise it watches the deployer fallback address.

`pnpm live:robinhood` loads `.env`, activates a fresh policy, attempts a blocked live `execute()`, expects `TradingWindowClosed()`, and verifies that no TSLA moved. Set `DEPLOYER_PRIVATE_KEY` locally before running. `pnpm live:robinhood:slash` runs the same blocked proof plus the funded slash/reputation path when `pnpm preflight:robinhood` shows the watched agent has enough wallet USDG or stake. Set `WARDEN_LIVE_MODE=allowed` only when intentionally moving a small TSLA amount through the demo router.

Rust/Stylus verification requires Rust 1.88+, `rustup`, `cargo-stylus`, and `wasm32-unknown-unknown`. `pnpm stylus:check` runs native Rust tests, builds the Stylus WASM, exports `packages/slash-pool/ISlashPoolStylus.sol`, and runs `cargo stylus check` activation simulation. It defaults to Robinhood Chain testnet when `STYLUS_ENDPOINT` is unset. Set `WARDEN_SKIP_STYLUS_ACTIVATION=1` only when you need an offline compile check.

## Verified Behavior

`pnpm test` runs Foundry tests for:

- valid policy activation from Sarah's signature
- deposit and withdraw share accounting
- allowed YieldAgent execution
- rejection for unauthorized caller
- rejection for expired policy
- rejection for non-TSLA asset
- rejection above 50 EUR notional
- rejection during the 22:00-06:00 CET blocked window
- no token movement on rejected execution
- nonce replay prevention
- agent NFT registration, URI updates, metadata, reserved wallet metadata, and wallet reset on transfer
- monitor-submitted slashing, duplicate proof rejection, over-slash rejection, and reputation proof recording
- adversarial fuzzing for limit checks, blocked-window enforcement, allowed-window execution, and delegated caller restrictions
- local Anvil E2E for the full Sarah/YieldAgent/monitor/slash/reputation path
- Rust/Stylus Slash Pool native state-machine tests, WASM build, and ABI export

## Deployment And Submission

- Deployment handoff: `docs/deployment.md`
- Robinhood Chain testnet deployment: `docs/deployments/robinhood-testnet-46630.md`
- PRD evidence audit: `docs/evidence-audit.md`
- Completion audit: `docs/completion-audit-2026-06-01.md`
- Live evidence snapshot: `docs/live-evidence-2026-06-01.md`
- Judge Q&A: `docs/judge-qa.md`
- Hackathon submission packet: `docs/submission.md`
- Final submission draft: `docs/final-submission.md`
- Recording runbook: `docs/recording-runbook.md`

## Dashboard

The dashboard shows the first-screen WARDEN demo state:

- Sarah's official Robinhood TSLA vault and policy rules
- the blocked 01:30 CET `TradingWindowClosed()` attempt
- x402-style monitor proof submission
- live USDG slash readiness for the watched agent
- post-signed-proof slash and reputation outcome
- a compact timeline that separates live vault evidence from local E2E slash proof
