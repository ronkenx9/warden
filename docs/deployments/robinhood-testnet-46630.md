# Robinhood Chain Testnet Deployment

Date: 2026-05-23
Chain ID: 46630
RPC used: `https://rpc.testnet.chain.robinhood.com`
Deployer: `0xAdAd6565e19c5d256E1114226735D5496Ab9a627`

## Contracts

| Contract | Address | Transaction |
| --- | --- | --- |
| Mock rTSLA | `0x25bBa65436feab009015EfD620898854d7985B35` | `0x61fb949d8b3b1c7d2c1ceb15527cd2a9d2ef5c9df9996ba1081e65930c844ff4` |
| Mock USDC | `0x797826641C39Eee725B992859feD5133C1669Bd9` | `0xdbaa74a21faf4108366c1612295d4e9bf5e315ad254360c74f81ad96340bfde3` |
| MockRouter | `0x2536c04763Bd886652650663b39ca59dd891B517` | `0x5007dfa46514c5f48b9134c2cafb297bed7935ac0cef7b47af408ae0eab5a774` |
| PermissionEngine | `0xEc56B2CedaEBd163574139624A53588CE301263E` | `0xe41862bea03ab5946348c1b1eca71db3c333dbd17634e938d6f75925bf08abb2` |
| WARDENVault | `0xa2575CC2AB3E18fF8Cbc5B55DeeC26d9B4383E8D` | `0xf0414db5b0f931ba0896a6853f309e5b5e178ce62bb38424aae08785751cdaee` |
| AgentIdentityRegistry | `0xc625C97B46272CB544c303505c8d6468481059c8` | `0x4308340f9598a1fe1e9910d8a992f684b14ca525efeab5737b04deda0dd713df` |
| SlashPool | `0x72508F5fa8Bc2b39c5DE98896cb48E71eFC6576F` | `0x62f682a6cdcd025c090dea374343127b2c7688840759bf31e71b576533d18751` |
| Slash recorder setup | `0xc625C97B46272CB544c303505c8d6468481059c8` | `0xe28d9fdac4ca6c90a731ed13a33171f42d7903710f3d7a8dc82e5fd42e9ac818` |
| Sarah rTSLA mint | `0x25bBa65436feab009015EfD620898854d7985B35` | `0xc434becd6310b35d1500dc457eb3201b19a8d941676c5b27633582a5a2cc07a2` |

## Official Robinhood Token Stack

This is the production-shaped deployment using official Robinhood Chain testnet stock tokens rather than the mock rTSLA contract.

| Contract | Address | Transaction |
| --- | --- | --- |
| Official TSLA token | `0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E` | Robinhood deployment |
| Official USDG token | `0x7E955252E15c84f5768B83c41a71F9eba181802F` | Robinhood deployment |
| PermissionEngine | `0xd63eFdD5F4774f48F678bD9d12A3cE85c758C428` | `0xbf1af82e72b2a8a40fe65a2cf9236ef6409af5abb2f8ad558a86b3b1275a23d4` |
| WARDENVault | `0x5e8b55278FC2c1d0Ddb29A8973Bbba9f5CD55c98` | `0x66d8c77a63dc83e074695fb7182fb6d93d33e91bef135c4f457c0ec019505e62` |
| AgentIdentityRegistry | `0x68c451578B0E70e19A9369146061b5c311387cD3` | `0xc0b2e663e7db05de806cc43654cac332b335a3230d821d426eded7a8eb65e23a` |
| SlashPool | `0xE9F0F8BE0B079d5A910e651aF62A1a3756057Dc8` | `0x4d4e3706386699f36b08136ffdecefedc2257aacf1560801849732dcb8388696` |
| MockRouter | `0x1E1e8528760B310d0b23b32ee9B5a0025a280FF7` | `0xd78151d39af9d8a6586d78881f321b2c3778569b90149d9078adcaa8504f8a4b` |
| Slash recorder setup | `0x68c451578B0E70e19A9369146061b5c311387cD3` | `0x0d701f6d499f515407fdeae6d0086d7edbccb4cc5348e284bf46e605eb60e3b9` |
| TSLA approval | `0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E` | `0x78cf0261b849d81b619dfa4502afbebba1f1a5bb202c8557d11923a826a5e571` |
| 1 TSLA vault deposit | `0x5e8b55278FC2c1d0Ddb29A8973Bbba9f5CD55c98` | `0x86f649ce05e3c3e88e30414626d9d6e204b8b053f7fa7690646a61cdcea2a0a6` |

## Hardened Official Robinhood Token Stack

Date: 2026-06-11
Deployer: `0x6727A665ef9257E2A4e9A4ED58B9136f62b0E1b1`

This deployment uses the authorized-monitor `SlashPool` and env-configurable live scripts.

