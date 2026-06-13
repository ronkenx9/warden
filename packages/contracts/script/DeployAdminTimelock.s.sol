// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";

/// @notice Deploys a production admin timelock for WARDEN owner-controlled actions.
/// Required env:
/// - WARDEN_TIMELOCK_MIN_DELAY: delay in seconds.
/// - WARDEN_TIMELOCK_PROPOSER: multisig or governance address allowed to schedule operations.
/// - WARDEN_TIMELOCK_EXECUTOR: executor address; use address(0) only for open execution.
/// - WARDEN_TIMELOCK_ADMIN: temporary admin that can grant/revoke roles during setup.
contract DeployAdminTimelock is Script {
    function run() external returns (TimelockController timelock) {
        uint256 minDelay = vm.envUint("WARDEN_TIMELOCK_MIN_DELAY");
        address proposer = vm.envAddress("WARDEN_TIMELOCK_PROPOSER");
        address executor = vm.envAddress("WARDEN_TIMELOCK_EXECUTOR");
        address admin = vm.envAddress("WARDEN_TIMELOCK_ADMIN");

        address[] memory proposers = new address[](1);
        proposers[0] = proposer;

        address[] memory executors = new address[](1);
        executors[0] = executor;

        vm.startBroadcast();
        timelock = new TimelockController(minDelay, proposers, executors, admin);
        vm.stopBroadcast();
    }
}
