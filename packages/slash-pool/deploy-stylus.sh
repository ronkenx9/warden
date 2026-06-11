#!/usr/bin/env bash
set -euo pipefail

if [[ -d /opt/homebrew/opt/rustup/bin ]]; then
  export PATH="/opt/homebrew/opt/rustup/bin:$PATH"
fi

if [[ -z "${STYLUS_ENDPOINT:-}" ]]; then
  echo "STYLUS_ENDPOINT is required, for example https://sepolia-rollup.arbitrum.io/rpc" >&2
  exit 2
fi

if [[ -z "${DEPLOYER_PRIVATE_KEY:-}" ]]; then
  echo "DEPLOYER_PRIVATE_KEY is required in the environment; do not commit it." >&2
  exit 2
fi

if ! command -v cargo >/dev/null 2>&1; then
  echo "cargo is not installed. Install Rust 1.88+ before deploying Stylus." >&2
  exit 127
fi

if ! cargo stylus --help >/dev/null 2>&1; then
  echo "cargo-stylus is not installed. Run: cargo install --force cargo-stylus" >&2
  exit 127
fi

mkdir -p deployments

chain_id="$(cast chain-id --rpc-url "$STYLUS_ENDPOINT")"
timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
log_file="deployments/stylus-${chain_id}-$(date -u +"%Y%m%dT%H%M%SZ").log"
abi_file="deployments/ISlashPoolStylus-${chain_id}.sol"

cargo test --no-default-features
cargo stylus build --features stylus-contract
cargo stylus export-abi --rust-features export-abi > "$abi_file"

set +e
cargo stylus deploy \
  --features stylus-contract \
  --endpoint "$STYLUS_ENDPOINT" \
  --private-key "$DEPLOYER_PRIVATE_KEY" | tee "$log_file"
status=${PIPESTATUS[0]}
set -e

if [[ "$status" -ne 0 ]]; then
  echo "Stylus deployment failed; log: $log_file" >&2
  exit "$status"
fi

address="$(awk '/deployed code at address:/ { print $5 }' "$log_file" | tail -n 1)"
tx_hash="$(awk '/deployment tx hash:/ { print $4 }' "$log_file" | tail -n 1)"

if [[ -z "$address" ]]; then
  echo "Stylus deployment completed but no deployed address was parsed; inspect $log_file" >&2
  exit 1
fi

json_file="deployments/stylus-${chain_id}.json"
cat > "$json_file" <<EOF
{
  "contract": "SlashPoolStylus",
  "chainId": ${chain_id},
  "address": "${address}",
  "deploymentTx": "${tx_hash}",
  "endpoint": "${STYLUS_ENDPOINT}",
  "deployedAt": "${timestamp}",
  "abi": "${abi_file}",
  "log": "${log_file}"
}
EOF

echo "Stylus deployment recorded: $json_file"
