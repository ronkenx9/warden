// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IOwnable2Step {
    function transferOwnership(address newOwner) external;
}

/// @notice Transfers WARDEN admin roles from the deployer to a multisig/timelock.
/// Required env:
/// - WARDEN_PRODUCTION_OWNER: multisig or timelock address.
/// Optional env:
/// - WARDEN_VAULT, WARDEN_AMD_VAULT, WARDEN_AMZN_VAULT, WARDEN_PLTR_VAULT, WARDEN_NFLX_VAULT
/// - WARDEN_SLASH_POOL
/// - WARDEN_TRANSFER_SLASH_POOL_OWNER: true/false, defaults true.
///
/// WARDENVault uses Ownable and transfers immediately.
/// SlashPool uses Ownable2Step in the production contract version; the new owner must call acceptOwnership().
contract TransferProductionOwnership is Script {
    function run() external {
        address productionOwner = vm.envAddress("WARDEN_PRODUCTION_OWNER");
        bool transferSlashPool = vm.envOr("WARDEN_TRANSFER_SLASH_POOL_OWNER", true);

        vm.startBroadcast();

        _transferVault("WARDEN_VAULT", productionOwner);
        _transferVault("WARDEN_AMD_VAULT", productionOwner);
        _transferVault("WARDEN_AMZN_VAULT", productionOwner);
        _transferVault("WARDEN_PLTR_VAULT", productionOwner);
        _transferVault("WARDEN_NFLX_VAULT", productionOwner);

        address slashPool = vm.envOr("WARDEN_SLASH_POOL", address(0));
        if (transferSlashPool && slashPool != address(0)) {
            IOwnable2Step(slashPool).transferOwnership(productionOwner);
        }

        vm.stopBroadcast();
    }

    function _transferVault(string memory envName, address productionOwner) private {
        address vault = vm.envOr(envName, address(0));
        if (vault != address(0)) {
            Ownable(vault).transferOwnership(productionOwner);
        }
    }
}
