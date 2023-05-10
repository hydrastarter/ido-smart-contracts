// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

interface ICrowdSaleQualification {
    function isQualify(address user) external returns (bool);
}
