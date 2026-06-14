// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title AgentMarketplace
/// @notice v2 bonded-agent marketplace fee layer. Operators list trading agents
///         with a per-use fee (basis points, hard-capped). Renters escrow a fee
///         budget. An authorized router (the vault execution path) records a fee
///         ONLY on an allowed trade — it calls `recordTrade` after
///         `WARDENVault.execute()` succeeds, so a policy-violating trade reverts
///         before any fee is charged. Fees accrue to operators as a pull payment.
///
///         The bond + slashing live in SlashPool; reputation lives in
///         AgentIdentityRegistry. This contract is strictly the fee economy.
///
///         Conservation invariant (always true):
///             feeToken.balanceOf(this) == totalBudget + totalClaimable
contract AgentMarketplace is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint16 public constant MAX_FEE_BPS = 100; // 1.00% hard cap on listing fees
    uint16 public constant BPS_DENOMINATOR = 10_000;

    error FeeTooHigh();
    error NotOperator();
    error UnauthorizedRouter();
    error ListingInactive();
    error InvalidAddress();
    error InvalidAmount();
    error InsufficientBudget();

    struct Listing {
        address operator;
        address asset;
        uint16 feeBps;
        uint256 minBond;
        string strategyURI;
        bool active;
    }

    IERC20 public immutable feeToken;

    mapping(uint256 agentId => Listing) public listings;
    mapping(address router => bool authorized) public authorizedRouters;
    // budgets are scoped per (renter, agent): a renter funds only the agents they
    // choose to rent, so a router can never spend a renter's budget on an agent
    // they didn't opt into.
    mapping(address renter => mapping(uint256 agentId => uint256 amount)) public feeBudget;
    mapping(address operator => uint256 amount) public claimable;

    uint256 public totalBudget;
    uint256 public totalClaimable;

    event RouterAuthorizationSet(address indexed router, bool authorized);
    event Listed(
        uint256 indexed agentId,
        address indexed operator,
        address indexed asset,
        uint16 feeBps,
        uint256 minBond,
        string strategyURI
    );
    event Delisted(uint256 indexed agentId);
    event BudgetDeposited(address indexed renter, uint256 indexed agentId, uint256 amount);
    event BudgetWithdrawn(address indexed renter, uint256 indexed agentId, uint256 amount);
    event FeeAccrued(uint256 indexed agentId, address indexed operator, address indexed renter, uint256 amount);
    event FeesClaimed(address indexed operator, uint256 amount);

    constructor(IERC20 feeToken_) Ownable(msg.sender) {
        if (address(feeToken_) == address(0)) revert InvalidAddress();
        feeToken = feeToken_;
    }

    // --- admin ---

    function setRouterAuthorization(address router, bool authorized) external onlyOwner {
        if (router == address(0)) revert InvalidAddress();
        authorizedRouters[router] = authorized;
        emit RouterAuthorizationSet(router, authorized);
    }

    // --- supply side: operators ---

    function list(uint256 agentId, address asset, uint16 feeBps, uint256 minBond, string calldata strategyURI)
        external
    {
        if (feeBps > MAX_FEE_BPS) revert FeeTooHigh();
        if (asset == address(0)) revert InvalidAddress();
        // bind an agentId to its operator: once claimed, only that operator may
        // (re)list it, so listings can't be hijacked or front-run.
        address current = listings[agentId].operator;
        if (current != address(0) && current != msg.sender) revert NotOperator();
        listings[agentId] =
            Listing({operator: msg.sender, asset: asset, feeBps: feeBps, minBond: minBond, strategyURI: strategyURI, active: true});
        emit Listed(agentId, msg.sender, asset, feeBps, minBond, strategyURI);
    }

    function delist(uint256 agentId) external {
        if (listings[agentId].operator != msg.sender) revert NotOperator();
        listings[agentId].active = false;
        emit Delisted(agentId);
    }

    function claimFees() external nonReentrant returns (uint256 amount) {
        amount = claimable[msg.sender];
        if (amount == 0) revert InvalidAmount();
        claimable[msg.sender] = 0;
        totalClaimable -= amount;
        feeToken.safeTransfer(msg.sender, amount);
        emit FeesClaimed(msg.sender, amount);
    }

    // --- demand side: renters ---

    function depositFeeBudget(uint256 agentId, uint256 amount) external {
        if (amount == 0) revert InvalidAmount();
        feeBudget[msg.sender][agentId] += amount;
        totalBudget += amount;
        feeToken.safeTransferFrom(msg.sender, address(this), amount);
        emit BudgetDeposited(msg.sender, agentId, amount);
    }

    function withdrawFeeBudget(uint256 agentId, uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();
        if (feeBudget[msg.sender][agentId] < amount) revert InsufficientBudget();
        feeBudget[msg.sender][agentId] -= amount;
        totalBudget -= amount;
        feeToken.safeTransfer(msg.sender, amount);
        emit BudgetWithdrawn(msg.sender, agentId, amount);
    }

    // --- execution: router-gated fee recording ---

    /// @notice Charge the listing fee for an ALLOWED trade. Reverts unless called
    ///         by an authorized router. The router calls this only after a
    ///         successful `execute()`, so blocked trades never reach here.
    /// @param tradeValueInFeeToken The trade notional ALREADY denominated in
    ///        fee-token units. The router converts the policy's EUR value to the
    ///        fee token; this contract never mixes decimals.
    /// @return fee The fee moved from the renter's per-agent budget to the operator.
    function recordTrade(uint256 agentId, address renter, uint256 tradeValueInFeeToken)
        external
        returns (uint256 fee)
    {
        if (!authorizedRouters[msg.sender]) revert UnauthorizedRouter();
        Listing memory listing = listings[agentId];
        if (!listing.active) revert ListingInactive();

        fee = (tradeValueInFeeToken * listing.feeBps) / BPS_DENOMINATOR;
        if (fee == 0) return 0;
        if (feeBudget[renter][agentId] < fee) revert InsufficientBudget();

        // move fee from the renter's per-agent budget -> operator claimable (sum preserved)
        feeBudget[renter][agentId] -= fee;
        claimable[listing.operator] += fee;
        // totalBudget and totalClaimable net out: one down, one up by `fee`.
        totalBudget -= fee;
        totalClaimable += fee;

        emit FeeAccrued(agentId, listing.operator, renter, fee);
    }
}
