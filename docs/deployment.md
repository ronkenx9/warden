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

- 27 Foundry tests pass.
- Dashboard production build completes.
- Agent demo prints the allowed and blocked paths.
- Monitor demo prints a valid local proof and `SlashPool.submitViolation` payload.
- Anvil E2E deploys the full stack and executes the agent/slash/reputation flow.
- Stylus Slash Pool native Rust tests pass, WASM builds, and `ISlashPoolStylus.sol` is exported.

## Robinhood Chain Testnet

The official-token deployment is recorded in `docs/deployments/robinhood-testnet-46630.md`. It wraps Robinhood's official TSLA test token and uses USDG as slash collateral.

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

After deploying a SlashPool with monitor authorization enabled, authorize the monitor before it can submit slashes:

```bash
pnpm monitor:authorize
```

Required `.env` values:

- `WARDEN_DEPLOY_RPC_URL`
- `DEPLOYER_PRIVATE_KEY`
- `WARDEN_SLASH_POOL`
- `WARDEN_MONITOR_ADDRESS`

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

`GET /quote` returns the x402-shaped payment quote. `POST /violations` submits a slash transaction after an `x-payment` header is present; set `WARDEN_ACCEPT_UNPAID_MONITOR_REQUESTS=1` only for local testing. The same submit path is available as a CLI:

```bash
pnpm monitor:submit
```

## Current Deployment Gap

The Robinhood Solidity deployment currently recorded in `docs/deployments/robinhood-testnet-46630.md` predates monitor authorization. For a production-candidate deployment, redeploy with `pnpm deploy:official`, authorize a monitor with `pnpm monitor:authorize`, then run live slash through `pnpm live:robinhood:slash` or `pnpm monitor:submit`. The Rust/Stylus SlashPool has a broadcast helper, but production readiness still requires a successful `pnpm stylus:deploy` run and the resulting address artifact.
