# WARDEN Deployment Guide

WARDEN is verified locally and deployed on Robinhood Chain testnet. This guide defines the exact deployment flow for the Robinhood Chain and Arbitrum tracks.

## Prerequisites

- Foundry installed.
- `pnpm install` completed at the repo root.
- A funded deployer private key.
- RPC URLs for the target chains.
- Rust 1.88+, `rustup`, `wasm32-unknown-unknown`, `cargo-stylus`, and a Stylus-capable RPC endpoint for Slash Pool deployment checks.

Copy `.env.example` to `.env` and set real values:

```bash
cp .env.example .env
```

## Local Verification

Run this before every deployment:

```bash
cd /Users/gadgetplug/Documents/vibecoding/warden
forge fmt --check
pnpm test
pnpm build
pnpm demo
pnpm e2e
pnpm stylus:check
```

Expected current evidence:

- 35 Foundry tests pass.
- Dashboard production build completes.
- Agent demo prints the allowed and blocked paths.
- Monitor demo prints a valid local proof and `SlashPool.submitViolation` payload.
- Anvil E2E deploys the full stack and executes the agent/slash/reputation flow.
- Stylus Slash Pool native Rust tests pass, WASM builds, and `ISlashPoolStylus.sol` is exported.

## Robinhood Chain Testnet

The official-token deployment is recorded in `docs/deployments/robinhood-testnet-46630.md`. It wraps Robinhood's official TSLA, AMD, AMZN, PLTR, and NFLX test tokens through one ERC-4626 vault per stock and uses USDG as slash collateral.

For a fresh mock demo stack, deploy the Solidity primitives that wrap mock tokenized stock assets and enforce policy:

```bash
cd /Users/gadgetplug/Documents/vibecoding/warden/packages/contracts
source ../../.env

forge script script/DeployLocal.s.sol:DeployLocal \
  --rpc-url "$ROBINHOOD_RPC_URL" \
  --private-key "$DEPLOYER_PRIVATE_KEY" \
  --broadcast \
  --verify
```

Contracts deployed by this script:

- mock rTSLA and USDC for testnet demo environments
- `PermissionEngine`
- `WARDENVault`
- `AgentIdentityRegistry`
- `SlashPool`
- `MockRouter`

For a real Robinhood Chain or Arbitrum deployment against existing token contracts, use `DeployOfficial` instead of the mock-token script:

```bash
cd /Users/gadgetplug/Documents/vibecoding/warden
pnpm deploy:official
```

Required `.env` values:

- `WARDEN_DEPLOY_RPC_URL`
- `DEPLOYER_PRIVATE_KEY`
- `WARDEN_ASSET`
- `WARDEN_COLLATERAL`
- `WARDEN_VAULT_NAME`
- `WARDEN_VAULT_SYMBOL`

The current verified TSLA vault uses Robinhood TSLA `0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E` and USDG `0x7E955252E15c84f5768B83c41a71F9eba181802F`.

For an additional Robinhood stock vault that should reuse the existing hardened `PermissionEngine`, use `DeployOfficialVault` instead of redeploying the full identity/slash stack:

```bash
cd /Users/gadgetplug/Documents/vibecoding/warden
pnpm deploy:official-vault
```

Required `.env` or exported values:

- `WARDEN_DEPLOY_RPC_URL`
- `DEPLOYER_PRIVATE_KEY`
- `WARDEN_PERMISSION_ENGINE`
- `WARDEN_ASSET`
- `WARDEN_VAULT_NAME`
- `WARDEN_VAULT_SYMBOL`

The current official-stock vaults on Robinhood Chain testnet are the paused-capable vault set. Each vault currently holds `1` deposited stock token, is `paused=false`, and is owned by the canonical deployer. For production, transfer ownership to a multisig/timelock before user funds are accepted.

| Stock | Token | Vault |
| --- | --- | --- |
| TSLA | `0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E` | `0x02e658d8F20bbF94d85D0eCC0365Ab4aa5c26Daf` |
| AMD | `0x71178BAc73cBeb415514eB542a8995b82669778d` | `0x7f8E3269f6c2DE4394d46c3dacBF12DA21dd2092` |
| AMZN | `0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02` | `0x212f89c78f6E98AB82B76b9b9f3652b48a16526e` |
| PLTR | `0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0` | `0xb7cbF30123382E7d29E127e974b53868a16Aa20d` |
| NFLX | `0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93` | `0xAA976c519485465f299853019AA780AbD47F77F9` |

Emergency controls:

- `pause()` / `unpause()` are `onlyOwner`.
- Pausing blocks `activatePolicy` and `execute`.
- ERC-4626 withdrawals remain available while paused so users can exit during incidents.
- `pnpm status:robinhood` checks that the current official vaults are unpaused and owned by the expected owner. Set `WARDEN_EXPECTED_VAULT_OWNER` after transferring to a timelock.

Production admin handoff:

