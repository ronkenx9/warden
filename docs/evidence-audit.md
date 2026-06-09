# WARDEN Evidence Audit

This audit maps the PRD promises to the strongest current evidence in the repo or on Robinhood Chain testnet. It is intentionally stricter than the demo script: `Done` means there is executable or live-chain evidence; `Partial` means the implementation exists but a live proof is still missing.

## Status Legend

| Status | Meaning |
| --- | --- |
| Done | Implemented and backed by tests, builds, deployed contracts, or repeatable live reads. |
| Partial | Implemented or locally verified, but still missing final live-chain evidence. |
| Open | Not yet proven by current artifacts. |

## PRD Requirement Matrix

| Requirement | Status | Evidence | Remaining Work |
| --- | --- | --- | --- |
| Agent Vault wraps tokenized stock assets as ERC-4626 shares | Done | `packages/contracts/src/WARDENVault.sol`, Foundry vault tests, verified Robinhood vault `0x5e8b55278FC2c1d0Ddb29A8973Bbba9f5CD55c98` | None for Robinhood TSLA vault. |
| Vault enforces policy at contract boundary before agent execution | Done | `WARDENVault.execute`, `testRejectsBlockedCETWindow`, `testRejectsTradeValueAboveLimit`, `testRejectsWrongAsset`, `testRejectedTradeDoesNotMoveFunds` | Capture live blocked execution for submission recording. |
| One signed human-readable policy activates delegated agent session | Done | `PermissionEngine.sol`, EIP-712 typed-data flow in tests and `packages/agent/src/live-robinhood.ts` | Record MetaMask/human-readable signature path if UI demo needs wallet capture. |
| Agent can execute only as delegated caller | Done | `testRejectsUnauthorizedAgent`, `testFuzzOnlyDelegatedAgentCanExecute` | None. |
| Sarah demo policy: TSLA only, max 50 EUR, no 22:00-06:00 CET | Done | Foundry tests cover TSLA-only, 50 EUR limit, and midnight-wrapped CET blocked window | Live script uses `blocked-now` for immediate proof; exact 22:00-06:00 live proof requires running during that window or time-controlled local E2E. |
| At blocked time, `execute()` reverts and no funds move | Partial | Local tests and `pnpm e2e`; live script expects `TradingWindowClosed` and verifies balances unchanged | Run `pnpm live:robinhood` with local `DEPLOYER_PRIVATE_KEY` and capture output. |
| Slash Pool pays affected user from agent/operator collateral | Partial | Solidity `SlashPool.sol`, `testMonitorSlashesOperatorAndUpdatesReputation`, local E2E, optional live slash path, deployer fallback agent has 100 USDG ready on Robinhood | Add `DEPLOYER_PRIVATE_KEY` to local `.env` and run `pnpm live:robinhood:slash`. |
| Agent identity/reputation updates on-chain | Partial | `AgentIdentityRegistry.sol`, `testMonitorSlashesOperatorAndUpdatesReputation`, live SlashPool wired as registry slash recorder | Needs live slash transaction to show Robinhood reputation increment. |
| Monitor Market is x402-shaped and submits proofs | Partial | `packages/monitor/src/demo.ts`, proof hash and quote payload, `SlashPool.submitViolation` integration | Monitor is a demo scaffold, not a decentralized paid marketplace. |
| Rust/Stylus Slash Pool exists and compiles to WASM | Done | `packages/slash-pool`, `pnpm stylus:check`, generated `ISlashPoolStylus.sol` | None for compile/check evidence. |
| Rust/Stylus Slash Pool is deployed/broadcast | Open | Robinhood activation check passed, but broadcast did not happen | Resolve Stylus deployment config or deploy to Arbitrum Sepolia. |
| Deployed on Robinhood Chain testnet | Done | `docs/deployments/robinhood-testnet-46630.md`, verified Blockscout links, `pnpm status:robinhood` | None for Solidity stack. |
| Deployed on Arbitrum One | Open | No current Arbitrum One deployment artifact in repo | Deploy or revise submission claim to Robinhood Chain plus Stylus check/Sepolia if Arbitrum One is not used. |
| Dashboard and agent marketplace exist for demo | Done | `packages/dashboard`, `pnpm build`, dashboard copy references official Robinhood TSLA stack | Run `pnpm dev` for recording. |
| Adversarial fuzzing documented | Partial | `packages/contracts/test/WARDENVaultFuzz.t.sol` and submission evidence matrix mention fuzz tests | Add a short fuzzing note to the final writeup if judges expect prose. |

## Current Live Robinhood Evidence

Official-token stack:

| Contract | Address |
| --- | --- |
| PermissionEngine | `0xd63eFdD5F4774f48F678bD9d12A3cE85c758C428` |
| WARDENVault | `0x5e8b55278FC2c1d0Ddb29A8973Bbba9f5CD55c98` |
| AgentIdentityRegistry | `0x68c451578B0E70e19A9369146061b5c311387cD3` |
| SlashPool | `0xE9F0F8BE0B079d5A910e651aF62A1a3756057Dc8` |
| MockRouter | `0x1E1e8528760B310d0b23b32ee9B5a0025a280FF7` |

Official Robinhood Chain tokens:

| Token | Address |
| --- | --- |
| TSLA | `0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E` |
| USDG | `0x7E955252E15c84f5768B83c41a71F9eba181802F` |

Repeatable status command:

```bash
pnpm preflight:robinhood
pnpm status:robinhood
```

Expected checks:

- chain id is Robinhood testnet
- vault wraps official TSLA
- vault has TSLA deposited
- slash pool uses official USDG
- registry points to slash pool
- watched agent has enough wallet USDG or SlashPool stake for one live slash

## Final Evidence Checklist

Run these before recording or submission:

```bash
pnpm verify:submission
```

After `DEPLOYER_PRIVATE_KEY` is set locally:

```bash
pnpm env:robinhood
pnpm live:robinhood
pnpm live:robinhood:slash
```

Keep the submission honest if the final two open items remain unresolved:

- Say the Solidity WARDEN stack is live and verified on Robinhood Chain.
- Say the Rust/Stylus Slash Pool passes WASM build and activation validation, but is not broadcast until deployment config is resolved.
- Do not claim Arbitrum One deployment unless an actual address and explorer link are added.
