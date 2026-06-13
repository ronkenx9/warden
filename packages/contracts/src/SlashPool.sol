// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {AgentIdentityRegistry} from "./AgentIdentityRegistry.sol";
import {MonitorRegistry} from "./MonitorRegistry.sol";

contract SlashPool is Ownable2Step {
    using SafeERC20 for IERC20;

    error UnauthorizedMonitor();
    error InsufficientStake();
    error ProofAlreadyUsed();
    error InvalidAmount();
    error InvalidRecipient();

    event MonitorAuthorizationSet(address indexed monitor, bool authorized);
    event Staked(address indexed operator, uint256 amount);
    event Slashed(
        address indexed operator,
        address indexed beneficiary,
        address indexed monitor,
        uint256 amount,
        bytes32 proofHash
    );

    IERC20 public immutable collateral;
    AgentIdentityRegistry public immutable identityRegistry;
    MonitorRegistry public immutable monitorRegistry;

    mapping(address monitor => bool authorized) public authorizedMonitors;
    mapping(address operator => uint256 amount) public stakeOf;
    mapping(bytes32 proofHash => bool used) public usedProofs;

    constructor(IERC20 collateral_, AgentIdentityRegistry identityRegistry_, MonitorRegistry monitorRegistry_)
        Ownable(msg.sender)
    {
        collateral = collateral_;
        identityRegistry = identityRegistry_;
        monitorRegistry = monitorRegistry_;
        authorizedMonitors[msg.sender] = true;
        emit MonitorAuthorizationSet(msg.sender, true);
    }

    function setMonitorAuthorization(address monitor, bool authorized) external onlyOwner {
        if (monitor == address(0)) {
            revert InvalidRecipient();
        }
        authorizedMonitors[monitor] = authorized;
        emit MonitorAuthorizationSet(monitor, authorized);
    }

    function deposit(uint256 amount) external {
        if (amount == 0) {
            revert InvalidAmount();
        }

        stakeOf[msg.sender] += amount;
        collateral.safeTransferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);
    }

    function submitViolation(address operator, address beneficiary, uint256 amount, bytes32 proofHash) external {
        if (!_canSubmit(msg.sender)) {
            revert UnauthorizedMonitor();
        }
        if (amount == 0) {
            revert InvalidAmount();
        }
        if (beneficiary == address(0)) {
            revert InvalidRecipient();
        }
        if (usedProofs[proofHash]) {
            revert ProofAlreadyUsed();
        }
        if (stakeOf[operator] < amount) {
            revert InsufficientStake();
        }

        usedProofs[proofHash] = true;
        stakeOf[operator] -= amount;
        identityRegistry.recordViolation(operator, proofHash);
        collateral.safeTransfer(beneficiary, amount);

        emit Slashed(operator, beneficiary, msg.sender, amount, proofHash);
    }

    function _canSubmit(address monitor) private view returns (bool) {
        if (authorizedMonitors[monitor]) {
            return true;
        }
        if (address(monitorRegistry) == address(0)) {
            return false;
        }
        return monitorRegistry.isActiveMonitor(monitor);
    }
}
