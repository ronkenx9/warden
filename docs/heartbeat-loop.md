# WARDEN 24/7 Demo Heartbeat

Use this for a booth screen, stream overlay, or background terminal that proves WARDEN is live without sending transactions.

## Safe Loop

```bash
pnpm heartbeat:robinhood:loop
```

The loop:

- skips `.env` with `WARDEN_SKIP_DOTENV=1`;
- uses public RPC reads only;
- logs to `logs/warden-heartbeat.log`;
- checks Robinhood Chain ID, latest block, official stock vault deposits, pause state, vault owners, USDG SlashPool wiring, registry wiring, watched agent reputation, and slash readiness;
- sleeps 300 seconds by default.

Set a different interval:

```bash
WARDEN_HEARTBEAT_INTERVAL_SECONDS=60 pnpm heartbeat:robinhood:loop
```

Run once:

```bash
pnpm heartbeat:robinhood
```

## What Not To Loop

Do not run these as a 24/7 loop:

- `pnpm live:robinhood`
- `pnpm live:robinhood:slash`
- `WARDEN_LIVE_MODE=allowed pnpm live:robinhood`
- `pnpm deploy:*`
- `pnpm admin:transfer`
- `pnpm monitor:authorize`
- `pnpm stylus:deploy`

Those commands can use private keys, activate policies, submit slashes, move stock tokens, deploy contracts, or change admin state.

## Rich Local Demo Operator

For a fuller console demo that repeats the narrative and monitor proof packet, use:

```bash
WARDEN_DEMO_RUN_ONCE=1 pnpm demo:operator
```

Without `WARDEN_DEMO_RUN_ONCE=1`, it repeats every 15 minutes by default:

```bash
pnpm demo:operator
```

Optional heavier local proofs:

```bash
WARDEN_DEMO_HEAVY_LOCAL_PROOFS=1 pnpm demo:operator
```

This adds local E2E and swarm proofs. It still avoids live Robinhood transactions.
