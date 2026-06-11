# Arbitrum One Deployment

Date: 2026-06-11
Chain ID: 42161
RPC used: `https://arb1.arbitrum.io/rpc`
Deployer: `0x6727A665ef9257E2A4e9A4ED58B9136f62b0E1b1`

This is the Arbitrum One demo stack using mock tokenized stock and collateral tokens. Robinhood's official stock tokens live on Robinhood Chain, so the Arbitrum One deployment uses `DeployLocal.s.sol` for the full WARDEN primitive set.

## Contracts

| Contract / Action | Address | Transaction |
| --- | --- | --- |
| Mock rTSLA | `0x4D566c927d0B4d40AcC880b9729d8c5D905867D1` | `0xf924df06d073bc9b9866a2b951967afd383be3e6d9071921b1e996f200eff1ed` |
| Mock USDC | `0x6745b7CE66756085cF1254d2028EB9e3b4407bbE` | `0x9b136cd6e4153ebb9fdbfd6e2cfe76a40d7e87528a02e5364c3e6be5ae72af38` |
| MockRouter | `0x55081762b22FDD6f3FACa9c1c153397352a9cf63` | `0x7675c858352a81c5f31aa3b0da89ce0c216d1386909ce15e9184797faa2fdb1c` |
| PermissionEngine | `0xE84E97e475d144394c14594c601f7ef4f3CcB01b` | `0xf1e4ce618682ffe278fedb8394aea2323e33c28cb9a7038484bbd816de40c586` |
| WARDENVault | `0x47c97c751e0e3bB788553c892333AeC04D6C369A` | `0x09499709afbedad2ec1dd270c5db9373fbbca34353c7ff4f28b0d40cddf003a3` |
| AgentIdentityRegistry | `0xc787Ab9b59d75705F160142FA4d5318288C84056` | `0x8db0e636960f357f16224a152642fafb24bc33809e00e9f4599358ab85b10802` |
| SlashPool | `0x257Dc7587D3ce3b6A9776C5D8d77382BEF494aaF` | `0x8ebbece7fb964aff11052e7fbb80f128c35d65f8536818e641bc44666cb90469` |
| Slash recorder setup | `0xc787Ab9b59d75705F160142FA4d5318288C84056` | `0xfdae471ee8884fd49870d7ef9c834b56ba6b27b5cc857812aa4209c701a5254c` |
| Sarah rTSLA mint | `0x4D566c927d0B4d40AcC880b9729d8c5D905867D1` | `0x74a7848ee8590fc43ee30b43eb9a53399aeaa4ae42ddd504a948c7b14783d00b` |

## Verification Reads

- `cast code 0x47c97c751e0e3bB788553c892333AeC04D6C369A --rpc-url https://arb1.arbitrum.io/rpc` returned non-empty bytecode.
- `cast code 0x257Dc7587D3ce3b6A9776C5D8d77382BEF494aaF --rpc-url https://arb1.arbitrum.io/rpc` returned non-empty bytecode.
- Deployment receipts are recorded in `packages/contracts/broadcast/DeployLocal.s.sol/42161/run-latest.json`.
