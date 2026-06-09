# WARDEN Live Evidence Snapshot — 2026-06-01

This snapshot records the public Robinhood Chain testnet state read by `pnpm preflight:robinhood` on 2026-06-01. Re-run `pnpm preflight:robinhood` before the final recording because block numbers and balances can change.

## Command

```bash
pnpm preflight:robinhood
```

## Network

| Field | Value |
| --- | --- |
| RPC | `https://rpc.testnet.chain.robinhood.com` |
| Chain ID | `46630` |
| Block | `66216044` |
| Deployer / watched agent | `0xAdAd6565e19c5d256E1114226735D5496Ab9a627` |
| Deployer ETH | `0.01987858024` |

## Vault State

| Field | Value |
| --- | --- |
| Vault | `0x5e8b55278FC2c1d0Ddb29A8973Bbba9f5CD55c98` |
| Vault name | `WARDEN TSLA Vault` |
| Vault asset | `0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E` |
| TSLA token | `Tesla (TSLA)` |
| TSLA decimals | `18` |
| Vault totalAssets | `1 TSLA` |
| Deployer vault shares | `1 wTSLA` |
| Vault TSLA balance | `1 TSLA` |
| Router TSLA balance | `0 TSLA` |

## Slash And Reputation State

| Field | Value |
| --- | --- |
| SlashPool | `0xE9F0F8BE0B079d5A910e651aF62A1a3756057Dc8` |
| Slash collateral | `0x7E955252E15c84f5768B83c41a71F9eba181802F` |
| USDG token | `USDG` |
| USDG decimals | `6` |
| Slash identity registry | `0x68c451578B0E70e19A9369146061b5c311387cD3` |
| Registry slash recorder | `0xE9F0F8BE0B079d5A910e651aF62A1a3756057Dc8` |
| Deployer USDG balance | `100 USDG` |
| SlashPool USDG balance | `0 USDG` |
| Agent identity id | `0` |
| Agent violation count | `0` |
| Agent USDG wallet balance | `100 USDG` |
| Agent SlashPool stake | `0 USDG` |
| Configured live slash amount | `100 USDG` |

## Checks

| Check | Status |
| --- | --- |
| chain id is Robinhood testnet | PASS |
| vault wraps official TSLA | PASS |
| vault has TSLA deposited | PASS |
| slash pool uses official USDG | PASS |
| registry points to slash pool | PASS |
| watched agent has or can fund one live slash | PASS |

## Open Item

The watched agent identity is not registered yet. This is expected: `pnpm live:robinhood:slash` registers it before staking and slashing.

The remaining signed live blocker is local secret setup: set `DEPLOYER_PRIVATE_KEY` in `.env` without displaying or committing it, then run:

```bash
pnpm live:robinhood:slash
```
