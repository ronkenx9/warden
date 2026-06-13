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
| Agent Vault wraps tokenized stock assets as ERC-4626 shares | Done | `packages/contracts/src/WARDENVault.sol`, Foundry vault tests, hardened Robinhood vaults for TSLA, AMD, AMZN, PLTR, and NFLX, each with 1 official stock token deposited | None for Robinhood official-stock vaults. |
| Vault enforces policy at contract boundary before agent execution | Done | `WARDENVault.execute`, `testRejectsBlockedCETWindow`, `testRejectsTradeValueAboveLimit`, `testRejectsWrongAsset`, `testRejectedTradeDoesNotMoveFunds` | Capture live blocked execution for submission recording. |
| One signed human-readable policy activates delegated agent session | Done | `PermissionEngine.sol`, EIP-712 typed-data flow in tests and `packages/agent/src/live-robinhood.ts` | Record MetaMask/human-readable signature path if UI demo needs wallet capture. |
| Agent can execute only as delegated caller | Done | `testRejectsUnauthorizedAgent`, `testFuzzOnlyDelegatedAgentCanExecute` | None. |
| Sarah demo policy: TSLA only, max 50 EUR, no 22:00-06:00 CET | Done | Foundry tests cover TSLA-only, 50 EUR limit, and midnight-wrapped CET blocked window | Live script uses `blocked-now` for immediate proof; exact 22:00-06:00 live proof requires running during that window or time-controlled local E2E. |
| At blocked time, `execute()` reverts and no funds move | Done | Local tests, `pnpm e2e`, and live Robinhood `pnpm live:robinhood:slash` against vault `0x72E59162C013864AF1e150fbe12e454A99aF7412`; blocked execute reverted with `TradingWindowClosed` and no TSLA moved | None for Robinhood testnet. |
| Slash Pool pays affected user from agent/operator collateral | Done | Authorized-monitor `SlashPool.sol`, local E2E, and live Robinhood slash tx `0x4c6f96f76c623d46b0cb53c327067c98acb06b2ca61b7d3e1f9610c0de5c4a92` | None for Robinhood testnet. |
| Agent identity/reputation updates on-chain | Done | Live Robinhood agent identity id `1`, violation count `1`, proof `0xdfde4926362720f4c4c0d9c7fd4fa7ea17b397ef1230a90ae9f6fda35d6398b4` | None for Robinhood testnet. |
| Monitor Market is x402-shaped and submits proofs | Partial | `packages/monitor/src/demo.ts`, proof hash and quote payload, `SlashPool.submitViolation` integration | Monitor is a demo scaffold, not a decentralized paid marketplace. |
| Rust/Stylus Slash Pool exists and compiles to WASM | Done | `packages/slash-pool`, `pnpm stylus:check`, generated `ISlashPoolStylus.sol` | None for compile/check evidence. |
| Rust/Stylus Slash Pool is deployed/broadcast | Done | Robinhood Stylus address `0xb50d8f8eb201124e5e1cea1de2bdb49c6ae513c8`, deploy tx `0xd4fdf1266b5ebd6c4ef74e6ee473d3986b9af3a529f9998baf16a924c94166dc`, activation tx `0x2971f26a31e8221e166ed29dbe3f1fb19188d01780dfaaf7aa887e5d45161a8c` | None for Robinhood testnet Stylus. |
| Deployed on Robinhood Chain testnet | Done | `docs/deployments/robinhood-testnet-46630.md`, verified Blockscout links, `pnpm status:robinhood` | None for Solidity stack. |
| Deployed on Arbitrum One | Done | Arbitrum One demo stack recorded in `docs/deployments/arbitrum-one-42161.md` and `docs/deployments/arbitrum-one-42161.json`; code reads confirmed non-empty bytecode for WARDENVault and SlashPool | None for mock demo stack. |
| Dashboard and agent marketplace exist for demo | Done | `packages/dashboard`, `pnpm build`, dashboard copy references the hardened official Robinhood multi-stock stack | Run `pnpm dev` for recording. |
| Adversarial fuzzing documented | Partial | `packages/contracts/test/WARDENVaultFuzz.t.sol` and submission evidence matrix mention fuzz tests | Add a short fuzzing note to the final writeup if judges expect prose. |

## Current Live Robinhood Evidence

Hardened official-token stack:

| Contract | Address |
| --- | --- |
| PermissionEngine | `0x049527f5331FaeA8f0e9E86be8FDdCB86BdeE1ba` |
| TSLA WARDENVault | `0x72E59162C013864AF1e150fbe12e454A99aF7412` |
| AMD WARDENVault | `0x1C03E8C2a46a2fEF43eE53dd10341806CC3f9dF2` |
| AMZN WARDENVault | `0x1BC9cAE1Fc191f7620BfD1a8463AeF76aD3d8E8F` |
| PLTR WARDENVault | `0xb11a205E3E1390D33184a7BF6403ef490feFDe4e` |
| NFLX WARDENVault | `0x4425A1c7561341ce196F3b792c2Cfc6cCbb78603` |
| AgentIdentityRegistry | `0x4D566c927d0B4d40AcC880b9729d8c5D905867D1` |
| SlashPool | `0x6745b7CE66756085cF1254d2028EB9e3b4407bbE` |
| Stylus SlashPool | `0xb50d8f8eb201124e5e1cea1de2bdb49c6ae513c8` |

Official Robinhood Chain tokens:

| Token | Address |
| --- | --- |
| AMD | `0x71178BAc73cBeb415514eB542a8995b82669778d` |
| TSLA | `0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E` |
| AMZN | `0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02` |
| PLTR | `0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0` |
| NFLX | `0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93` |
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
- all official stock vaults hold deposits
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

Current claim boundary:

- Say the Solidity WARDEN stack is live and verified on Robinhood Chain testnet with official TSLA, AMD, AMZN, PLTR, NFLX, and USDG.
- Say the Rust/Stylus Slash Pool is deployed and activated on Robinhood Chain testnet.
- Say the Arbitrum One deployment is a mainnet demo stack that uses mock tokenized stock/collateral assets because Robinhood's official stock tokens live on Robinhood Chain.
- Do not claim retail production readiness until independent audit, legal/compliance review, key management, and operational monitoring are complete.
