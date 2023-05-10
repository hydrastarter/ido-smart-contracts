// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

contract MockCrowdsaleQualification {
    function isQualify(address user) external view returns (bool) {
        return true;
    }
}