```bash
export WARDEN_TIMELOCK_MIN_DELAY=86400
export WARDEN_TIMELOCK_PROPOSER=0x<multisig>
export WARDEN_TIMELOCK_EXECUTOR=0x0000000000000000000000000000000000000000
export WARDEN_TIMELOCK_ADMIN=0x<temporary-admin-multisig>
pnpm deploy:timelock

export WARDEN_PRODUCTION_OWNER=0x<timelock>
export WARDEN_EXPECTED_VAULT_OWNER=0x<timelock>
pnpm admin:transfer
pnpm status:robinhood
```

The current demo SlashPool predates transferable ownership. Production deployments should use the current `SlashPool` contract, which uses `Ownable2Step`; after `pnpm admin:transfer`, the timelock must execute `acceptOwnership()`.

## Arbitrum Sepolia / Arbitrum One

Deploy the same Solidity demo stack to Arbitrum Sepolia for integration testing:

```bash
cd /Users/gadgetplug/Documents/vibecoding/warden/packages/contracts
source ../../.env

forge script script/DeployLocal.s.sol:DeployLocal \
  --rpc-url "$ARBITRUM_SEPOLIA_RPC_URL" \
  --private-key "$DEPLOYER_PRIVATE_KEY" \
  --broadcast \
  --verify
```

The Solidity `SlashPool` is the executable reference implementation for the local E2E. The Stylus target is `packages/slash-pool`; run:

```bash
pnpm stylus:check
```

`pnpm stylus:check` defaults activation simulation to Robinhood Chain testnet. Override the endpoint for Arbitrum Sepolia:

```bash
STYLUS_ENDPOINT="$ARBITRUM_SEPOLIA_RPC_URL" pnpm stylus:check
```

Use `WARDEN_SKIP_STYLUS_ACTIVATION=1 pnpm stylus:check` only when an offline WASM build is enough.

Deploy to Arbitrum Sepolia with:

```bash
STYLUS_ENDPOINT="$ARBITRUM_SEPOLIA_RPC_URL" pnpm stylus:deploy
```

`pnpm stylus:deploy` runs Rust tests, builds the WASM, exports the ABI, broadcasts with `cargo stylus deploy`, and writes a durable deployment artifact under `packages/slash-pool/deployments/`.

After deploying a SlashPool, either authorize a known monitor or let the monitor self-register through `MonitorRegistry`.

Authorize a known monitor:

```bash
pnpm monitor:authorize
```

Required `.env` values:

- `WARDEN_DEPLOY_RPC_URL`
- `DEPLOYER_PRIVATE_KEY`
- `WARDEN_SLASH_POOL`
- `WARDEN_MONITOR_ADDRESS`

Self-register a monitor runner through `MonitorRegistry.registerMonitor(paymentReceiver, endpointURI)`. Active registered monitors can submit violation proofs unless suspended by the production owner.

## Post-Deployment Smoke Test

After deployment:

1. Mint or acquire official test TSLA for Sarah.
2. Deposit TSLA into `WARDENVault`.
3. Activate Sarah's signed policy.
4. Execute an allowed daytime trade.
5. Attempt a blocked 01:30 CET trade and confirm `TradingWindowClosed`.
6. Submit the monitor proof to `SlashPool.submitViolation`.
7. Confirm Sarah receives USDG and `AgentIdentityRegistry.violationCount(agentId)` increments.

For the current verified Robinhood deployment, run the safe live blocked-path check:

```bash
cd /Users/gadgetplug/Documents/vibecoding/warden
pnpm status:robinhood
pnpm live:robinhood
```

`status:robinhood` does not need a private key. `live:robinhood` loads `.env` automatically. The default mode activates a fresh policy whose blocked window covers the current and next CET minute, attempts `execute()`, expects `TradingWindowClosed`, and confirms no TSLA moved. Set `WARDEN_LIVE_MODE=allowed` only when intentionally moving a small amount of TSLA through the demo router.

Set `WARDEN_LIVE_SLASH=1` only after the agent wallet has USDG. The script will register the agent identity if needed, stake USDG, submit the violation proof, and verify that stake, beneficiary USDG, and agent reputation changed.

For a monitor-runner flow, start the payment-gated service:

```bash
pnpm monitor:serve
```

`GET /quote` returns the x402-shaped payment quote. `POST /violations` verifies that the `x-payment` header matches the quote, reconciles the payment transaction against ERC-20 `Transfer` logs, then submits the slash transaction. Set `WARDEN_ACCEPT_UNPAID_MONITOR_REQUESTS=1` only for local testing. Set `WARDEN_SKIP_X402_SETTLEMENT_CHECK=1` only for local header-validation demos. The same submit path is available as a CLI:

```bash
pnpm monitor:submit
```

## Current Deployment Boundary

The current Robinhood Solidity deployment recorded in `docs/deployments/robinhood-testnet-46630.md` uses authorized monitors and paused-capable vaults. The repo now includes the production admin, monitor registry, settlement reconciliation, and runbook paths. Retail production still requires external audit, external legal/compliance approval, and live operator setup.
