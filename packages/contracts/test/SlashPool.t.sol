// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentIdentityRegistry} from "../src/AgentIdentityRegistry.sol";
import {SlashPool} from "../src/SlashPool.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";

contract SlashPoolTest is Test {
    address private operator = address(0x0A);
    address private sarah = address(0x5A);
    address private monitor = address(0xBEEF);

    MockERC20 private usdc;
    AgentIdentityRegistry private registry;
    SlashPool private slashPool;

    function setUp() public {
        usdc = new MockERC20("USD Coin", "USDC", 6);
        registry = new AgentIdentityRegistry();
        slashPool = new SlashPool(usdc, registry);
        registry.setSlashRecorder(address(slashPool));
        slashPool.setMonitorAuthorization(monitor, true);

        usdc.mint(operator, 1_000e6);
        vm.prank(operator);
        usdc.approve(address(slashPool), 1_000e6);
    }

    function testOperatorCanStakeUsdcCollateral() public {
        vm.prank(operator);
        slashPool.deposit(500e6);

        assertEq(slashPool.stakeOf(operator), 500e6);
        assertEq(usdc.balanceOf(address(slashPool)), 500e6);
    }

    function testMonitorSlashesOperatorAndUpdatesReputation() public {
        vm.prank(operator);
        uint256 agentId = registry.register("ipfs://yield-agent");

        vm.prank(operator);
        slashPool.deposit(500e6);

        bytes32 proofHash = keccak256("YieldAgent traded at 01:30 CET");

        vm.prank(monitor);
        slashPool.submitViolation(operator, sarah, 100e6, proofHash);

        assertEq(slashPool.stakeOf(operator), 400e6);
        assertEq(usdc.balanceOf(sarah), 100e6);
        assertEq(registry.violationCount(agentId), 1);
        assertEq(registry.violationProof(agentId, 0), proofHash);
    }

    function testRejectsUnauthorizedMonitor() public {
        vm.prank(operator);
        registry.register("ipfs://yield-agent");

        vm.prank(operator);
        slashPool.deposit(500e6);

        vm.prank(address(0xBAD));
        vm.expectRevert(SlashPool.UnauthorizedMonitor.selector);
        slashPool.submitViolation(operator, sarah, 100e6, keccak256("fake proof"));
    }

    function testOwnerCanRevokeMonitor() public {
        slashPool.setMonitorAuthorization(monitor, false);

        vm.prank(operator);
        registry.register("ipfs://yield-agent");

        vm.prank(operator);
        slashPool.deposit(500e6);

        vm.prank(monitor);
        vm.expectRevert(SlashPool.UnauthorizedMonitor.selector);
        slashPool.submitViolation(operator, sarah, 100e6, keccak256("revoked monitor"));
    }

    function testNonOwnerCannotAuthorizeMonitor() public {
        vm.prank(monitor);
        vm.expectRevert(SlashPool.UnauthorizedOwner.selector);
        slashPool.setMonitorAuthorization(address(0xC0FFEE), true);
    }

    function testRejectsDuplicateProof() public {
        vm.prank(operator);
        registry.register("ipfs://yield-agent");

        vm.prank(operator);
        slashPool.deposit(500e6);

        bytes32 proofHash = keccak256("same proof");

        vm.prank(monitor);
        slashPool.submitViolation(operator, sarah, 100e6, proofHash);

        vm.prank(monitor);
        vm.expectRevert(SlashPool.ProofAlreadyUsed.selector);
        slashPool.submitViolation(operator, sarah, 100e6, proofHash);
    }

    function testRejectsSlashAboveStake() public {
        vm.prank(operator);
        registry.register("ipfs://yield-agent");

        vm.prank(operator);
        slashPool.deposit(50e6);

        vm.prank(monitor);
        vm.expectRevert(SlashPool.InsufficientStake.selector);
        slashPool.submitViolation(operator, sarah, 100e6, keccak256("too much"));
    }
}
