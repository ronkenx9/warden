# WARDEN Demo Script

1. Sarah owns tokenized TSLA.
2. Sarah deposits official Robinhood TSLA into WARDEN.
3. Sarah signs one policy: TSLA only, max 50 EUR per trade, no trades from 22:00 through 06:00 CET.
4. YieldAgent executes an allowed daytime trade through the vault.
5. YieldAgent attempts a 01:30 CET trade.
6. Solidity rejects the request with `TradingWindowClosed`; no funds move.
7. A monitor packages the failed-call simulation into a proof hash.
8. `SlashPool` slashes YieldAgent's USDG collateral, pays Sarah, and records the proof on the agent NFT.

## Local Commands

```bash
cd /Users/gadgetplug/Documents/vibecoding/warden
pnpm test
pnpm build
pnpm demo
pnpm e2e
pnpm verify:submission
pnpm dev
```

`pnpm verify:submission` is the full non-secret verification gate for recording prep. It runs tests, builds, demos, local E2E, Stylus check, and Robinhood preflight without requiring `DEPLOYER_PRIVATE_KEY`.

Use `pnpm status:robinhood` as the no-key live deployment check. It reads the official TSLA vault, USDG SlashPool wiring, watched agent identity, watched agent USDG balance, watched agent SlashPool stake, and open collateral status from Robinhood Chain testnet. Set `WARDEN_AGENT_ADDRESS=0x...` to inspect a separate delegated agent wallet.

`pnpm preflight:robinhood` is an alias for the same no-key status check. Run it immediately before `pnpm live:robinhood` so the recording shows funds and contract wiring are ready before any transaction is signed.

## Robinhood Live Command

The live script targets the verified official-token deployment in `docs/deployments/robinhood-testnet-46630.md`.

```bash
cd /Users/gadgetplug/Documents/vibecoding/warden
pnpm live:robinhood
```

The script loads `.env` automatically. Set `DEPLOYER_PRIVATE_KEY` there before running. Default mode is `blocked-now`: it signs a fresh policy for the deployed vault, sets the blocked window to the current and next CET minute, attempts `execute()`, expects `TradingWindowClosed`, and verifies vault/router TSLA balances did not change.

Use `WARDEN_AGENT_PRIVATE_KEY=0x...` to make the delegated agent a separate wallet. Without it, the script falls back to the owner key so the live revert can still be demonstrated from the deployed stack.

Use `WARDEN_LIVE_MODE=allowed` only when you intentionally want to move `0.01 TSLA` through the demo router.

Use `WARDEN_LIVE_SLASH=1` only after the agent wallet has enough USDG. In that mode, the script registers the agent identity if needed, stakes enough USDG, submits the `TradingWindowClosed` violation proof to `SlashPool`, and checks that stake, beneficiary balance, and registry violation count all update.

The test named `testRejectedTradeDoesNotMoveFunds` is the crispest proof line for the demo: the blocked trade reverts and both vault and router balances remain unchanged.

The monitor demo prints an x402-style `402 Payment Required` quote for `/violations/submit`, then creates and verifies a local `TradingWindowClosed` proof hash and the matching `SlashPool.submitViolation` payload.

The E2E demo starts Anvil, deploys the contracts, uses Sarah's typed-data signature, lets YieldAgent call `execute()`, proves the 01:30 CET path reverts, then submits the monitor proof to slash 100 USDC and record reputation.

Open `http://127.0.0.1:5173/` during the video recording to show the dashboard state: Sarah's official TSLA vault, policy checks, blocked trade, monitor proof, slash result, verified Robinhood deployment, and agent marketplace reputation.

Use `docs/submission.md` as the final recording checklist.
