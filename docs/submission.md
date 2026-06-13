# WARDEN Submission Packet

## One-Liner

WARDEN is an ERC-4626 agent vault that enforces retail tokenized-stock portfolio rules on-chain, then slashes agent collateral and updates portable reputation when a monitor proves a violation.

For the copy-ready submission text, contract table, and final caveats, use `docs/final-submission.md`. For the exact recording flow, use `docs/recording-runbook.md`. For the latest saved public-chain state, use `docs/live-evidence-2026-06-01.md`. For the strict done/open audit, use `docs/completion-audit-2026-06-01.md`. For judging calls, use `docs/judge-qa.md`.

## Demo Narrative

Sarah holds tokenized TSLA. She signs one policy: TSLA only, max 50 EUR per trade, no trades between 22:00 and 06:00 CET. YieldAgent can act only through WARDEN.

At 01:30 CET, YieldAgent attempts a swap. `WARDENVault.execute()` reverts with `TradingWindowClosed()`. No TSLA leaves the vault. A monitor prepares a proof hash, quotes a paid x402-style submission, calls `SlashPool.submitViolation`, Sarah receives slash collateral, and YieldAgent's ERC-8004-style NFT records the violation.

## Track Mapping

- Overall: consumer-protection infrastructure for tokenized stock portfolios.
- Agentic: autonomous agent has bounded delegated authority and economic accountability.
- Stylus: Rust/Stylus slash pool compiles to WASM, exports a Solidity ABI, and mirrors the tested Solidity slashing path.
- Robinhood Chain: vault wraps tokenized stock assets and uses Sarah's retail TSLA policy as the primary demo.

## Evidence Matrix

For the stricter requirement-by-requirement status, use `docs/evidence-audit.md`.

| Claim | Evidence |
| --- | --- |
| Policy violations revert in Solidity | `testRejectsBlockedCETWindow`, `testRejectsTradeValueAboveLimit`, `testRejectsWrongAsset` |
| No funds move on violation | `testRejectedTradeDoesNotMoveFunds` |
| Delegated agent only | `testRejectsUnauthorizedAgent`, `testFuzzOnlyDelegatedAgentCanExecute` |
| One signed policy activates session | `testPolicySignatureAcceptsOwnerSignature`, `testActivatesPolicyWithValidSignature` |
| Blocked window handles midnight wrap | `testRejectsBlockedCETWindow`, `testFuzzRejectsEveryMinuteInsideMidnightWrappedBlockedWindow` |
| Slashing pays affected user | `testMonitorSlashesOperatorAndUpdatesReputation` |
| Reputation updates on-chain | `testMonitorSlashesOperatorAndUpdatesReputation`, `AgentIdentityRegistry.violationProof` |
| Monitor proof is x402-shaped | `packages/monitor/src/demo.ts` |
| Stylus Slash Pool builds | `pnpm stylus:check`, `packages/slash-pool/ISlashPoolStylus.sol` |
| Agent calls execute end-to-end | `pnpm e2e` / `packages/agent/src/e2e-local.ts` |
| Dashboard exists for recording | `packages/dashboard` and `pnpm dev` |
| Robinhood deployment wraps official TSLA | `docs/deployments/robinhood-testnet-46630.md`, verified `WARDENVault.asset()` |
| Contracts are explorer-verified | Robinhood Blockscout links in `docs/deployments/robinhood-testnet-46630.md` |
| Live deployment status is reproducible without a key | `pnpm preflight:robinhood` / `pnpm status:robinhood` |
| Live Robinhood blocked execution can be demonstrated | `pnpm live:robinhood` with `WARDEN_LIVE_MODE=blocked-now` |

## Recording Checklist

1. Run `pnpm test` and show 27 passing Foundry tests.
2. Run `pnpm e2e` and show the real local chain flow: deploy, sign, allowed trade, blocked revert, slash, reputation update.
3. Run `pnpm verify:submission` as the full non-secret evidence gate, or run the individual commands if the video needs shorter clips.
4. Run `pnpm preflight:robinhood` and show the verified TSLA/AMD/AMZN/PLTR/NFLX vaults, USDG SlashPool wiring, and current collateral status.
5. Run `pnpm env:robinhood`, then `pnpm live:robinhood`, and show the verified Robinhood TSLA vault rejecting a blocked `execute()` with no TSLA movement after `DEPLOYER_PRIVATE_KEY` is set locally.
6. Run `pnpm demo` and show the encoded `execute` call plus monitor proof payload.
7. Open `http://127.0.0.1:5173/`.
8. Walk through Sarah's official TSLA vault panel.
9. Show the red `TradingWindowClosed()` incident.
10. Show x402 monitor quote and proof hash.
11. Show Slash Pool before/after from local E2E, or from live Robinhood only after `pnpm live:robinhood:slash` succeeds.
12. Show YieldAgent marketplace row as the intended reputation outcome; call it live only after the signed slash proof records the violation.
13. Close with the invariant: the agent tried; Solidity said no; no funds moved.

## Current Limitations

- Official Robinhood TSLA/AMD/AMZN/PLTR/NFLX vaults are live and funded; the TSLA blocked-execution proof is recorded.
- Live USDG slash/reputation evidence is recorded against agent identity id `1`.
- Rust/Stylus SlashPool is deployed and activated on Robinhood Chain testnet.
- The dashboard is a local demo surface, not a production portfolio application.
