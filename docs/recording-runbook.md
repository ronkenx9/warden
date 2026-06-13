# WARDEN Recording Runbook

Use this runbook when recording the final hackathon demo. It is ordered to prove the strongest claims first without exposing secrets.

## Recording Setup

Open three terminal tabs from the repo root:

```bash
cd /Users/gadgetplug/Documents/vibecoding/warden
```

Recommended tab labels:

- `evidence`
- `live`
- `dashboard`

Keep `.env` private. Do not show `DEPLOYER_PRIVATE_KEY` on screen.

## Tab 1: Non-Secret Evidence Gate

Run:

```bash
pnpm verify:submission
```

Narration:

> This command is the full non-secret evidence gate. It runs Solidity policy tests, TypeScript builds, local demos, local Anvil E2E, Rust/Stylus WASM and activation checks, then reads the live Robinhood deployment without a private key.

Call out these expected proof points:

- `27 tests passed`
- local E2E shows allowed trade, blocked `TradingWindowClosed`, slash, and reputation update
- Stylus check shows `contract size: 7.7 KB` and Robinhood activation simulation
- Robinhood preflight shows:
  - Chain ID `46630`
  - vault asset is official TSLA
  - vault has `1 TSLA`
  - SlashPool collateral is official USDG
  - registry slash recorder is SlashPool
  - watched agent has enough USDG or stake for one live slash

## Tab 2: Live Robinhood Proof

Before recording this section, local `.env` must contain:

```bash
DEPLOYER_PRIVATE_KEY=0x...
```

Do not display the file.

First run the no-key preflight again:

```bash
pnpm preflight:robinhood
```

Then validate local signing setup without displaying secrets:

```bash
pnpm env:robinhood
```

Then run the blocked live proof:

```bash
pnpm live:robinhood
```

Narration:

> The live script signs a fresh EIP-712 policy for the deployed Robinhood TSLA vault. In default `blocked-now` mode it makes the blocked window cover the current CET minute, attempts `execute()`, expects `TradingWindowClosed`, and checks that vault/router TSLA balances did not change.

Then run the funded slash proof:

```bash
pnpm live:robinhood:slash
```

Narration:

> The slash mode registers the agent identity if needed, stakes USDG from the watched agent, submits the violation proof, pays the beneficiary, and verifies that stake, beneficiary USDG, and violation count changed.

Expected first-run side effects:

- agent identity is registered
- `100 USDG` is deposited into SlashPool
- `100 USDG` is slashed to the beneficiary
- agent violation count increments from `0` to `1`

If the first slash run succeeds, do not rerun the same default slash amount unless more USDG is funded or `WARDEN_LIVE_SLASH_AMOUNT` is lowered for another proof.

## Tab 3: Dashboard

Start:

```bash
pnpm dev
```

Open:

```text
http://127.0.0.1:5173/
```

Narration path:

1. Sarah's official TSLA vault and policy rules.
2. YieldAgent attempt at a blocked time.
3. `TradingWindowClosed()` as the policy boundary.
4. x402-shaped monitor proof.
5. SlashPool and agent marketplace reputation as the local E2E/intended outcome; present it as live only after `pnpm live:robinhood:slash` succeeds.
6. Closing invariant: the agent tried, the vault enforced, no funds moved.

## Submission Caveats

Keep these caveats exact until the signed live proof is recorded:

- The Solidity WARDEN stack is live and verified on Robinhood Chain testnet.
- The live vault has `1 TSLA`.
- The watched agent has `100 USDG`, enough for one default live slash.
- Live slash/reputation proof still requires local `DEPLOYER_PRIVATE_KEY`.
- Rust/Stylus Slash Pool is deployed and activated on Robinhood Chain testnet.
- Arbitrum One deployment exists as a mock demo stack; do not claim it wraps official Robinhood stock tokens.

## Closing Script

> WARDEN moves the rulebook on-chain. The agent can try, but it cannot bypass the vault. The vault checked Sarah's rules, rejected the trade, kept TSLA in place, and made the failed attempt slashable.
