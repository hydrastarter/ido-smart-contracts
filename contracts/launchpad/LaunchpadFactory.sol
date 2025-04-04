// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../library/CloneBase.sol";
import "../Interface/IMinimalProxy.sol";
import "../library/TransferHelper.sol";

contract LaunchpadFactory is Ownable, CloneBase {
    using SafeMath for uint256;

    /// @notice All the information for this crowdsale in one struct
    struct CrowdsaleInfo {
        IERC20 projectToken;
        address crowdsaleAddress;
        address owner;
    }

    /// @notice Mapping from the implementation ID to implementation address.
    mapping(uint256 => address) public implementationIdVsImplementation;

    /// @notice Saving addresses of all created crowdsales.
    CrowdsaleInfo[] public crowdsales;

    /// @notice Counter for saving implementation IDs
    uint256 public nextId;

    /// @notice Authorized address to launch crowdsales
    address public crowdsaleLauncher;

    event CrowdsaleLaunched(
        uint256 indexed id,
        address indexed crowdsaleAddress,
        IERC20 indexed token
    );

    event CrowdsaleLauncherUpdated(address newCrowdsaleLauncher);

    event ImplementationAdded(uint256 id, address newImplementation);

    event ImplementationUpdated(uint256 id, address updatedImplementation);

    /// @notice Sets crowdsale launcher address.
    /// @dev Address zero allowed for disabling crowdsale launcher.
    /// @param _crowdsaleLauncher The address of the new crowdsale launcher.
    function setCrowdsaleLauncher(
        address _crowdsaleLauncher
    ) external onlyOwner {
        crowdsaleLauncher = _crowdsaleLauncher;
        emit CrowdsaleLauncherUpdated(_crowdsaleLauncher);
    }

    /// @notice Adds a new implementation with the given address.
    /// @param _newImplementation The address of the new implementation.
    function addImplementation(address _newImplementation) external onlyOwner {
        require(
            _newImplementation != address(0),
            "LaunchpadFactory: Invalid implementation"
        );
        implementationIdVsImplementation[nextId] = _newImplementation;
        nextId = nextId.add(1);
        emit ImplementationAdded(nextId, _newImplementation);
    }

    /// @notice Updates an existing implementation at the specified ID with the provided new address.
    /// @param _id The ID of the existing implementation to update.
    /// @param _newImplementation The address of the new implementation to replace the existing one.
    function updateImplementation(
        uint256 _id,
        address _newImplementation
    ) external onlyOwner {
        address currentImplementation = implementationIdVsImplementation[_id];
        require(
            currentImplementation != address(0),
            "LaunchpadFactory: Incorrect Id"
        );
        implementationIdVsImplementation[_id] = _newImplementation;
        emit ImplementationUpdated(_id, _newImplementation);
    }

    /// @notice Launches a new crowdsale using the specified implementation ID and encoded data.
    /// @param _id Implementation id.
    /// @param _implementationData Encoded data required for launching the crowdsale.
    /// @return crowdsaleAddress The address of the newly launched crowdsale
    function launchCrowdsale(
        uint256 _id,
        bytes memory _implementationData
    ) external returns (address crowdsaleAddress) {
        require(
            msg.sender == crowdsaleLauncher,
            "LaunchpadFactory: Only launcher"
        );

        crowdsaleAddress = _launchCrowdsale(_id, _implementationData);
    }

    /// @notice It is used to withdraw any tokens stuck in the contract
    /// @param _token Token address for which amount is to be withdrawn.
    function withdrawERC20(IERC20 _token) external onlyOwner {
        TransferHelper.safeTransfer(
            address(_token),
            msg.sender,
            _token.balanceOf(address(this))
        );
    }

    /// @notice Retrieves the latest crowdsale contract address
    /// @return latestCrowdsaleAddress The address of the latest launched crowdsale
    function getLatestCrowdsale()
        external
        view
        returns (address latestCrowdsaleAddress)
    {
        latestCrowdsaleAddress = (crowdsales[crowdsales.length - 1])
            .crowdsaleAddress;
    }

    /// @notice Retrieves the length of total crowdsales launched
    /// @return Length of Total launched crowdsales
    function getTotalLaunchedCrowdsales() external view returns (uint256) {
        return crowdsales.length;
    }

    /// @notice It is used to create tokensale based on implementation id using minimal proxy pattern.
    /// @param _id Implementation id.
    /// @param _implementationData Encoded data.
    /// @return crowdsaleAddress The address of the newly launched crowdsale
    function _launchCrowdsale(
        uint256 _id,
        bytes memory _implementationData
    ) internal returns (address crowdsaleAddress) {
        address crowdsaleLibrary = implementationIdVsImplementation[_id];
        require(
            crowdsaleLibrary != address(0),
            "LaunchpadFactory: Invalid implementation ID"
        );

        // Check encoded data length
        require(
            _implementationData.length >= 96,
            "LaunchpadFactory: Invalid encoded data"
        );

        (IERC20 projectToken, uint256 amountAllocation, address crowdsaleOwner) = abi.decode(
            _implementationData,
            (IERC20, uint256, address)
        );

        require(
            address(projectToken) != address(0),
            "LaunchpadFactory: Token address is zero"
        );

        require(amountAllocation > 0, "LaunchpadFactory: Allocation must be > 0");
        require(crowdsaleOwner != address(0), "LaunchpadFactory: Owner is zero");

        // Check allowance
        uint256 allowance = projectToken.allowance(msg.sender, address(this));
        require(allowance >= amountAllocation, "LaunchpadFactory: Insufficient token allowance");

        // Check balance
        uint256 balance = projectToken.balanceOf(msg.sender);
        require(balance >= amountAllocation, "LaunchpadFactory: Insufficient token balance");

        // Pull tokens to factory
        TransferHelper.safeTransferFrom(
            address(projectToken),
            msg.sender,
            address(this),
            amountAllocation
        );

        address crowdsaleClone = createClone(crowdsaleLibrary);
        require(crowdsaleClone != address(0), "LaunchpadFactory: Clone creation failed");

        // Approve token to new crowdsale
        TransferHelper.safeApprove(
            address(projectToken),
            address(crowdsaleClone),
            amountAllocation
        );

        crowdsales.push(
            CrowdsaleInfo({
                crowdsaleAddress: address(crowdsaleClone),
                projectToken: projectToken,
                owner: crowdsaleOwner
            })
        );

        emit CrowdsaleLaunched(_id, address(crowdsaleClone), projectToken);

        return address(crowdsaleClone);
    }
}
