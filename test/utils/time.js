const { ethers } = require("hardhat");

const { BigNumber } = ethers;

const advanceBlock = async () => {
  return ethers.provider.send("evm_mine", []);
};

const advanceBlockTo = async (blockNumber) => {
  for (let i = await ethers.provider.getBlockNumber(); i < blockNumber; i++) {
    await advanceBlock();
  }
};

const increase = async (value) => {
  await ethers.provider.send("evm_increaseTime", [value.toNumber()]);
  await advanceBlock();
};

const latestTimestamp = async function () {
  const block = await ethers.provider.getBlock("latest");
  return block.timestamp;
};

const advanceTimeAndBlock = async function (time) {
  await advanceTime(time);
  await advanceBlock();
};

const advanceTime = async function (time) {
  await ethers.provider.send("evm_increaseTime", [time]);
};

const duration = {
  seconds: function (val) {
    return BigNumber.from(val);
  },
  minutes: function (val) {
    return BigNumber.from(val).mul(this.seconds("60"));
  },
  hours: function (val) {
    return BigNumber.from(val).mul(this.minutes("60"));
  },
  days: function (val) {
    return BigNumber.from(val).mul(this.hours("24"));
  },
  weeks: function (val) {
    return BigNumber.from(val).mul(this.days("7"));
  },
  years: function (val) {
    return BigNumber.from(val).mul(this.days("365"));
  },
};

const takeSnapShot = async () => {
    return await ethers.provider.send("evm_snapshot", []);
};

const revertToSnapShot = async (id) => {
    return ethers.provider.send("evm_revert", [id]);
};
  
module.exports = {
  advanceTime,
  advanceBlock,
  advanceBlockTo,
  increase,
  latestTimestamp,
  advanceTimeAndBlock,
  duration,
  takeSnapShot,
  revertToSnapShot,
}