#!/usr/bin/env bash
set -euo pipefail

if [[ -d /opt/homebrew/opt/rustup/bin ]]; then
  export PATH="/opt/homebrew/opt/rustup/bin:$PATH"
fi

if ! command -v cargo >/dev/null 2>&1; then
  echo "cargo is not installed. Install Rust 1.88+ before running Stylus verification." >&2
  exit 127
fi

if ! cargo stylus --help >/dev/null 2>&1; then
  echo "cargo-stylus is not installed. Run: cargo install --force cargo-stylus" >&2
  exit 127
fi

cargo test --no-default-features
cargo stylus build --features stylus-contract
cargo stylus export-abi --rust-features export-abi > ISlashPoolStylus.sol

if [[ "${WARDEN_SKIP_STYLUS_ACTIVATION:-}" == "1" ]]; then
  echo "Skipping cargo stylus check activation simulation because WARDEN_SKIP_STYLUS_ACTIVATION=1."
else
  STYLUS_ENDPOINT="${STYLUS_ENDPOINT:-https://rpc.testnet.chain.robinhood.com}"
  echo "Running cargo stylus check activation simulation against $STYLUS_ENDPOINT"
  cargo stylus check --features stylus-contract --endpoint "$STYLUS_ENDPOINT"
fi
