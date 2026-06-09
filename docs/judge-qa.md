# WARDEN Judge Q&A

Use this for judging calls, README comments, or the project description if space allows. It keeps the answers direct and evidence-backed.

## What problem does WARDEN solve?

WARDEN removes the agent as the policy enforcement point. In most agentic DeFi products, the agent code decides whether it is allowed to act. WARDEN puts the rulebook in `WARDENVault`, so an agent can only execute through a contract that checks the user's signed policy before funds move.

## What is live on Robinhood Chain?

The Solidity WARDEN stack is live and source-verified on Robinhood Chain testnet:

- `PermissionEngine`: `0xd63eFdD5F4774f48F678bD9d12A3cE85c758C428`
- `WARDENVault`: `0x5e8b55278FC2c1d0Ddb29A8973Bbba9f5CD55c98`
- `AgentIdentityRegistry`: `0x68c451578B0E70e19A9369146061b5c311387cD3`
- `SlashPool`: `0xE9F0F8BE0B079d5A910e651aF62A1a3756057Dc8`
- `MockRouter`: `0x1E1e8528760B310d0b23b32ee9B5a0025a280FF7`

The vault wraps official Robinhood Chain testnet TSLA and currently holds `1 TSLA`.

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
- `pnpm live:robinhood:slash` is ready once `DEPLOYER_PRIVATE_KEY` is set locally

## Is the live slash already recorded?

Not yet. Do not claim it as complete until `pnpm live:robinhood:slash` succeeds. Current public reads show:

- agent identity id: `0`
- violation count: `0`
- SlashPool stake: `0`
- agent wallet USDG: `100`

The first successful signed slash run will register the agent, stake USDG, slash it, pay the beneficiary, and record the violation.

## What is Stylus doing here?

`packages/slash-pool` is the Rust/Stylus version of the slashing state machine. It mirrors the Solidity slashing behavior and gives the project a cheaper/safer Rust implementation path for the Slash Pool primitive.

Current evidence:

- native Rust tests pass
- Stylus WASM builds
- Solidity ABI export exists at `packages/slash-pool/ISlashPoolStylus.sol`
- `cargo stylus check` activation simulation passes against Robinhood Chain testnet

The Stylus contract is not broadcast yet. Do not claim a Stylus deployment address unless one is added later.

## Is WARDEN deployed on Arbitrum One?

No Arbitrum One deployment address is recorded. The current live deployment is Robinhood Chain testnet, which is an Arbitrum Orbit chain. The x402 monitor quote uses an Arbitrum-shaped payment flow, and the Stylus package is activation-checked, but the submission should not claim Arbitrum One deployment unless a real address and explorer link are added.

## What does `pnpm verify:submission` prove?

It runs the full non-secret evidence gate:

- 27 Foundry tests
- TypeScript/dashboard builds
- agent demo
- monitor demo
- local Anvil E2E
- Rust/Stylus tests, WASM build, ABI export, Robinhood activation simulation
- public Robinhood preflight

It does not sign live transactions.

## What still needs a private key?

Only the signed live proof commands:

```bash
pnpm env:robinhood
pnpm live:robinhood
pnpm live:robinhood:slash
```

`pnpm env:robinhood` derives public addresses from the key without printing the key. It should pass before signed live transactions are recorded.

## What should be avoided in the submission?

Do not claim:

- live Robinhood slash is already recorded
- Stylus SlashPool is broadcast
- Arbitrum One deployment exists
- dashboard slash/reputation values are live chain data

The defensible claim is: WARDEN is live and verified on Robinhood Chain for the Solidity vault stack, local E2E proves slash/reputation, Stylus activation check passes, and live slash is funded/ready pending local signing.
