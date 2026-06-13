# WARDEN Production Readiness Runbook

WARDEN is live-demo ready. This document defines the remaining gates before retail production use.

## Current Production-Candidate Controls

- Paused-capable ERC-4626 vaults are deployed on Robinhood Chain testnet for TSLA, AMD, AMZN, PLTR, and NFLX.
- `pause()` and `unpause()` are `onlyOwner`.
- Pause blocks `activatePolicy` and `execute`.
- Pause does not block ERC-4626 withdrawals, so users can exit during incidents.
- `pnpm status:robinhood` verifies each official-stock vault wraps the expected token, holds a deposit, is unpaused, and is owned by the expected deployer.
- `SlashPool` supports owner-authorized monitors only.

## Production Gates

| Gate | Required Outcome | Current Status |
| --- | --- | --- |
| Independent smart contract audit | Audit report covers `WARDENVault`, `PermissionEngine`, `AgentIdentityRegistry`, `SlashPool`, monitor proof model, and deployment scripts | Open |
| Legal/compliance review | Written scope for retail tokenized-stock agent delegation, custody posture, disclosures, and jurisdictional restrictions | Open |
| Production custody | Deployer key replaced by multisig or institutional custody; no production owner role remains on a laptop `.env` | Open |
| Timelock/admin model | Vault ownership and SlashPool monitor authorization controlled by multisig/timelock with emergency path documented | Open |
| Monitor operations | At least two independently operated monitors, alerting, proof replay checks, and payment/settlement accounting | Open |
| Incident response | Tested pause/unpause, user withdrawal, communications, slash freeze/unfreeze, and postmortem process | Open |
| Observability | Dashboard/alerts for vault TVL, failed executions, policy activations, monitor submissions, slash events, owner actions, and token balances | Open |

## Emergency Procedure

1. Confirm incident signal from monitor, dashboard, explorer, or user report.
2. Snapshot affected vaults, agent wallets, active policies, and latest block.
3. Pause affected vaults with the production owner account.
4. Confirm `paused() == true` for affected vaults.
5. Confirm withdrawals remain available.
6. Disable or revoke compromised monitor/operator authorizations if applicable.
7. Publish user-facing status with affected assets, block range, and withdrawal guidance.
8. Run proof replay and root-cause analysis.
9. Patch, test, audit if needed, then unpause via production owner only after sign-off.

## Commands

No-key health check:

```bash
pnpm status:robinhood
```

Signed environment check:

```bash
pnpm env:robinhood
```

Live blocked/slash proof:

```bash
pnpm live:robinhood:slash
```

## Claim Boundary

Do claim:

- WARDEN has live Robinhood Chain testnet vaults for official TSLA, AMD, AMZN, PLTR, and NFLX.
- The TSLA paused-capable vault has live blocked-execution and slash/reputation proof.
- Emergency pause is implemented, tested, and deployed on the current official-stock vault set.

Do not claim:

- Retail production readiness.
- Audit completion.
- Compliance approval.
- Production custody.
- Fully decentralized monitor-market operation.
- Official Robinhood stock-token support on Arbitrum One.