| Contract / Action | Address | Transaction |
| --- | --- | --- |
| Official TSLA token | `0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E` | Robinhood deployment |
| Official USDG token | `0x7E955252E15c84f5768B83c41a71F9eba181802F` | Robinhood deployment |
| PermissionEngine | `0x049527f5331FaeA8f0e9E86be8FDdCB86BdeE1ba` | `0xccf71234036201eb90477a849c45549f1ee0663430bc04deeca3b2bc0f4b989f` |
| WARDENVault | `0x72E59162C013864AF1e150fbe12e454A99aF7412` | `0x056f4bb445cfe20ac9ff0c2c3126daa1db6d521be4dd33f83d018a91801c388b` |
| AgentIdentityRegistry | `0x4D566c927d0B4d40AcC880b9729d8c5D905867D1` | `0xd3a3e7dd072ecfd21a8d63f21ac04fcb29a13971129d6d6ab15534a524b79fb7` |
| SlashPool | `0x6745b7CE66756085cF1254d2028EB9e3b4407bbE` | `0x5842401dd320d70b16aa099136ce2ec94ab8d41a3cf1a4042bd7739a17983d94` |
| Slash recorder setup | `0x4D566c927d0B4d40AcC880b9729d8c5D905867D1` | `0xbcecca5131a9feddf82b63d00a0ecc7defef1730d1374fe9ace3299ce8c5fbf6` |
| TSLA approval | `0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E` | `0xeeec1ce1ad207dd8078fd6d27e3ff58f5080378e9727b62d03497b07794ff777` |
| 1 TSLA vault deposit | `0x72E59162C013864AF1e150fbe12e454A99aF7412` | `0x800622ee715907dfbae3e5ebf606c84452ecf7d465087d368a531e502cadf523` |
| Policy activation | `0x72E59162C013864AF1e150fbe12e454A99aF7412` | `0x231871ccef52435d2fc7b0a11d050db2a9a2e242842756204cc80f7603668393` |
| Agent identity registration | `0x4D566c927d0B4d40AcC880b9729d8c5D905867D1` | `0xc8d29104c27f0126efd59f5dac43ad1b293b4ed141d3accc55d965b9b14bba82` |
| USDG collateral deposit | `0x6745b7CE66756085cF1254d2028EB9e3b4407bbE` | `0x2272db8bdeb380640421ed88c65cf63df758dca4391caedeea70732ad57ab1fb` |
| Live slash / reputation update | `0x6745b7CE66756085cF1254d2028EB9e3b4407bbE` | `0x4c6f96f76c623d46b0cb53c327067c98acb06b2ca61b7d3e1f9610c0de5c4a92` |

Live proof postconditions from `pnpm status:robinhood` at block `73624453`:

- vault totalAssets: `1 TSLA`
- agent identity id: `1`
- agent violation count: `1`
- agent wallet USDG: `100 USDG`
- SlashPool stake: `0 USDG` after stake and slash
- live slash proof: `0xdfde4926362720f4c4c0d9c7fd4fa7ea17b397ef1230a90ae9f6fda35d6398b4`

Source verification is complete on Robinhood's Blockscout explorer:

- [PermissionEngine](https://explorer.testnet.chain.robinhood.com/address/0xd63efdd5f4774f48f678bd9d12a3ce85c758c428)
- [WARDENVault](https://explorer.testnet.chain.robinhood.com/address/0x5e8b55278fc2c1d0ddb29a8973bbba9f5cd55c98)
- [AgentIdentityRegistry](https://explorer.testnet.chain.robinhood.com/address/0x68c451578b0e70e19a9369146061b5c311387cd3)
- [SlashPool](https://explorer.testnet.chain.robinhood.com/address/0xe9f0f8be0b079d5a910e651af62a1a3756057dc8)
- [MockRouter](https://explorer.testnet.chain.robinhood.com/address/0x1e1e8528760b310d0b23b32ee9b5a0025a280ff7)

## Smoke Reads

- `WARDENVault.asset()` -> `0x25bBa65436feab009015EfD620898854d7985B35`
- `WARDENVault.name()` -> `WARDEN TSLA Vault`
- `SlashPool.collateral()` -> `0x797826641C39Eee725B992859feD5133C1669Bd9`
- `SlashPool.identityRegistry()` -> `0xc625C97B46272CB544c303505c8d6468481059c8`
- Official-token `WARDENVault.asset()` -> `0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E`
- Official-token `WARDENVault.permissionEngine()` -> `0xd63eFdD5F4774f48F678bD9d12A3cE85c758C428`
- Official-token `WARDENVault.totalAssets()` -> `1000000000000000000`
- Official-token `WARDENVault.balanceOf(deployer)` -> `1000000000000000000`
- Official-token `SlashPool.collateral()` -> `0x7E955252E15c84f5768B83c41a71F9eba181802F`
- Official-token `SlashPool.identityRegistry()` -> `0x68c451578B0E70e19A9369146061b5c311387cD3`
- Official-token `AgentIdentityRegistry.slashRecorder()` -> `0xE9F0F8BE0B079d5A910e651aF62A1a3756057Dc8`

## Stylus Check

`STYLUS_ENDPOINT=https://rpc.testnet.chain.robinhood.com pnpm stylus:check` passed native Rust tests, built the 7.7 KB WASM contract, exported `ISlashPoolStylus.sol`, and completed `cargo stylus check` activation validation against Robinhood Chain testnet.

## Stylus Deployment

`pnpm stylus:deploy` broadcast and activated the Rust/Stylus SlashPool on Robinhood Chain testnet using local non-Docker build mode because Docker was unavailable.

| Contract | Address | Transaction |
| --- | --- | --- |
| SlashPoolStylus | `0xb50d8f8eb201124e5e1cea1de2bdb49c6ae513c8` | `0xd4fdf1266b5ebd6c4ef74e6ee473d3986b9af3a529f9998baf16a924c94166dc` |
| Stylus activation | `0xb50d8f8eb201124e5e1cea1de2bdb49c6ae513c8` | `0x2971f26a31e8221e166ed29dbe3f1fb19188d01780dfaaf7aa887e5d45161a8c` |

Deployment artifact: `packages/slash-pool/deployments/stylus-46630.json`.
