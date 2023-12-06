// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

interface ILaunchpadFactory {
    function launchCrowdsale(
        uint256 _id,
        bytes memory _implementationData
    ) external returns (address crowdsaleAddress);
    function transferOwnership(address newOwner) external;
}
