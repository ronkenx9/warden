// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AgentIdentityRegistry} from "../src/AgentIdentityRegistry.sol";
import {PermissionEngine} from "../src/PermissionEngine.sol";
import {SlashPool} from "../src/SlashPool.sol";
import {WARDENVault} from "../src/WARDENVault.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {MockRouter} from "../src/mocks/MockRouter.sol";

contract DeployLocal is Script {
    address public constant SARAH = 0x1111111111111111111111111111111111111111;

    function run()
        external
        returns (
            MockERC20 tsla,
            MockERC20 usdc,
            MockRouter router,
            PermissionEngine permissionEngine,
            WARDENVault vault,
            AgentIdentityRegistry identityRegistry,
            SlashPool slashPool
        )
    {
        vm.startBroadcast();

        tsla = new MockERC20("Robinhood TSLA", "rTSLA", 18);
        usdc = new MockERC20("USD Coin", "USDC", 6);
        router = new MockRouter();
        permissionEngine = new PermissionEngine();
        vault = new WARDENVault(IERC20(address(tsla)), "WARDEN TSLA Vault", "wTSLA", permissionEngine);
        identityRegistry = new AgentIdentityRegistry();
        slashPool = new SlashPool(IERC20(address(usdc)), identityRegistry);
        identityRegistry.setSlashRecorder(address(slashPool));

        tsla.mint(SARAH, 1_000 ether);

        vm.stopBroadcast();
    }
}
