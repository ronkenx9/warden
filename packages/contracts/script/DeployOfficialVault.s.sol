// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {PermissionEngine} from "../src/PermissionEngine.sol";
import {WARDENVault} from "../src/WARDENVault.sol";

/// @notice Deploys an additional single-asset ERC-4626 WARDEN vault.
/// @dev Reuses an existing PermissionEngine so the Robinhood official-token
/// stack can support one vault per stock without redeploying registry/slashing.
///
/// Required env:
/// - WARDEN_ASSET: ERC20 tokenized stock wrapped by the vault.
/// - WARDEN_PERMISSION_ENGINE: existing PermissionEngine address.
/// - WARDEN_VAULT_NAME: ERC4626 share token name.
/// - WARDEN_VAULT_SYMBOL: ERC4626 share token symbol.
contract DeployOfficialVault is Script {
    function run() external returns (WARDENVault vault) {
        address asset = vm.envAddress("WARDEN_ASSET");
        address permissionEngine = vm.envAddress("WARDEN_PERMISSION_ENGINE");
        string memory name = vm.envString("WARDEN_VAULT_NAME");
        string memory symbol = vm.envString("WARDEN_VAULT_SYMBOL");

        vm.startBroadcast();
        vault = new WARDENVault(IERC20(asset), name, symbol, PermissionEngine(permissionEngine));
        vm.stopBroadcast();
    }
}
