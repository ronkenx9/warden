// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AgentIdentityRegistry} from "../src/AgentIdentityRegistry.sol";
import {PermissionEngine} from "../src/PermissionEngine.sol";
import {SlashPool} from "../src/SlashPool.sol";
import {WARDENVault} from "../src/WARDENVault.sol";

/// @notice Deploys WARDEN against existing token contracts instead of mock assets.
/// Required env:
/// - WARDEN_ASSET: ERC20 tokenized stock wrapped by the vault.
/// - WARDEN_COLLATERAL: ERC20 collateral used by SlashPool.
/// - WARDEN_VAULT_NAME: ERC4626 share token name.
/// - WARDEN_VAULT_SYMBOL: ERC4626 share token symbol.
contract DeployOfficial is Script {
    function run()
        external
        returns (
            PermissionEngine permissionEngine,
            WARDENVault vault,
            AgentIdentityRegistry identityRegistry,
            SlashPool slashPool
        )
    {
        address asset = vm.envAddress("WARDEN_ASSET");
        address collateral = vm.envAddress("WARDEN_COLLATERAL");
        string memory name = vm.envString("WARDEN_VAULT_NAME");
        string memory symbol = vm.envString("WARDEN_VAULT_SYMBOL");

        vm.startBroadcast();

        permissionEngine = new PermissionEngine();
        vault = new WARDENVault(IERC20(asset), name, symbol, permissionEngine);
        identityRegistry = new AgentIdentityRegistry();
        slashPool = new SlashPool(IERC20(collateral), identityRegistry);
        identityRegistry.setSlashRecorder(address(slashPool));

        vm.stopBroadcast();
    }
}
