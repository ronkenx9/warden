// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISlashPool {
    function slash(address agent, address beneficiary, uint256 amount, bytes32 violationHash) external;
}
