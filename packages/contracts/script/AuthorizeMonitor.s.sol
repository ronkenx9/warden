// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {SlashPool} from "../src/SlashPool.sol";

/// @notice Authorizes or revokes a monitor on a deployed SlashPool.
/// Required env:
/// - WARDEN_SLASH_POOL: deployed SlashPool address.
/// - WARDEN_MONITOR_ADDRESS: monitor EOA/service wallet.
/// Optional env:
/// - WARDEN_MONITOR_AUTHORIZED: true/false, defaults true.
contract AuthorizeMonitor is Script {
    function run() external {
        SlashPool slashPool = SlashPool(vm.envAddress("WARDEN_SLASH_POOL"));
        address monitor = vm.envAddress("WARDEN_MONITOR_ADDRESS");
        bool authorized = vm.envOr("WARDEN_MONITOR_AUTHORIZED", true);

        vm.startBroadcast();
        slashPool.setMonitorAuthorization(monitor, authorized);
        vm.stopBroadcast();
    }
}
