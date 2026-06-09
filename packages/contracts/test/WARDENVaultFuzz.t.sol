// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {PermissionEngine} from "../src/PermissionEngine.sol";
import {PolicyTypes} from "../src/PolicyTypes.sol";
import {WARDENVault} from "../src/WARDENVault.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {MockRouter} from "../src/mocks/MockRouter.sol";

contract WARDENVaultFuzzTest is Test {
    uint256 private constant SARAH_KEY = 0xA11CE;
    uint256 private constant AGENT_KEY = 0xA6E17;

    address private sarah;
    address private agent;

    MockERC20 private tsla;
    MockERC20 private usdc;
    MockRouter private router;
    PermissionEngine private permissionEngine;
    WARDENVault private vault;

    function setUp() public {
        sarah = vm.addr(SARAH_KEY);
        agent = vm.addr(AGENT_KEY);

        tsla = new MockERC20("Robinhood TSLA", "rTSLA", 18);
        usdc = new MockERC20("USD Coin", "USDC", 6);
        router = new MockRouter();
        permissionEngine = new PermissionEngine();
        vault = new WARDENVault(IERC20(address(tsla)), "WARDEN TSLA Vault", "wTSLA", permissionEngine);

        tsla.mint(sarah, 1_000 ether);
        vm.startPrank(sarah);
        tsla.approve(address(vault), 500 ether);
        vault.deposit(500 ether, sarah);
        vm.stopPrank();
    }

    function testFuzzRejectsAnyTradeAbovePolicyLimit(uint256 valueEur, uint256 amountIn) public {
        valueEur = bound(valueEur, 50e18 + 1, type(uint128).max);
        amountIn = bound(amountIn, 1, 100 ether);
        _activatePolicy(1, 50e18, 22 * 60, 6 * 60, 1_800_000_000);

        uint256 vaultBefore = tsla.balanceOf(address(vault));
        uint256 routerBefore = tsla.balanceOf(address(router));

        vm.warp(_cetTimestamp(12, 30));
        vm.prank(agent);
        vm.expectRevert(WARDENVault.TradeValueTooHigh.selector);
        vault.execute(sarah, _trade(valueEur, amountIn));

        assertEq(tsla.balanceOf(address(vault)), vaultBefore);
        assertEq(tsla.balanceOf(address(router)), routerBefore);
    }

    function testFuzzRejectsEveryMinuteInsideMidnightWrappedBlockedWindow(uint16 minuteOfDay) public {
        minuteOfDay = uint16(bound(minuteOfDay, 0, 1_439));
        vm.assume(minuteOfDay >= 22 * 60 || minuteOfDay < 6 * 60);
        _activatePolicy(1, 50e18, 22 * 60, 6 * 60, 1_800_000_000);

        uint256 vaultBefore = tsla.balanceOf(address(vault));

        vm.warp(_timestampForCetMinute(minuteOfDay));
        vm.prank(agent);
        vm.expectRevert(WARDENVault.TradingWindowClosed.selector);
        vault.execute(sarah, _trade(25e18, 1 ether));

        assertEq(tsla.balanceOf(address(vault)), vaultBefore);
    }

    function testFuzzAllowsEveryMinuteOutsideBlockedWindow(uint16 minuteOfDay, uint96 rawAmountIn) public {
        minuteOfDay = uint16(bound(minuteOfDay, 6 * 60, 22 * 60 - 1));
        uint256 amountIn = bound(uint256(rawAmountIn), 1, 5 ether);
        _activatePolicy(1, 50e18, 22 * 60, 6 * 60, 1_800_000_000);

        uint256 routerBefore = tsla.balanceOf(address(router));

        vm.warp(_timestampForCetMinute(minuteOfDay));
        vm.prank(agent);
        vault.execute(sarah, _trade(25e18, amountIn));

        assertEq(tsla.balanceOf(address(router)), routerBefore + amountIn);
    }

    function testFuzzOnlyDelegatedAgentCanExecute(address caller) public {
        vm.assume(caller != agent);
        _activatePolicy(1, 50e18, 22 * 60, 6 * 60, 1_800_000_000);

        uint256 vaultBefore = tsla.balanceOf(address(vault));

        vm.warp(_cetTimestamp(12, 30));
        vm.prank(caller);
        vm.expectRevert(WARDENVault.UnauthorizedAgent.selector);
        vault.execute(sarah, _trade(25e18, 1 ether));

        assertEq(tsla.balanceOf(address(vault)), vaultBefore);
    }

    function _activatePolicy(
        uint256 nonce,
        uint256 maxTradeValueEur,
        uint16 forbiddenStartMinute,
        uint16 forbiddenEndMinute,
        uint256 validUntil
    ) private {
        PolicyTypes.Policy memory policy = PolicyTypes.Policy({
            owner: sarah,
            agent: agent,
            allowedAsset: address(tsla),
            maxTradeValueEur: maxTradeValueEur,
            forbiddenStartMinute: forbiddenStartMinute,
            forbiddenEndMinute: forbiddenEndMinute,
            validUntil: validUntil,
            nonce: nonce
        });
        bytes memory signature = _signPolicy(SARAH_KEY, policy);

        vm.prank(sarah);
        vault.activatePolicy(policy, signature);
    }

    function _trade(uint256 valueEur, uint256 amountIn) private view returns (PolicyTypes.TradeRequest memory) {
        bytes memory data = abi.encodeCall(MockRouter.executeTrade, (address(tsla), amountIn, 0, address(usdc), sarah));

        return PolicyTypes.TradeRequest({
            asset: address(tsla),
            valueEur: valueEur,
            amountIn: amountIn,
            minAmountOut: 0,
            target: address(router),
            data: data
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

    function _timestampForCetMinute(uint16 minuteOfDay) private pure returns (uint256) {
        uint256 utcMinute = (uint256(minuteOfDay) + 1_440 - 60) % 1_440;
        return 1_704_067_200 + utcMinute * 1 minutes;
    }
}
