// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

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

    function launchCrowdsale(
        uint256 _id,
        bytes memory _implementationData
    ) external onlyDeployer returns (address crowdsaleAddress) {
        IERC20 projectToken;
        uint256 amountAllocation;

        // Debug 1: Check if data is long enough
        require(
            _implementationData.length >= 64,
            "launchCrowdsale: Invalid data length"
        );

        (projectToken, amountAllocation) = abi.decode(
            _implementationData,
            (IERC20, uint256)
        );

        // Debug 2: Check decoded values
        require(
            address(projectToken) != address(0),
            "launchCrowdsale: Token address is zero"
        );
        require(
            amountAllocation > 0,
            "launchCrowdsale: Allocation must be > 0"
        );

        // Debug 3: Check allowance
        uint256 allowance = projectToken.allowance(msg.sender, address(this));
        require(
            allowance >= amountAllocation,
            "launchCrowdsale: Not enough allowance"
        );

        // Debug 4: Check balance
        uint256 balance = projectToken.balanceOf(msg.sender);
        require(
            balance >= amountAllocation,
            "launchCrowdsale: Not enough balance"
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

    function updateLaunchpadFactoryAddress(
        ILaunchpadFactory _launchpadFactory
    ) external onlyAdmin {
        launchpadFactory = _launchpadFactory;
    }

    function addDeployerAddress(address _address) external onlyAdmin {
        grantRole(DEPLOYER_ROLE, _address);
    }

    function removeDeployerAddress(address _address) external onlyAdmin {
        revokeRole(DEPLOYER_ROLE, _address);
    }
}
