// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AgentMarketplace} from "../src/AgentMarketplace.sol";

/// @notice Deploys and seeds the WARDEN v2 AgentMarketplace fee layer.
/// Required env:
/// - WARDEN_COLLATERAL: ERC20 fee token, USDG on Robinhood Chain testnet.
/// - WARDEN_MARKETPLACE_ROUTER: authorized post-execute fee router.
///
/// Optional env:
/// - WARDEN_MARKETPLACE_AGENT_ID: first listed agent id, defaults 1.
/// - WARDEN_MARKETPLACE_ASSET: listed asset, defaults WARDEN_ASSET.
/// - WARDEN_MARKETPLACE_FEE_BPS: usage fee, defaults 50 (0.50%).
/// - WARDEN_MARKETPLACE_MIN_BOND: required bond in fee-token units, defaults 100e6.
/// - WARDEN_MARKETPLACE_STRATEGY_URI: metadata URI.
contract DeployAgentMarketplace is Script {
    function run() external returns (AgentMarketplace marketplace) {
        address feeToken = vm.envAddress("WARDEN_COLLATERAL");
        address router = vm.envAddress("WARDEN_MARKETPLACE_ROUTER");
        uint256 agentId = vm.envOr("WARDEN_MARKETPLACE_AGENT_ID", uint256(1));
        address asset = vm.envOr("WARDEN_MARKETPLACE_ASSET", vm.envAddress("WARDEN_ASSET"));
        uint16 feeBps = uint16(vm.envOr("WARDEN_MARKETPLACE_FEE_BPS", uint256(50)));
        uint256 minBond = vm.envOr("WARDEN_MARKETPLACE_MIN_BOND", uint256(100e6));
        string memory strategyURI =
            vm.envOr("WARDEN_MARKETPLACE_STRATEGY_URI", string("warden://yieldagent/tsla-guarded"));

        vm.startBroadcast();
        marketplace = new AgentMarketplace(IERC20(feeToken));
        marketplace.setRouterAuthorization(router, true);
        marketplace.list(agentId, asset, feeBps, minBond, strategyURI);
        vm.stopBroadcast();
    }
}
