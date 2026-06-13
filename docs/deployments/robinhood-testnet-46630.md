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

## Legacy Official Robinhood Token Stack

This earlier production-shaped deployment used official Robinhood Chain testnet TSLA rather than the mock rTSLA contract. It predates the hardened authorized-monitor stack below. Use the hardened stack as the current source of truth.

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
| Official AMD token | `0x71178BAc73cBeb415514eB542a8995b82669778d` | Robinhood deployment |
| Official TSLA token | `0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E` | Robinhood deployment |
| Official AMZN token | `0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02` | Robinhood deployment |
| Official PLTR token | `0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0` | Robinhood deployment |
| Official NFLX token | `0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93` | Robinhood deployment |
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

Additional official-stock ERC-4626 vaults deployed on 2026-06-13. Each vault reuses the hardened `PermissionEngine` above and holds `1` deposited stock token:

| Stock | Token | Vault | Vault Deploy Tx | Approval Tx | Deposit Tx |
| --- | --- | --- | --- | --- | --- |
| AMD | `0x71178BAc73cBeb415514eB542a8995b82669778d` | `0x1C03E8C2a46a2fEF43eE53dd10341806CC3f9dF2` | `0xb740f1a78c484ae4a7544db3ae80dd5d17182ac9018bd0b3810dfeba6aa00d57` | `0x62d09ee1ed5d47d6f13d12527b85e7091d8d9cc880d360af1093a4cc55d49004` | `0xde66bbe28794be1e3fdb08a6f79383064a7d30226eaff992714bb5a516cc9004` |
| AMZN | `0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02` | `0x1BC9cAE1Fc191f7620BfD1a8463AeF76aD3d8E8F` | `0x3c9b255d6fcffe7a569c843a283e9c01d9a27df17105155828ae5d59e1ca192d` | `0x191c11191394269cb0ef9d0556ab5bf53c4671e88fef71a8beaa5f8455f5f157` | `0xe5422d4a9d3d167b52e5faacd389fa6ef5612632b4739af9282dbb2d63b107aa` |
| PLTR | `0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0` | `0xb11a205E3E1390D33184a7BF6403ef490feFDe4e` | `0x867dee11e25551cde0b1d385c8b5de5edddabe4fca10e00e49328faa57e088de` | `0xbd60decdefb2c4e323bad2ef86b7da1d3877413d434a2d77a135fbde5af39e0e` | `0x54b201cfadc2c1dbfbdf3bdabdb8bef2052cfe1e19818925a7a0d1698887379d` |
| NFLX | `0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93` | `0x4425A1c7561341ce196F3b792c2Cfc6cCbb78603` | `0x266ef5f9e0e38d35b470c98ae1aae80fbc8a113b344bfc1e341470a924dbff26` | `0x65a757e46ea7a427b269b3f2a95b3c8dd04cabef791104f1a86ba670d42d961e` | `0xf1a646a95ef080f21ebe0b58a7cca408f7bc62e732f726208be52863f1940063` |

Live proof postconditions from `pnpm status:robinhood` at block `73624453`:

- vault totalAssets: `1 TSLA`
- additional vault totalAssets: `1 AMD`, `1 AMZN`, `1 PLTR`, `1 NFLX`
- agent identity id: `1`
- agent violation count: `1`
- agent wallet USDG: `100 USDG`
- SlashPool stake: `0 USDG` after stake and slash
- live slash proof: `0xdfde4926362720f4c4c0d9c7fd4fa7ea17b397ef1230a90ae9f6fda35d6398b4`

Source verification is complete on Robinhood's Blockscout explorer:

- [PermissionEngine](https://explorer.testnet.chain.robinhood.com/address/0x049527f5331faea8f0e9e86be8fddcb86bdee1ba)
- [TSLA WARDENVault](https://explorer.testnet.chain.robinhood.com/address/0x72e59162c013864af1e150fbe12e454a99af7412)
- [AgentIdentityRegistry](https://explorer.testnet.chain.robinhood.com/address/0x4d566c927d0b4d40acc880b9729d8c5d905867d1)
- [SlashPool](https://explorer.testnet.chain.robinhood.com/address/0x6745b7ce66756085cf1254d2028eb9e3b4407bbe)
- [Stylus SlashPool](https://explorer.testnet.chain.robinhood.com/address/0xb50d8f8eb201124e5e1cea1de2bdb49c6ae513c8)

## Smoke Reads

- `WARDENVault.asset()` -> `0x25bBa65436feab009015EfD620898854d7985B35`
- `WARDENVault.name()` -> `WARDEN TSLA Vault`
- `SlashPool.collateral()` -> `0x797826641C39Eee725B992859feD5133C1669Bd9`
- `SlashPool.identityRegistry()` -> `0xc625C97B46272CB544c303505c8d6468481059c8`
- Official-token `WARDENVault.asset()` -> `0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E`
- Official-token `WARDENVault.permissionEngine()` -> `0x049527f5331FaeA8f0e9E86be8FDdCB86BdeE1ba`
- Official-token `WARDENVault.totalAssets()` -> `1000000000000000000`
- Official-token `WARDENVault.balanceOf(deployer)` -> `1000000000000000000`
- Official-token `SlashPool.collateral()` -> `0x7E955252E15c84f5768B83c41a71F9eba181802F`
- Official-token `SlashPool.identityRegistry()` -> `0x4D566c927d0B4d40AcC880b9729d8c5D905867D1`
- Official-token `AgentIdentityRegistry.slashRecorder()` -> `0x6745b7CE66756085cF1254d2028EB9e3b4407bbE`

## Stylus Check

`STYLUS_ENDPOINT=https://rpc.testnet.chain.robinhood.com pnpm stylus:check` passed native Rust tests, built the 7.7 KB WASM contract, exported `ISlashPoolStylus.sol`, and completed `cargo stylus check` activation validation against Robinhood Chain testnet.

## Stylus Deployment

`pnpm stylus:deploy` broadcast and activated the Rust/Stylus SlashPool on Robinhood Chain testnet using local non-Docker build mode because Docker was unavailable.

| Contract | Address | Transaction |
| --- | --- | --- |
| SlashPoolStylus | `0xb50d8f8eb201124e5e1cea1de2bdb49c6ae513c8` | `0xd4fdf1266b5ebd6c4ef74e6ee473d3986b9af3a529f9998baf16a924c94166dc` |
| Stylus activation | `0xb50d8f8eb201124e5e1cea1de2bdb49c6ae513c8` | `0x2971f26a31e8221e166ed29dbe3f1fb19188d01780dfaaf7aa887e5d45161a8c` |

Deployment artifact: `packages/slash-pool/deployments/stylus-46630.json`.
