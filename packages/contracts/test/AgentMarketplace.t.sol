// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {AgentMarketplace} from "../src/AgentMarketplace.sol";
import {PolicyTypes} from "../src/PolicyTypes.sol";
import {PermissionEngine} from "../src/PermissionEngine.sol";
import {WARDENVault} from "../src/WARDENVault.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {MockRouter} from "../src/mocks/MockRouter.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// Router harness: stands in for the production execution path. It calls
/// vault.execute() and, only if that succeeds, records the fee. A blocked trade
/// reverts inside execute(), so recordTrade is never reached.
contract MarketRouterHarness {
    WARDENVault public immutable vault;
    AgentMarketplace public immutable market;

    constructor(WARDENVault vault_, AgentMarketplace market_) {
        vault = vault_;
        market = market_;
    }

    function tradeAndCharge(address owner, PolicyTypes.TradeRequest calldata request, uint256 agentId, address renter)
        external
    {
        vault.execute(owner, request);
        market.recordTrade(agentId, renter, request.valueEur);
    }
}

contract AgentMarketplaceTest is Test {
    uint256 private constant SARAH_KEY = 0xA11CE;

    address private operator = address(0xB0B);
    address private renter;
    address private router = address(0xF00D);

    MockERC20 private usdg;
    AgentMarketplace private market;

    uint256 private constant AGENT_ID = 7;

    function setUp() public {
        renter = vm.addr(SARAH_KEY);
        usdg = new MockERC20("USD Gold", "USDG", 6);
        market = new AgentMarketplace(IERC20(address(usdg)));

        vm.prank(operator);
        market.list(AGENT_ID, address(0xA55E7), 50, 100e6, "ipfs://strategy");

        market.setRouterAuthorization(router, true);

        usdg.mint(renter, 1_000e6);
        vm.startPrank(renter);
        usdg.approve(address(market), type(uint256).max);
        market.depositFeeBudget(AGENT_ID, 500e6);
        vm.stopPrank();
    }

    // --- listing / fee cap / ownership ---

    function testListingAboveFeeCapReverts() public {
        uint16 over = market.MAX_FEE_BPS() + 1; // read before expectRevert (external call)
        vm.prank(operator);
        vm.expectRevert(AgentMarketplace.FeeTooHigh.selector);
        market.list(8, address(0xA55E7), over, 0, "x");
    }

    function testFeeBpsNeverExceedsCap() public view {
        (,, uint16 feeBps,,,) = market.listings(AGENT_ID);
        assertLe(feeBps, market.MAX_FEE_BPS());
    }

    function testCannotHijackAnotherOperatorsListing() public {
        vm.prank(address(0xBAD));
        vm.expectRevert(AgentMarketplace.NotOperator.selector);
        market.list(AGENT_ID, address(0xA55E7), 10, 0, "evil");

        vm.prank(operator);
        market.list(AGENT_ID, address(0xA55E7), 10, 0, "updated");
        (address op,,,,,) = market.listings(AGENT_ID);
        assertEq(op, operator);
    }

    function testOnlyOperatorCanDelist() public {
        vm.prank(address(0xBAD));
        vm.expectRevert(AgentMarketplace.NotOperator.selector);
        market.delist(AGENT_ID);
    }

    // --- router gating ---

    function testRecordTradeOnlyByAuthorizedRouter() public {
        vm.prank(address(0xBAD));
        vm.expectRevert(AgentMarketplace.UnauthorizedRouter.selector);
        market.recordTrade(AGENT_ID, renter, 100e6);
    }

    function testRecordTradeOnInactiveListingReverts() public {
        vm.prank(operator);
        market.delist(AGENT_ID);
        vm.prank(router);
        vm.expectRevert(AgentMarketplace.ListingInactive.selector);
        market.recordTrade(AGENT_ID, renter, 100e6);
    }

    // --- fee math + ledger movement ---

    function testRecordTradeChargesCorrectFeeAndMovesLedger() public {
        vm.prank(router);
        uint256 fee = market.recordTrade(AGENT_ID, renter, 200e6); // 50 bps of 200 = 1
        assertEq(fee, 1e6);
        assertEq(market.feeBudget(renter, AGENT_ID), 500e6 - 1e6);
        assertEq(market.claimable(operator), 1e6);
        _assertConservation();
    }

    function testFuzzFeeMathAndConservation(uint96 value) public {
        vm.assume(value <= 500e6);
        vm.prank(router);
        uint256 fee = market.recordTrade(AGENT_ID, renter, value);
        assertEq(fee, (uint256(value) * 50) / 10_000);
        _assertConservation();
    }

    function testRecordTradeRevertsWhenBudgetTooLow() public {
        vm.prank(renter);
        market.withdrawFeeBudget(AGENT_ID, 500e6);
        vm.prank(router);
        vm.expectRevert(AgentMarketplace.InsufficientBudget.selector);
        market.recordTrade(AGENT_ID, renter, 200e6);
    }

    // --- per-agent budget isolation (the audit fix) ---

    function testBudgetIsScopedPerAgent() public {
        // operator lists a second agent; renter funded ONLY AGENT_ID.
        uint256 OTHER = 99;
        vm.prank(operator);
        market.list(OTHER, address(0xA55E7), 50, 0, "ipfs://other");

        // a router cannot spend the renter's AGENT_ID budget on OTHER
        vm.prank(router);
        vm.expectRevert(AgentMarketplace.InsufficientBudget.selector);
        market.recordTrade(OTHER, renter, 200e6);

        // AGENT_ID budget is untouched
        assertEq(market.feeBudget(renter, AGENT_ID), 500e6);
        assertEq(market.feeBudget(renter, OTHER), 0);
    }

    // --- claim (pull payment) ---

    function testOperatorClaimsExactlyAccrued() public {
        vm.prank(router);
        market.recordTrade(AGENT_ID, renter, 200e6);

        uint256 before = usdg.balanceOf(operator);
        vm.prank(operator);
        uint256 claimed = market.claimFees();
        assertEq(claimed, 1e6);
        assertEq(usdg.balanceOf(operator), before + 1e6);
        assertEq(market.claimable(operator), 0);
        _assertConservation();
    }

    function testDoubleClaimReverts() public {
        vm.prank(router);
        market.recordTrade(AGENT_ID, renter, 200e6);
        vm.prank(operator);
        market.claimFees();
        vm.prank(operator);
        vm.expectRevert(AgentMarketplace.InvalidAmount.selector);
        market.claimFees();
    }

    // --- renter budget withdrawal never trapped ---

    function testRenterCanWithdrawUnusedBudget() public {
        vm.prank(router);
        market.recordTrade(AGENT_ID, renter, 200e6); // spends 1
        uint256 remaining = market.feeBudget(renter, AGENT_ID); // 499
        uint256 before = usdg.balanceOf(renter);
        vm.prank(renter);
        market.withdrawFeeBudget(AGENT_ID, remaining);
        assertEq(usdg.balanceOf(renter), before + remaining);
        assertEq(market.feeBudget(renter, AGENT_ID), 0);
        _assertConservation();
    }

    function testWithdrawAboveBudgetReverts() public {
        vm.prank(renter);
        vm.expectRevert(AgentMarketplace.InsufficientBudget.selector);
        market.withdrawFeeBudget(AGENT_ID, 500e6 + 1);
    }

    // --- conservation across a sequence ---

    function testConservationAcrossSequence() public {
        vm.prank(router);
        market.recordTrade(AGENT_ID, renter, 100e6);
        _assertConservation();
        vm.prank(router);
        market.recordTrade(AGENT_ID, renter, 50e6);
        _assertConservation();
        vm.prank(operator);
        market.claimFees();
        _assertConservation();
        vm.prank(renter);
        market.withdrawFeeBudget(AGENT_ID, 10e6);
        _assertConservation();
    }

    function _assertConservation() private view {
        assertEq(usdg.balanceOf(address(market)), market.totalBudget() + market.totalClaimable());
    }

    // === integration: fee accrues IFF the trade was allowed ===

    function testFeeAccruesOnAllowedTradeButNotOnBlockedTrade() public {
        MockERC20 tsla = new MockERC20("Robinhood TSLA", "rTSLA", 18);
        MockRouter tradeRouter = new MockRouter();
        PermissionEngine engine = new PermissionEngine();
        WARDENVault vault = new WARDENVault(IERC20(address(tsla)), "WARDEN TSLA", "wTSLA", engine);
        MarketRouterHarness harness = new MarketRouterHarness(vault, market);

        vm.prank(operator);
        market.list(AGENT_ID, address(tsla), 50, 0, "ipfs://strategy");
        market.setRouterAuthorization(address(harness), true);

        tsla.mint(renter, 100 ether);
        vm.startPrank(renter);
        tsla.approve(address(vault), 100 ether);
        vault.deposit(100 ether, renter);
        vm.stopPrank();

        PolicyTypes.Policy memory policy = PolicyTypes.Policy({
            owner: renter,
            agent: address(harness),
            allowedAsset: address(tsla),
            maxTradeValueEur: 50e18,
            forbiddenStartMinute: 22 * 60,
            forbiddenEndMinute: 6 * 60,
            validUntil: 1_800_000_000,
            nonce: 1
        });
        bytes memory sig = _signPolicy(SARAH_KEY, engine, policy);
        vm.prank(renter);
        vault.activatePolicy(policy, sig);

        // ample fee budget for AGENT_ID (production router converts notional units)
        usdg.mint(renter, 1e24);
        vm.prank(renter);
        market.depositFeeBudget(AGENT_ID, 1e18);

        vm.warp(_cetTimestamp(12, 30));

        bytes memory data = abi.encodeCall(MockRouter.executeTrade, (address(tsla), 10 ether, 0, address(usdg), renter));
        PolicyTypes.TradeRequest memory ok = PolicyTypes.TradeRequest({
            asset: address(tsla),
            valueEur: 25e18,
            amountIn: 10 ether,
            minAmountOut: 0,
            target: address(tradeRouter),
            data: data
        });
        uint256 budgetBefore = market.feeBudget(renter, AGENT_ID);
        harness.tradeAndCharge(renter, ok, AGENT_ID, renter);
        assertLt(market.feeBudget(renter, AGENT_ID), budgetBefore);
        assertGt(market.claimable(operator), 0);

        uint256 budgetMid = market.feeBudget(renter, AGENT_ID);
        uint256 claimMid = market.claimable(operator);
        PolicyTypes.TradeRequest memory bad = PolicyTypes.TradeRequest({
            asset: address(tsla),
            valueEur: 1_000e18,
            amountIn: 10 ether,
            minAmountOut: 0,
            target: address(tradeRouter),
            data: data
        });
        vm.expectRevert(WARDENVault.TradeValueTooHigh.selector);
        harness.tradeAndCharge(renter, bad, AGENT_ID, renter);

        assertEq(market.feeBudget(renter, AGENT_ID), budgetMid);
        assertEq(market.claimable(operator), claimMid);
    }

    function _signPolicy(uint256 key, PermissionEngine engine, PolicyTypes.Policy memory policy)
        private
        view
        returns (bytes memory)
    {
        bytes32 digest = MessageHashUtils.toTypedDataHash(engine.domainSeparator(), engine.hashPolicy(policy));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, digest);
        return abi.encodePacked(r, s, v);
    }

    function _cetTimestamp(uint256 hour, uint256 minute) private pure returns (uint256) {
        return 1_704_060_000 + ((hour + 23) % 24) * 1 hours + minute * 1 minutes;
    }
}
