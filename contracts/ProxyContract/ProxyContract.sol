// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../Interface/ILaunchpadFactory.sol";
import "../library/TransferHelper.sol";

contract ProxyContract is AccessControl {
    ILaunchpadFactory public launchpadFactory;

    bytes32 public constant DEPLOYER_ROLE = keccak256("DEPLOYER");

    constructor(address admin, address launchpadFactoryAddress) {
        // Grant the admin and deployer roles to a specified account
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
        _setupRole(DEPLOYER_ROLE, admin);
        launchpadFactory = ILaunchpadFactory(launchpadFactoryAddress);
    }

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Not the Admin");
        _;
    }

    modifier onlyDeployer() {
        require(hasRole(DEPLOYER_ROLE, msg.sender), "Not the Deployer");
        _;
    }

    function updateOwnerOfLaunchpadFactory(
        address _newOwner
    ) external onlyAdmin {
        launchpadFactory.transferOwnership(_newOwner);
    }

    function launchCrowdsale(
        uint256 _id,
        bytes memory _implementationData
    ) external onlyDeployer returns (address crowdsaleAddress) {
        IERC20 projectToken;
        uint256 amountAllocation;

        (projectToken, amountAllocation) = abi.decode(
            _implementationData,
            (IERC20, uint256)
        );

        require(
            address(projectToken) != address(0),
            "LaunchpadFactory: Cant be Zero address"
        );

        TransferHelper.safeTransferFrom(
            address(projectToken),
            msg.sender,
            address(this),
            amountAllocation
        );
        TransferHelper.safeApprove(
            address(projectToken),
            address(launchpadFactory),
            amountAllocation
        );
        return launchpadFactory.launchCrowdsale(_id, _implementationData);
    }

    function updateImplementation(
        uint256 _id,
        address _newImplementation
    ) external onlyAdmin {
        launchpadFactory.updateImplementation(_id, _newImplementation);
    }

    function addImplementation(address _newImplementation) external onlyAdmin {
        launchpadFactory.addImplementation(_newImplementation);
    }

    function updateLaunchpadFactoryAddress(
        ILaunchpadFactory _launchpadFactory
    ) external onlyAdmin {
        launchpadFactory = _launchpadFactory;
    }

    function withdrawERC20(IERC20 _token) external onlyAdmin {
      launchpadFactory.withdrawERC20()
        TransferHelper.safeTransfer(
            address(_token),
            msg.sender,
            _token.balanceOf(address(this))
        );
    }

    function addDeployerAddress(address _address) external onlyAdmin {
        grantRole(DEPLOYER_ROLE, _address);
    }

    function removeDeployerAddress(address _address) external onlyAdmin {
        revokeRole(DEPLOYER_ROLE, _address);
    }
}
