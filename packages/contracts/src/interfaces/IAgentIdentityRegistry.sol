// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAgentIdentityRegistry {
    function reputationOf(address agent) external view returns (uint256);
    function recordViolation(address agent, bytes32 violationHash) external;
}
