// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract MonitorRegistry is Ownable2Step {
    error InvalidMonitor();
    error InvalidEndpoint();

    event MonitorRegistered(address indexed monitor, address indexed paymentReceiver, string endpointURI);
    event MonitorSuspensionSet(address indexed monitor, bool suspended);

    struct Monitor {
        address paymentReceiver;
        string endpointURI;
        bool registered;
        bool suspended;
    }

    mapping(address monitor => Monitor registration) public monitors;

    constructor() Ownable(msg.sender) {}

    function registerMonitor(address paymentReceiver, string calldata endpointURI) external {
        if (paymentReceiver == address(0)) {
            revert InvalidMonitor();
        }
        if (bytes(endpointURI).length == 0) {
            revert InvalidEndpoint();
        }

        monitors[msg.sender] = Monitor({
            paymentReceiver: paymentReceiver,
            endpointURI: endpointURI,
            registered: true,
            suspended: false
        });

        emit MonitorRegistered(msg.sender, paymentReceiver, endpointURI);
    }

    function setSuspended(address monitor, bool suspended) external onlyOwner {
        if (!monitors[monitor].registered) {
            revert InvalidMonitor();
        }
        monitors[monitor].suspended = suspended;
        emit MonitorSuspensionSet(monitor, suspended);
    }

    function isActiveMonitor(address monitor) external view returns (bool) {
        Monitor memory registration = monitors[monitor];
        return registration.registered && !registration.suspended;
    }
}
