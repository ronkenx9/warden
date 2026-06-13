# WARDEN Judge Q&A

Use this for judging calls, README comments, or the project description if space allows. It keeps the answers direct and evidence-backed.

## What problem does WARDEN solve?

WARDEN removes the agent as the policy enforcement point. In most agentic DeFi products, the agent code decides whether it is allowed to act. WARDEN puts the rulebook in `WARDENVault`, so an agent can only execute through a contract that checks the user's signed policy before funds move.

## What is live on Robinhood Chain?

The Solidity WARDEN stack is live on Robinhood Chain testnet:

- `PermissionEngine`: `0x049527f5331FaeA8f0e9E86be8FDdCB86BdeE1ba`
- `TSLA WARDENVault`: `0x02e658d8F20bbF94d85D0eCC0365Ab4aa5c26Daf`
- `AMD WARDENVault`: `0x7f8E3269f6c2DE4394d46c3dacBF12DA21dd2092`
- `AMZN WARDENVault`: `0x212f89c78f6E98AB82B76b9b9f3652b48a16526e`
- `PLTR WARDENVault`: `0xb7cbF30123382E7d29E127e974b53868a16Aa20d`
- `NFLX WARDENVault`: `0xAA976c519485465f299853019AA780AbD47F77F9`
- `AgentIdentityRegistry`: `0x4D566c927d0B4d40AcC880b9729d8c5D905867D1`
- `SlashPool`: `0x6745b7CE66756085cF1254d2028EB9e3b4407bbE`
- `Stylus SlashPool`: `0xb50d8f8eb201124e5e1cea1de2bdb49c6ae513c8`

The vault set wraps official Robinhood Chain testnet TSLA, AMD, AMZN, PLTR, and NFLX. Each vault currently holds `1` deposited stock token.

Each current vault is paused-capable: `pause()` and `unpause()` are owner-only, pause blocks new policy activation and agent execution, and user withdrawals remain available.

## What is the exact user policy?

The Sarah demo policy is:

- allowed asset: official Robinhood TSLA
- max notional: `50 EUR`
- delegated caller: YieldAgent session key
- blocked window: `22:00-06:00 CET`
- expiry and nonce: included in the EIP-712 typed policy

The local tests cover TSLA-only, max notional, delegated caller, expiry, nonce replay, and the midnight-wrapped CET block.

## How do you prove no funds move on a violation?

`WARDENVault.execute()` validates policy before approving or calling the external router. The key test is `testRejectedTradeDoesNotMoveFunds`, and the local E2E also proves the blocked-hours trade reverts with `TradingWindowClosed()`.

For live Robinhood, `pnpm live:robinhood` is the signed proof command. It activates a fresh policy, attempts a blocked `execute()`, expects `TradingWindowClosed`, and checks vault/router TSLA balances remain unchanged.

## What is the slash flow?

Operators stake USDG in `SlashPool`. A monitor submits a unique violation proof hash. `SlashPool.submitViolation()` checks the operator stake, marks the proof used, reduces stake, pays the beneficiary, and calls `AgentIdentityRegistry.recordViolation()`.

Local evidence:

- `testMonitorSlashesOperatorAndUpdatesReputation`
- `pnpm e2e`
- `packages/monitor/src/demo.ts`

Live state:

- watched deployer fallback agent has `100 USDG`
- default slash amount is `100 USDG`
- live slash/reputation proof is already recorded against agent identity id `1`

## Is the live slash already recorded?

Yes. The signed Robinhood proof ran successfully. Current public reads show:

- agent identity id: `1`
- violation count: `2`
- SlashPool stake: `0`
- agent wallet USDG: `100`

The successful signed slash run registered the agent, staked USDG, slashed it, paid the beneficiary, and recorded the violation.

## What is Stylus doing here?

`packages/slash-pool` is the Rust/Stylus version of the slashing state machine. It mirrors the Solidity slashing behavior and gives the project a cheaper/safer Rust implementation path for the Slash Pool primitive.

Current evidence:

- native Rust tests pass
- Stylus WASM builds
- Solidity ABI export exists at `packages/slash-pool/ISlashPoolStylus.sol`
- `cargo stylus check` activation simulation passes against Robinhood Chain testnet
- Stylus SlashPool is deployed and activated at `0xb50d8f8eb201124e5e1cea1de2bdb49c6ae513c8`

## Is WARDEN deployed on Arbitrum One?

Yes, as a mock demo stack on Arbitrum One mainnet. It proves the Solidity primitive set can deploy on Arbitrum One, but it does not wrap official Robinhood stock tokens because those official stock contracts live on Robinhood Chain.

## What does `pnpm verify:submission` prove?

It runs the full non-secret evidence gate:

- 35 Foundry tests
- TypeScript/dashboard builds
- agent demo
- monitor demo
- local Anvil E2E
- Rust/Stylus tests, WASM build, ABI export, Robinhood activation simulation
- public Robinhood preflight

It does not sign live transactions.

## What still needs a private key?

Only repeat signed live proof commands or new deployments:

```bash
pnpm env:robinhood
pnpm live:robinhood
pnpm live:robinhood:slash
```

`pnpm env:robinhood` derives public addresses from the key without printing the key. It should pass before signed live transactions are recorded.

## What should be avoided in the submission?

Do not claim retail production readiness, audited contracts, decentralized monitor-market production operation, or official Robinhood stock support on Arbitrum One.

The defensible claim is: WARDEN is live on Robinhood Chain for the paused-capable Solidity multi-stock vault stack, live slash/reputation proof is recorded, Stylus is deployed/activated on Robinhood Chain, and Arbitrum One has a mock demo stack.
