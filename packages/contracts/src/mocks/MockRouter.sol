// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MockRouter {
    using SafeERC20 for IERC20;

    event MockTrade(
        address indexed caller,
        address indexed assetIn,
        uint256 amountIn,
        uint256 minAmountOut,
        address assetOut,
        address beneficiary
    );

    address public lastAssetIn;
    uint256 public lastAmountIn;
    uint256 public lastMinAmountOut;
    address public lastAssetOut;
    address public lastBeneficiary;

    function executeTrade(
        address assetIn,
        uint256 amountIn,
        uint256 minAmountOut,
        address assetOut,
        address beneficiary
    ) external {
        IERC20(assetIn).safeTransferFrom(msg.sender, address(this), amountIn);

        lastAssetIn = assetIn;
        lastAmountIn = amountIn;
        lastMinAmountOut = minAmountOut;
        lastAssetOut = assetOut;
        lastBeneficiary = beneficiary;

        emit MockTrade(msg.sender, assetIn, amountIn, minAmountOut, assetOut, beneficiary);
    }
}
