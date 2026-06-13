# WARDEN Production Readiness Runbook

WARDEN is hackathon/live-demo ready. This document is the production gate for retail use. A gate is `Implemented` only when repo code or scripts exist and tests cover the behavior. A gate is `External` when completion requires a third party, a regulated business decision, or live operator setup outside this repo.

## Current Production-Candidate Controls

- Paused-capable ERC-4626 vaults are deployed on Robinhood Chain testnet for TSLA, AMD, AMZN, PLTR, and NFLX.
- `pause()` and `unpause()` are `onlyOwner`.
- Pause blocks `activatePolicy` and `execute`.
- Pause does not block ERC-4626 withdrawals, so users can exit during incidents.
- `SlashPool` uses transferable `Ownable2Step` ownership in the production contract version.
- `MonitorRegistry` lets monitor runners self-register endpoint/payment metadata; the owner can suspend abusive runners.
- `SlashPool.submitViolation` accepts either owner-authorized monitors or active registered monitors.
- The x402 monitor service validates exact quote/payment payloads and can reconcile the payment transaction against ERC-20 `Transfer` logs before submitting a proof.
- `pnpm status:robinhood` verifies each official-stock vault wraps the expected token, holds a deposit, is unpaused, and is owned by `WARDEN_EXPECTED_VAULT_OWNER` if set.

## Production Gate Matrix

| Gate | Required outcome | Current status |
| --- | --- | --- |
| Independent smart contract audit | External audit report covers `WARDENVault`, `PermissionEngine`, `AgentIdentityRegistry`, `MonitorRegistry`, `SlashPool`, monitor proof model, and deployment scripts | External signoff required |
| Legal/compliance review | Written approval for retail tokenized-stock agent delegation, custody posture, disclosures, and jurisdictional restrictions | External signoff required |
| Production custody | Vault and SlashPool owners are a multisig/timelock, not the local deployer key | Implemented scripts; live transfer required |
| Timelock/admin model | Admin actions are scheduled through `TimelockController`; SlashPool ownership uses two-step acceptance | Implemented |
| Monitor runner network | Multiple independently operated monitors can register and submit proofs; abusive runners can be suspended | Implemented contract path; live operators required |
| Payment settlement reconciliation | Paid monitor requests verify matching ERC-20 payment transfer before slash submission | Implemented in monitor service |
| Incident response | Pause, withdrawal verification, monitor suspension, slash review, comms, and postmortem process are documented | Implemented runbook |
| Observability | Operators have checks for vault ownership, pause state, token balances, slash readiness, monitor settlement, and Dependabot alerts | Implemented baseline; production alerting provider required |

## Production Custody Procedure

Deploy the timelock:

```bash
export WARDEN_TIMELOCK_MIN_DELAY=86400
export WARDEN_TIMELOCK_PROPOSER=0x<multisig>
export WARDEN_TIMELOCK_EXECUTOR=0x0000000000000000000000000000000000000000
export WARDEN_TIMELOCK_ADMIN=0x<temporary-admin-multisig>
pnpm deploy:timelock
```

Transfer vaults and the production SlashPool:

```bash
export WARDEN_PRODUCTION_OWNER=0x<timelock>
export WARDEN_EXPECTED_VAULT_OWNER=0x<timelock>
pnpm admin:transfer
pnpm status:robinhood
```

Notes:

- Current Robinhood demo vaults use `Ownable`, so vault ownership transfer is immediate.
- The production `SlashPool` uses `Ownable2Step`; the timelock must execute `acceptOwnership()` after `pnpm admin:transfer`.
- The already-deployed demo SlashPool predates transferable ownership. Treat it as demo infrastructure; deploy the new production contract graph before accepting real users.

## Monitor Runner Procedure

1. Runner creates a dedicated monitor key and payment receiver.
2. Runner calls `MonitorRegistry.registerMonitor(paymentReceiver, endpointURI)`.
3. Runner exposes `GET /quote`, `POST /violations`, and `GET /health`.
4. `POST /violations` must require an `x-payment` header unless explicitly in local testing mode.
5. The service must reconcile `x-payment.payload.txHash` against ERC-20 `Transfer` logs to the payment receiver before calling `SlashPool.submitViolation`.
6. Operators monitor `Slashed`, `MonitorRegistered`, and `MonitorSuspensionSet` events.
7. Abuse response is `MonitorRegistry.setSuspended(monitor, true)` through the timelock.

Local command:

```bash
pnpm monitor:serve
```

Production defaults:

- Do not set `WARDEN_ACCEPT_UNPAID_MONITOR_REQUESTS=1`.
- Do not set `WARDEN_SKIP_X402_SETTLEMENT_CHECK=1`.
- Set `WARDEN_X402_MIN_CONFIRMATIONS` to the required finality threshold.
- Set `WARDEN_X402_NETWORK=eip155:46630` for Robinhood Chain testnet.

## Incident Response

1. Confirm incident signal from monitor, dashboard, explorer, or user report.
2. Snapshot affected vaults, agent wallets, active policies, monitor proofs, payment txs, and latest block.
3. Pause affected vaults through the production owner.
4. Confirm `paused() == true` for affected vaults.
5. Confirm ERC-4626 withdrawals remain available.
6. Suspend compromised or abusive monitor runners if applicable.
7. Publish user-facing status with affected assets, block range, and withdrawal guidance.
8. Run proof replay and root-cause analysis.
9. Patch, test, audit if needed, then unpause through the timelock only after sign-off.
10. Publish a postmortem with timeline, impact, fix, and prevention.

## Audit Scope

Audit package:

- `packages/contracts/src/WARDENVault.sol`
- `packages/contracts/src/PermissionEngine.sol`
- `packages/contracts/src/AgentIdentityRegistry.sol`
- `packages/contracts/src/MonitorRegistry.sol`
- `packages/contracts/src/SlashPool.sol`
- `packages/contracts/script/*.s.sol`
- `packages/monitor/src/*.ts`
- `packages/agent/src/live-robinhood.ts`
- `packages/agent/src/status-robinhood.ts`

Minimum audit questions:

- Can a non-delegated caller move funds?
- Can policy limits be bypassed through calldata, time math, asset mismatch, replay, or router behavior?
- Can pause block user withdrawals?
- Can an invalid or unpaid monitor proof slash an agent?
- Can a malicious monitor grief agents or users?
- Are ownership transfers, timelock roles, and monitor suspension controls recoverable?
- Are old demo deployments clearly separated from production deployments?

## Compliance Scope

This repo cannot grant legal approval. Before retail production use, counsel must approve:

- whether WARDEN is custody, brokerage, investment advice, or automated order routing in each target jurisdiction;
- user disclosures for delegated agent authority, slashing, pause controls, and monitoring fees;
- restrictions for EU retail access to tokenized stocks;
- incident communication obligations;
- data retention and privacy treatment for policies, messages, monitor proofs, and agent reputation;
- sanctions, AML, and blocked-user handling for agent/operator/monitor wallets.

## Claim Boundary

Do claim:

- Production custody, monitor registry, settlement reconciliation, and incident runbooks are implemented in the repo.
- The Robinhood testnet demo stack has live official-token vaults and live slash/reputation proof.
- New production deployments can transfer owner roles to a timelock/multisig.

Do not claim until externally complete:

- Independent audit passed.
- Legal/compliance approval granted.
- Retail production readiness.
- A live decentralized monitor marketplace with independent third-party operators is operating.
- The current old demo SlashPool has transferable ownership.
