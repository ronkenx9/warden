# WARDEN

**Rent a trading agent. Never hand it the keys.**

WARDEN is a trust layer for AI-managed tokenized stock portfolios. A user can rent a bonded trading agent from a marketplace, sign one plain policy, and let the agent operate only inside a vault that enforces the rules on-chain.

If the agent tries to trade outside the policy, the vault reverts before funds move. If a monitor proves the violation, the agent's bond can be slashed and the violation is recorded on its portable reputation.

## Why It Matters

Agentic finance usually puts the trust boundary in the wrong place: the app or agent decides whether it is allowed to act. That is not enough when the assets are tokenized stocks held by retail users.

WARDEN moves the rulebook into contracts:

- users keep custody inside ERC-4626 stock vaults;
- agents only receive scoped delegated authority;
- violations revert in Solidity before execution;
- operators put collateral at risk;
- reputation follows the agent across users and deployments.

## Demo Story

Sarah holds official Robinhood Chain testnet TSLA.

She rents YieldAgent and signs:

- TSLA only
- max 50 EUR per trade
- no trades between 22:00 and 06:00 CET

YieldAgent tries to trade during the blocked window.

`WARDENVault.execute()` reverts with `TradingWindowClosed()`. No TSLA leaves the vault. A monitor packages the proof, `SlashPool` slashes the agent/operator collateral, and the agent's reputation records the violation.

## V2: Bonded Agent Marketplace

WARDEN v1 proved the hard leash: an agent cannot bypass the user's vault policy.

WARDEN v2 turns that into a market:

- agent builders list strategies and stake a bond;
- users rent agents instead of trusting random off-chain code;
- allowed trades can accrue a capped usage fee;
- blocked trades earn nothing;
- bad agents lose collateral and reputation.

The v2 `AgentMarketplace` registry and fee primitive is live on Robinhood Chain testnet and seeded with the YieldAgent TSLA listing.

## What Is Live

- Official Robinhood Chain testnet vaults for TSLA, AMD, AMZN, PLTR, and NFLX.
- Each official-stock vault is funded with test stock tokens.
- Live Robinhood Chain proof that a blocked TSLA trade reverts before funds move.
- Live slash/reputation proof against agent identity id `1`.
- Rust/Stylus Slash Pool deployed and activated on Robinhood Chain testnet.
- AgentMarketplace registry/fee primitive deployed and seeded with YieldAgent TSLA.
- Arbitrum One demo stack deployed with mock stock/collateral assets.
- x402-shaped monitor service with payment-header validation and ERC-20 settlement reconciliation.
- Production hardening path: monitor registry, timelock deploy script, ownership transfer script, emergency pause, and incident runbook.

## Live Contracts

Robinhood Chain testnet, chain id `46630`:

| Contract | Address |
| --- | --- |
| PermissionEngine | `0x049527f5331FaeA8f0e9E86be8FDdCB86BdeE1ba` |
| TSLA WARDENVault | `0x02e658d8F20bbF94d85D0eCC0365Ab4aa5c26Daf` |
| AMD WARDENVault | `0x7f8E3269f6c2DE4394d46c3dacBF12DA21dd2092` |
| AMZN WARDENVault | `0x212f89c78f6E98AB82B76b9b9f3652b48a16526e` |
| PLTR WARDENVault | `0xb7cbF30123382E7d29E127e974b53868a16Aa20d` |
| NFLX WARDENVault | `0xAA976c519485465f299853019AA780AbD47F77F9` |
| AgentIdentityRegistry | `0x4D566c927d0B4d40AcC880b9729d8c5D905867D1` |
| SlashPool | `0x6745b7CE66756085cF1254d2028EB9e3b4407bbE` |
| Stylus SlashPool | `0xb50d8f8eb201124e5e1cea1de2bdb49c6ae513c8` |
| AgentMarketplace | `0x2d7Ccd866849e9806e2C54CF4a904394440e1c6A` |

Official Robinhood Chain testnet tokens:

| Token | Address |
| --- | --- |
| TSLA | `0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E` |
| AMD | `0x71178BAc73cBeb415514eB542a8995b82669778d` |
| AMZN | `0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02` |
| PLTR | `0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0` |
| NFLX | `0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93` |
| USDG | `0x7E955252E15c84f5768B83c41a71F9eba181802F` |

Marketplace seed:

- agent id: `1`
- asset: official TSLA
- fee token: official USDG
- usage fee: `50` bps
- minimum bond: `100000000`
- authorized router: TSLA WARDENVault
- strategy URI: `warden://yieldagent/official-tsla-guarded`

## Run The Evidence

Install once:

```bash
pnpm install
```

Run the non-secret submission gate:

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

## Demo Video

The HTML reel lives at:

```text
packages/dashboard/public/demo.html
```

Render a fresh MP4 from that HTML:

```bash
pnpm demo:video
```

Requires local Chrome and `ffmpeg`; set `CHROME_PATH=/path/to/chrome` if Chrome is not in `/Applications/Google Chrome.app`.

Output:

```text
warden_demo.mp4
```

## 24/7 Demo Mode

For a safe booth or stream loop, run the read-only heartbeat:

```bash
pnpm heartbeat:robinhood:loop
```

This skips `.env`, sends no transactions, and repeatedly proves the Robinhood deployment is alive, funded, unpaused, and wired to the expected stock tokens, USDG SlashPool, agent reputation registry, and marketplace story.

Use the richer local operator only when you want repeated console demos:

```bash
WARDEN_DEMO_RUN_ONCE=1 pnpm demo:operator
```

Do not loop `live:robinhood`, `live:robinhood:slash`, deploy scripts, admin scripts, or `WARDEN_LIVE_MODE=allowed`; those are transaction-sending commands.

## Track Fit

- **Overall:** consumer-protection infrastructure for tokenized real-world assets.
- **Agentic:** autonomous agents get bounded authority, portable reputation, and economic accountability.
- **Stylus:** slashing logic is implemented in Rust/Stylus and deployed on Robinhood Chain testnet.
- **Robinhood Chain:** the primary demo wraps official Robinhood Chain testnet stock tokens.

## Claim Boundary

WARDEN is hackathon/demo ready and production-shaped.

It is not a retail production launch until external audit, legal/compliance approval, live timelock ownership transfer, and independent monitor operators are complete.

## Links

- Final submission text: [docs/final-submission.md](docs/final-submission.md)
- Evidence audit: [docs/evidence-audit.md](docs/evidence-audit.md)
- Robinhood deployment: [docs/deployments/robinhood-testnet-46630.md](docs/deployments/robinhood-testnet-46630.md)
- V2 marketplace PRD: [docs/PRD-v2-marketplace.md](docs/PRD-v2-marketplace.md)
- Recording runbook: [docs/recording-runbook.md](docs/recording-runbook.md)
- Production readiness: [docs/production-readiness.md](docs/production-readiness.md)
- Architecture: [docs/architecture.md](docs/architecture.md)
