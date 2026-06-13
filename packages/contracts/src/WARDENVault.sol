// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {PermissionEngine} from "./PermissionEngine.sol";
import {PolicyTypes} from "./PolicyTypes.sol";

contract WARDENVault is ERC4626, Ownable, Pausable {
    using SafeERC20 for IERC20;

    error UnauthorizedAgent();
    error PolicyExpired();
    error AssetNotAllowed();
    error TradeValueTooHigh();
    error TradingWindowClosed();
    error InvalidPolicySignature();
    error NonceAlreadyUsed();
    error InvalidPolicy();
    error TradeCallFailed(bytes returndata);

    event PolicyActivated(
        address indexed owner,
        address indexed agent,
        address indexed allowedAsset,
        uint256 maxTradeValueEur,
        uint16 forbiddenStartMinute,
        uint16 forbiddenEndMinute,
        uint256 validUntil,
        uint256 nonce
    );
    event TradeExecuted(
        address indexed owner, address indexed agent, address indexed asset, uint256 valueEur, uint256 amountIn
    );
    event PolicyViolation(address indexed owner, address indexed agent, bytes32 indexed violationHash, bytes4 reason);

    PermissionEngine public immutable permissionEngine;

    mapping(address => PolicyTypes.Policy) private policies;
    mapping(address => mapping(uint256 => bool)) public usedNonces;

    constructor(IERC20 asset_, string memory name_, string memory symbol_, PermissionEngine permissionEngine_)
        ERC4626(asset_)
        ERC20(name_, symbol_)
        Ownable(msg.sender)
    {
        permissionEngine = permissionEngine_;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function activatePolicy(PolicyTypes.Policy calldata policy, bytes calldata signature) external whenNotPaused {
        if (msg.sender != policy.owner || policy.owner == address(0) || policy.agent == address(0)) {
            revert InvalidPolicy();
        }
        if (usedNonces[policy.owner][policy.nonce]) {
            revert NonceAlreadyUsed();
        }
        if (!permissionEngine.verify(policy, signature)) {
            revert InvalidPolicySignature();
        }

        usedNonces[policy.owner][policy.nonce] = true;
        policies[policy.owner] = policy;

        emit PolicyActivated(
            policy.owner,
            policy.agent,
            policy.allowedAsset,
            policy.maxTradeValueEur,
            policy.forbiddenStartMinute,
            policy.forbiddenEndMinute,
            policy.validUntil,
            policy.nonce
        );
    }

    function activePolicy(address owner) external view returns (PolicyTypes.Policy memory) {
        return policies[owner];
    }

    function execute(address owner, PolicyTypes.TradeRequest calldata request)
        external
        whenNotPaused
        returns (bytes memory result)
    {
        PolicyTypes.Policy memory policy = policies[owner];

        if (msg.sender != policy.agent) {
            _reject(owner, WARDENVault.UnauthorizedAgent.selector);
        }
        if (block.timestamp > policy.validUntil) {
            _reject(owner, WARDENVault.PolicyExpired.selector);
        }
        if (request.asset != policy.allowedAsset) {
            _reject(owner, WARDENVault.AssetNotAllowed.selector);
        }
        if (request.valueEur > policy.maxTradeValueEur) {
            _reject(owner, WARDENVault.TradeValueTooHigh.selector);
        }
        if (_isForbiddenMinute(
                _cetMinuteOfDay(block.timestamp), policy.forbiddenStartMinute, policy.forbiddenEndMinute
            )) {
            _reject(owner, WARDENVault.TradingWindowClosed.selector);
        }

        IERC20(request.asset).forceApprove(request.target, request.amountIn);
        (bool ok, bytes memory returndata) = request.target.call(request.data);
        IERC20(request.asset).forceApprove(request.target, 0);
        if (!ok) {
            revert TradeCallFailed(returndata);
        }

        emit TradeExecuted(owner, msg.sender, request.asset, request.valueEur, request.amountIn);
        return returndata;
    }

    function _reject(address owner, bytes4 reason) private {
        bytes32 violationHash = keccak256(abi.encode(owner, msg.sender, reason, block.timestamp, block.number));
        emit PolicyViolation(owner, msg.sender, violationHash, reason);

        if (reason == WARDENVault.UnauthorizedAgent.selector) revert UnauthorizedAgent();
        if (reason == WARDENVault.PolicyExpired.selector) revert PolicyExpired();
        if (reason == WARDENVault.AssetNotAllowed.selector) revert AssetNotAllowed();
        if (reason == WARDENVault.TradeValueTooHigh.selector) revert TradeValueTooHigh();
        if (reason == WARDENVault.TradingWindowClosed.selector) revert TradingWindowClosed();
        revert InvalidPolicy();
    }

    function _cetMinuteOfDay(uint256 timestamp) private pure returns (uint16) {
        return uint16(((timestamp + 1 hours) / 1 minutes) % 1_440);
    }

    function _isForbiddenMinute(uint16 minuteOfDay, uint16 startMinute, uint16 endMinute) private pure returns (bool) {
        if (startMinute == endMinute) {
            return false;
        }
        if (startMinute < endMinute) {
            return minuteOfDay >= startMinute && minuteOfDay < endMinute;
        }
        return minuteOfDay >= startMinute || minuteOfDay < endMinute;
    }
}
