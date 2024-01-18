// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

contract MockLaunchpadFactory {
    event CrowdsaleLaunched(address indexed crowdsale);

    address public constant MOCK_CROWDSALE_ADDRESS = address(0x123);

    address public crowdsaleLauncher;

    function setCrowdsaleLauncher(address _crowdsaleLauncher) external {
        crowdsaleLauncher = _crowdsaleLauncher;
    }

    function launchCrowdsale(
        uint256 _id,
        bytes memory _implementationData
    ) external returns (address crowdsaleAddress) {
        require(
            msg.sender == crowdsaleLauncher,
            "LaunchpadFactory: Only launcher"
        );
        emit CrowdsaleLaunched(MOCK_CROWDSALE_ADDRESS);
        return MOCK_CROWDSALE_ADDRESS;
    }
}
