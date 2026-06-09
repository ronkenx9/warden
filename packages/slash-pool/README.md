# WARDEN Slash Pool

Rust/Stylus slashing contract for the Arbitrum track.

The Solidity `SlashPool.sol` is the executable reference implementation used by the current local E2E. This package mirrors the same state transitions in Rust and exposes Stylus entrypoints for:

- operators deposit collateral
- monitors submit one-use proof hashes
- slashing reduces operator stake
- affected users receive the slashed amount
- invalid amounts, zero beneficiaries, duplicate proofs, and over-slashing are rejected

## Toolchain

The current Arbitrum Stylus quickstart requires:

- Rust 1.88 or newer
- `rustup`, `rustc`, and `cargo`
- `wasm32-unknown-unknown` target
- `cargo install --force cargo-stylus`
- a Stylus-capable RPC endpoint for activation simulation. `verify-stylus.sh` defaults to Robinhood Chain testnet when `STYLUS_ENDPOINT` is unset.

## Commands

```bash
cargo test --no-default-features
cargo install --force cargo-stylus
cargo stylus build --features stylus-contract
cargo stylus export-abi --rust-features export-abi > ISlashPoolStylus.sol
STYLUS_ENDPOINT="$ARBITRUM_SEPOLIA_RPC_URL" cargo stylus check --features stylus-contract --endpoint "$STYLUS_ENDPOINT"
```

From the repo root, `pnpm stylus:check` runs the native tests, WASM build, ABI export, and activation simulation. Set `STYLUS_ENDPOINT` to override the default Robinhood Chain testnet endpoint. Set `WARDEN_SKIP_STYLUS_ACTIVATION=1` only when you need an offline compile check.
