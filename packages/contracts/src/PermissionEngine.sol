// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {PolicyTypes} from "./PolicyTypes.sol";

contract PermissionEngine is EIP712 {
    bytes32 public constant POLICY_TYPEHASH = keccak256(
        "Policy(address owner,address agent,address allowedAsset,uint256 maxTradeValueEur,uint16 forbiddenStartMinute,uint16 forbiddenEndMinute,uint256 validUntil,uint256 nonce)"
    );

    constructor() EIP712("WARDEN Permission Engine", "1") {}

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    function hashPolicy(PolicyTypes.Policy memory policy) public pure returns (bytes32) {
        return keccak256(
            abi.encode(
                POLICY_TYPEHASH,
                policy.owner,
                policy.agent,
                policy.allowedAsset,
                policy.maxTradeValueEur,
                policy.forbiddenStartMinute,
                policy.forbiddenEndMinute,
                policy.validUntil,
                policy.nonce
            )
        );
    }

    function digest(PolicyTypes.Policy memory policy) public view returns (bytes32) {
        return _hashTypedDataV4(hashPolicy(policy));
    }

    function recoverSigner(PolicyTypes.Policy memory policy, bytes memory signature) public view returns (address) {
        return ECDSA.recover(digest(policy), signature);
    }

    function verify(PolicyTypes.Policy memory policy, bytes memory signature) external view returns (bool) {
        return recoverSigner(policy, signature) == policy.owner;
    }
}
