// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

interface ILaunchpadFactory {
    function launchCrowdsale(
        uint256 _id,
        bytes memory _implementationData
    ) external returns (address crowdsaleAddress);

    function transferOwnership(address newOwner) external;

    function addImplementation(address _newImplementation) external;

    function updateImplementation(
        uint256 _id,
        address _newImplementation
    ) external;
    function withdrawERC20(IERC20 _token) external;
}
