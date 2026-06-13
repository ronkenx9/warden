// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {PolicyTypes} from "../src/PolicyTypes.sol";
import {PermissionEngine} from "../src/PermissionEngine.sol";
import {WARDENVault} from "../src/WARDENVault.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {MockRouter} from "../src/mocks/MockRouter.sol";

contract WARDENVaultTest is Test {
    using MessageHashUtils for bytes32;

    uint256 private constant SARAH_KEY = 0xA11CE;
    uint256 private constant AGENT_KEY = 0xA6E17;
    uint256 private constant ATTACKER_KEY = 0xBAD;

    address private sarah;
    address private agent;
    address private attacker;

    MockERC20 private tsla;
    MockERC20 private msft;
    MockERC20 private usdc;
    MockRouter private router;
    PermissionEngine private permissionEngine;
    WARDENVault private vault;

    function setUp() public {
        sarah = vm.addr(SARAH_KEY);
        agent = vm.addr(AGENT_KEY);
        attacker = vm.addr(ATTACKER_KEY);

        tsla = new MockERC20("Robinhood TSLA", "rTSLA", 18);
        msft = new MockERC20("Robinhood MSFT", "rMSFT", 18);
        usdc = new MockERC20("USD Coin", "USDC", 6);
        router = new MockRouter();
        permissionEngine = new PermissionEngine();
        vault = new WARDENVault(IERC20(address(tsla)), "WARDEN TSLA Vault", "wTSLA", permissionEngine);

        tsla.mint(sarah, 1_000 ether);
        msft.mint(address(vault), 1_000 ether);
    }

    function testMockRouterRecordsTrade() public {
        tsla.mint(address(this), 10 ether);
        tsla.approve(address(router), 10 ether);

        router.executeTrade(address(tsla), 10 ether, 9 ether, address(usdc), address(this));

        assertEq(tsla.balanceOf(address(router)), 10 ether);
        assertEq(router.lastAssetIn(), address(tsla));
        assertEq(router.lastAmountIn(), 10 ether);
        assertEq(router.lastMinAmountOut(), 9 ether);
        assertEq(router.lastAssetOut(), address(usdc));
        assertEq(router.lastBeneficiary(), address(this));
    }

    function testPolicySignatureAcceptsOwnerSignature() public view {
        PolicyTypes.Policy memory policy = _defaultPolicy(1);
        bytes memory signature = _signPolicy(SARAH_KEY, policy);

        assertTrue(permissionEngine.verify(policy, signature));
    }

    function testPolicySignatureRejectsWrongSigner() public view {
        PolicyTypes.Policy memory policy = _defaultPolicy(1);
        bytes memory signature = _signPolicy(ATTACKER_KEY, policy);

        assertFalse(permissionEngine.verify(policy, signature));
    }

    function testDepositAndWithdrawShares() public {
        _depositSarah(100 ether);

        assertEq(vault.balanceOf(sarah), 100 ether);
        assertEq(tsla.balanceOf(address(vault)), 100 ether);

        vm.prank(sarah);
        vault.withdraw(40 ether, sarah, sarah);

        assertEq(vault.balanceOf(sarah), 60 ether);
        assertEq(tsla.balanceOf(sarah), 940 ether);
    }

    function testActivatesPolicyWithValidSignature() public {
        PolicyTypes.Policy memory policy = _defaultPolicy(7);
        bytes memory signature = _signPolicy(SARAH_KEY, policy);

        vm.prank(sarah);
        vault.activatePolicy(policy, signature);

        PolicyTypes.Policy memory active = vault.activePolicy(sarah);
        assertEq(active.owner, sarah);
        assertEq(active.agent, agent);
        assertEq(active.allowedAsset, address(tsla));
        assertEq(active.maxTradeValueEur, 50e18);
    }

    function testExecutesAllowedTrade() public {
        _depositSarah(100 ether);
        _activateDefaultPolicy(1);

        PolicyTypes.TradeRequest memory request = _trade(address(tsla), 25e18, 10 ether);

        vm.warp(_cetTimestamp(12, 30));
        vm.prank(agent);
        vault.execute(sarah, request);

        assertEq(tsla.balanceOf(address(router)), 10 ether);
        assertEq(vault.totalAssets(), 90 ether);
    }

    function testOnlyOwnerCanPause() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", attacker));
        vault.pause();

        vault.pause();
        assertTrue(vault.paused());
    }

    function testPausedVaultRejectsPolicyActivation() public {
        PolicyTypes.Policy memory policy = _defaultPolicy(1);
        bytes memory signature = _signPolicy(SARAH_KEY, policy);

        vault.pause();

        vm.prank(sarah);
        vm.expectRevert(abi.encodeWithSignature("EnforcedPause()"));
        vault.activatePolicy(policy, signature);
    }

    function testPausedVaultRejectsAgentExecutionWithoutMovingFunds() public {
        _depositSarah(100 ether);
        _activateDefaultPolicy(1);

        uint256 vaultBefore = tsla.balanceOf(address(vault));
        uint256 routerBefore = tsla.balanceOf(address(router));

        vault.pause();

        vm.warp(_cetTimestamp(12, 30));
        vm.prank(agent);
        vm.expectRevert(abi.encodeWithSignature("EnforcedPause()"));
        vault.execute(sarah, _trade(address(tsla), 25e18, 10 ether));

        assertEq(tsla.balanceOf(address(vault)), vaultBefore);
        assertEq(tsla.balanceOf(address(router)), routerBefore);
    }

    function testPausedVaultStillAllowsUserWithdrawals() public {
        _depositSarah(100 ether);

        vault.pause();

        vm.prank(sarah);
        vault.withdraw(40 ether, sarah, sarah);

        assertEq(vault.balanceOf(sarah), 60 ether);
        assertEq(tsla.balanceOf(sarah), 940 ether);
    }

    function testUnpauseRestoresAgentExecution() public {
        _depositSarah(100 ether);
        _activateDefaultPolicy(1);

        vault.pause();
        vault.unpause();

        vm.warp(_cetTimestamp(12, 30));
        vm.prank(agent);
        vault.execute(sarah, _trade(address(tsla), 25e18, 10 ether));

        assertEq(tsla.balanceOf(address(router)), 10 ether);
        assertEq(vault.totalAssets(), 90 ether);
    }

    function testRejectsUnauthorizedAgent() public {
        _depositSarah(100 ether);
        _activateDefaultPolicy(1);

        PolicyTypes.TradeRequest memory request = _trade(address(tsla), 25e18, 10 ether);

        vm.warp(_cetTimestamp(12, 30));
        vm.prank(attacker);
        vm.expectRevert(WARDENVault.UnauthorizedAgent.selector);
        vault.execute(sarah, request);
    }

    function testRejectsExpiredPolicy() public {
        _depositSarah(100 ether);
        PolicyTypes.Policy memory policy = _defaultPolicy(1);
        policy.validUntil = block.timestamp + 1 days;
        bytes memory signature = _signPolicy(SARAH_KEY, policy);

        vm.prank(sarah);
        vault.activatePolicy(policy, signature);

        vm.warp(policy.validUntil + 1);
        vm.prank(agent);
        vm.expectRevert(WARDENVault.PolicyExpired.selector);
        vault.execute(sarah, _trade(address(tsla), 25e18, 10 ether));
    }

    function testRejectsWrongAsset() public {
        _depositSarah(100 ether);
        _activateDefaultPolicy(1);

        vm.warp(_cetTimestamp(12, 30));
        vm.prank(agent);
        vm.expectRevert(WARDENVault.AssetNotAllowed.selector);
        vault.execute(sarah, _trade(address(msft), 25e18, 10 ether));
    }

    function testRejectsTradeValueAboveLimit() public {
        _depositSarah(100 ether);
        _activateDefaultPolicy(1);

        vm.warp(_cetTimestamp(12, 30));
        vm.prank(agent);
        vm.expectRevert(WARDENVault.TradeValueTooHigh.selector);
        vault.execute(sarah, _trade(address(tsla), 51e18, 10 ether));
    }

    function testRejectsBlockedCETWindow() public {
        _depositSarah(100 ether);
        _activateDefaultPolicy(1);

        vm.warp(_cetTimestamp(1, 30));
        vm.prank(agent);
        vm.expectRevert(WARDENVault.TradingWindowClosed.selector);
        vault.execute(sarah, _trade(address(tsla), 25e18, 10 ether));
    }

    function testRejectedTradeDoesNotMoveFunds() public {
        _depositSarah(100 ether);
        _activateDefaultPolicy(1);

        uint256 vaultBefore = tsla.balanceOf(address(vault));
        uint256 routerBefore = tsla.balanceOf(address(router));

        vm.warp(_cetTimestamp(1, 30));
        vm.prank(agent);
        vm.expectRevert(WARDENVault.TradingWindowClosed.selector);
        vault.execute(sarah, _trade(address(tsla), 25e18, 10 ether));

        assertEq(tsla.balanceOf(address(vault)), vaultBefore);
        assertEq(tsla.balanceOf(address(router)), routerBefore);
    }

    function testRejectsReusedNonce() public {
        PolicyTypes.Policy memory policy = _defaultPolicy(3);
        bytes memory signature = _signPolicy(SARAH_KEY, policy);

        vm.prank(sarah);
        vault.activatePolicy(policy, signature);

        vm.prank(sarah);
        vm.expectRevert(WARDENVault.NonceAlreadyUsed.selector);
        vault.activatePolicy(policy, signature);
    }

    function _depositSarah(uint256 amount) private {
        vm.startPrank(sarah);
        tsla.approve(address(vault), amount);
        vault.deposit(amount, sarah);
        vm.stopPrank();
    }

    function _activateDefaultPolicy(uint256 nonce) private {
        PolicyTypes.Policy memory policy = _defaultPolicy(nonce);
        bytes memory signature = _signPolicy(SARAH_KEY, policy);

        vm.prank(sarah);
        vault.activatePolicy(policy, signature);
    }

    function _defaultPolicy(uint256 nonce) private view returns (PolicyTypes.Policy memory) {
        return PolicyTypes.Policy({
            owner: sarah,
            agent: agent,
            allowedAsset: address(tsla),
            maxTradeValueEur: 50e18,
            forbiddenStartMinute: 22 * 60,
            forbiddenEndMinute: 6 * 60,
            validUntil: 1_800_000_000,
            nonce: nonce
        });
    }

    function _trade(address asset, uint256 valueEur, uint256 amountIn)
        private
        view
        returns (PolicyTypes.TradeRequest memory)
    {
        bytes memory data = abi.encodeCall(MockRouter.executeTrade, (asset, amountIn, 0, address(usdc), sarah));

        return PolicyTypes.TradeRequest({
            asset: asset, valueEur: valueEur, amountIn: amountIn, minAmountOut: 0, target: address(router), data: data
        });
    }

    function _signPolicy(uint256 privateKey, PolicyTypes.Policy memory policy) private view returns (bytes memory) {
        bytes32 digest =
            MessageHashUtils.toTypedDataHash(permissionEngine.domainSeparator(), permissionEngine.hashPolicy(policy));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        return abi.encodePacked(r, s, v);
    }

    function _cetTimestamp(uint256 hour, uint256 minute) private pure returns (uint256) {
        return 1_704_060_000 + ((hour + 23) % 24) * 1 hours + minute * 1 minutes;
    }
}
