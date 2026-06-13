# WARDEN Architecture

WARDEN starts with one enforceable invariant: agents do not custody or directly move user assets. They submit trade requests to `WARDENVault`, and the vault validates the active user-signed policy before calling any external router.

The first slice contains Solidity enforcement, EIP-712 policy activation, ERC-8004-style agent identity, deterministic mocks, a Stylus slashing target, x402-shaped monitor incentives, a dashboard, and a demo agent harness.

## Contract Boundary

The vault stores one active policy per owner. `activatePolicy` verifies an EIP-712 signature through `PermissionEngine`, marks the policy nonce used, and emits `PolicyActivated`. `execute` accepts a `TradeRequest`, checks the caller, expiry, allowed asset, EUR notional limit, and CET blocked window, then approves and calls the requested venue.

Rejected requests use custom errors. The important safety property is that validation happens before external calls, so failed policy checks leave the vault and router balances unchanged.

The current vault also has an owner-controlled emergency pause. Pausing blocks new policy activation and agent `execute` calls, but does not block ERC-4626 withdrawals, so users can exit while agent activity is frozen.

## Follow-On Primitives

`AgentIdentityRegistry` follows the current ERC-8004 draft shape closely enough for the demo: agents are ERC-721 NFTs, `tokenURI` is the agent registration file URI, owners can set metadata, and the reserved `agentWallet` metadata is initialized to the owner and cleared on transfer.

`SlashPool.sol` is the executable slashing contract for the current demo. Operators stake USDC, monitors submit unique violation proof hashes, affected users receive slashed collateral, and `AgentIdentityRegistry` records the proof against the agent NFT. `ISlashPool` remains a narrow interface for swapping this Solidity implementation with a Stylus deployment.

The current vault emits `PolicyViolation` before reverting for local traces, but production monitor design should account for reverted logs not persisting on-chain; the monitor proof path is modeled as a failed-call simulation hash submitted to `SlashPool`.

## Slash Pool

`packages/slash-pool` contains the Rust/Stylus slashing target. The `stylus-sdk` entrypoint stores operator stake, one-use proof hashes, and beneficiary balances; the pure Rust core tests mirror the same state transitions without native Stylus host bindings.
`pnpm stylus:check` runs native Rust tests, compiles the Stylus WASM, exports `ISlashPoolStylus.sol`, and runs `cargo stylus check` activation simulation. It defaults to Robinhood Chain testnet when `STYLUS_ENDPOINT` is unset; set `WARDEN_SKIP_STYLUS_ACTIVATION=1` only for offline compile checks.

## Monitor Market

`packages/monitor` models the monitor flow: create a deterministic violation proof hash, verify it locally, prepare the `SlashPool.submitViolation` payload, and quote a paid submission endpoint using the HTTP 402 shape used by x402. It is not a settlement implementation yet; it is the scaffold for the future monitor node that will submit slash proofs and earn USDC.

## Dashboard

`packages/dashboard` is a Vite React app for the hackathon demo surface. It is intentionally read-only and demo-state driven: it presents the verified contract story without pretending to be a production portfolio manager. The dashboard covers the vault policy, blocked execution, proof hash, slashing result, and portable agent reputation marketplace.

## Adversarial Testing

The Foundry suite includes deterministic unit tests and fuzz tests. The fuzz suite probes over-limit trades, every blocked minute in the midnight-wrapped CET trading window, every allowed minute in the daytime window, and arbitrary non-agent callers. These tests are the current adversarial evidence for the claim that the vault enforces policy before external calls.

## Local End-To-End Demo

`packages/agent/src/e2e-local.ts` is the executable integration demo. It starts Anvil, deploys the vault, permission engine, identity registry, slash pool, mock tokens, and mock router, signs Sarah's EIP-712 policy, executes an allowed YieldAgent trade, verifies the blocked-hours trade reverts, then has a monitor submit the proof to slash collateral and record reputation.
