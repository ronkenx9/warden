// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library PolicyTypes {
    struct Policy {
        address owner;
        address agent;
        address allowedAsset;
        uint256 maxTradeValueEur;
        uint16 forbiddenStartMinute;
        uint16 forbiddenEndMinute;
        uint256 validUntil;
        uint256 nonce;
    }

    struct TradeRequest {
        address asset;
        uint256 valueEur;
        uint256 amountIn;
        uint256 minAmountOut;
        address target;
        bytes data;
    }
}
