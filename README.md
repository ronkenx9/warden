# WARDEN

**The agent tried. The vault said no. No funds moved.**

WARDEN is a trustless vault for tokenized stocks. It lets a retail user give an AI agent limited trading authority without trusting the agent's own code to behave.

The user signs one policy. The agent can only act inside the vault. If it breaks the rules, the transaction reverts on-chain before the stock tokens move. A monitor can prove the violation, slash the agent's collateral, and update the agent's permanent reputation.

## Why This Matters

AI agents are starting to touch real financial assets. Today, most products enforce user limits in the agent app itself: the same software that wants to trade is also trusted to decide whether it is allowed to trade.

That is the wrong trust boundary.

WARDEN moves the rulebook into contracts. The agent can be clever, compromised, or careless. It still cannot trade outside the user's policy.

## The Demo

Sarah holds tokenized TSLA on Robinhood Chain testnet.

She sets a simple rule:

- TSLA only
- max 50 EUR per trade
- no trades between 22:00 and 06:00 CET

YieldAgent tries to trade at 01:30 CET.

WARDEN rejects the trade with `TradingWindowClosed()`. No TSLA leaves the vault. A monitor packages the proof, the agent's collateral is slashed, and the agent's reputation records the violation.

## What Is Live

- Official Robinhood Chain testnet vaults for TSLA, AMD, AMZN, PLTR, and NFLX.
- Each official-stock vault is funded with test stock tokens.
- Live Robinhood Chain proof that a blocked TSLA trade reverts before funds move.
- Live slash/reputation proof against the agent identity.
- Rust/Stylus Slash Pool deployed and activated on Robinhood Chain testnet.
- Arbitrum One demo stack deployed with mock stock/collateral assets.
- x402-shaped monitor service with payment-header validation and ERC-20 settlement reconciliation.
- Production hardening path: monitor registry, timelock deploy script, ownership transfer script, emergency pause, and incident runbook.

## The Value Add

**For users:** they can try agent-managed tokenized stock portfolios without giving the agent unlimited power.

**For agents:** good behavior becomes portable reputation, not just a claim on a website.

**For operators:** bad agents have collateral at risk, and monitors can be paid for catching violations.

**For Robinhood Chain and Arbitrum:** WARDEN turns tokenized stocks into safer agentic finance primitives.

## Evidence In Two Minutes

Install once:

```bash
pnpm install
```

Run the main proof gate:

```bash
pnpm verify:submission
```

Read the live Robinhood deployment without a private key:

```bash
pnpm heartbeat:robinhood
```

Run the local narrative demo:

```bash
pnpm demo
```

Open the dashboard:

```bash
pnpm dev
```

Then visit `http://127.0.0.1:5173/`.

## 24/7 Demo Mode

For a safe booth or stream loop, run the read-only heartbeat:

```bash
pnpm heartbeat:robinhood:loop
```

This does not read `.env`, does not use private keys, and does not send transactions. It repeatedly proves the Robinhood deployment is alive, funded, unpaused, and wired to the expected stock tokens, USDG SlashPool, and agent reputation registry.

Use the richer local operator only when you want repeated console demos:

```bash
WARDEN_DEMO_RUN_ONCE=1 pnpm demo:operator
```

Do not loop `live:robinhood`, `live:robinhood:slash`, deploy scripts, admin scripts, or `WARDEN_LIVE_MODE=allowed`; those are transaction-sending commands.

## Track Fit

- **Overall:** consumer-protection infrastructure for tokenized real-world assets.
- **Agentic:** autonomous agents get bounded authority and economic accountability.
- **Stylus:** slashing logic is implemented in Rust/Stylus and deployed on Robinhood Chain testnet.
- **Robinhood Chain:** the primary demo wraps official Robinhood Chain testnet stock tokens.

## Current Claim Boundary

WARDEN is hackathon/demo ready and production-shaped.

It is not a retail production launch until external audit, legal/compliance approval, live timelock ownership transfer, and independent monitor operators are complete.

## Links

- Final submission text: [docs/final-submission.md](docs/final-submission.md)
- Evidence audit: [docs/evidence-audit.md](docs/evidence-audit.md)
- Robinhood deployment: [docs/deployments/robinhood-testnet-46630.md](docs/deployments/robinhood-testnet-46630.md)
- Recording runbook: [docs/recording-runbook.md](docs/recording-runbook.md)
- Production readiness: [docs/production-readiness.md](docs/production-readiness.md)
- Architecture: [docs/architecture.md](docs/architecture.md)
