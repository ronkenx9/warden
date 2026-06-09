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

`cargo stylus deploy --no-verify --estimate-gas` returned an unusable default deployer estimate of about `784 ETH`, so the Stylus deployment is not broadcast on Robinhood yet. Use an Arbitrum Sepolia Stylus endpoint or confirmed Robinhood Stylus deployer configuration before broadcasting the Rust Slash Pool.
