// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentIdentityRegistry} from "../src/AgentIdentityRegistry.sol";

contract AgentIdentityRegistryTest is Test {
    address private owner = address(0xA11CE);
    address private buyer = address(0xB0B);

    AgentIdentityRegistry private registry;

    function setUp() public {
        registry = new AgentIdentityRegistry();
    }

    function testRegistersAgentAsTransferableNft() public {
        vm.prank(owner);
        uint256 agentId = registry.register("ipfs://yield-agent");

        assertEq(agentId, 1);
        assertEq(registry.ownerOf(agentId), owner);
        assertEq(registry.tokenURI(agentId), "ipfs://yield-agent");
        assertEq(registry.getAgentWallet(agentId), owner);
    }

    function testOwnerCanUpdateAgentURI() public {
        vm.prank(owner);
        uint256 agentId = registry.register("ipfs://yield-agent-v1");

        vm.prank(owner);
        registry.setAgentURI(agentId, "ipfs://yield-agent-v2");

        assertEq(registry.tokenURI(agentId), "ipfs://yield-agent-v2");
    }

    function testNonOwnerCannotUpdateAgentURI() public {
        vm.prank(owner);
        uint256 agentId = registry.register("ipfs://yield-agent-v1");

        vm.prank(buyer);
        vm.expectRevert(AgentIdentityRegistry.NotAgentOwnerOrOperator.selector);
        registry.setAgentURI(agentId, "ipfs://yield-agent-v2");
    }

    function testMetadataCanBeSetByOwner() public {
        vm.prank(owner);
        uint256 agentId = registry.register("ipfs://yield-agent-v1");

        vm.prank(owner);
        registry.setMetadata(agentId, "strategy", bytes("covered-call"));

        assertEq(registry.getMetadata(agentId, "strategy"), bytes("covered-call"));
    }

    function testReservedAgentWalletMetadataCannotBeSetDirectly() public {
        vm.prank(owner);
        uint256 agentId = registry.register("ipfs://yield-agent-v1");

        vm.prank(owner);
        vm.expectRevert(AgentIdentityRegistry.ReservedMetadataKey.selector);
        registry.setMetadata(agentId, "agentWallet", abi.encode(address(0xCAFE)));
    }

    function testAgentWalletClearsOnTransfer() public {
        vm.prank(owner);
        uint256 agentId = registry.register("ipfs://yield-agent-v1");

        vm.prank(owner);
        registry.transferFrom(owner, buyer, agentId);

        assertEq(registry.ownerOf(agentId), buyer);
        assertEq(registry.getAgentWallet(agentId), address(0));
    }
}
