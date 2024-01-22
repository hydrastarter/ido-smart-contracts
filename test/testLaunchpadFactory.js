const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const { toToken } = require("./utils/utils");
const Web3 = require("web3");
const { latestTimestamp } = require("./utils/time");
const web3 = new Web3();

describe("LaunchpadFactory", function async() {
  let owner, deployer, investor, otherAccount, launchpadFactory, proxyContract, inputToken, crowdsaleToken;
  let startTime, endTime, vestingStart, vestingEnd, cliffDuration, whitelistEnabled, whitelistAddresses, amountAllocation, rate, crowdsaleOwner, tokenURL, minTokenSaleAmount, maxUserAllocation;

  beforeEach(async () => {
    accounts = await ethers.getSigners();
    owner = accounts[0];
    deployer = accounts[1];
    investor = accounts[2];
    crowdsaleOwner = accounts[3];
    otherAccount = accounts[4];

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    crowdsaleToken = await MockERC20.connect(deployer).deploy("ABC", "XYZ", 18);
    inputToken = await MockERC20.connect(investor).deploy("DUM", "DUMMY", 18);

    const LaunchpadFactory = await ethers.getContractFactory("LaunchpadFactory");
    launchpadFactory = await LaunchpadFactory.connect(owner).deploy();

    const ProxyContract = await ethers.getContractFactory("ProxyContract");
    proxyContract = await ProxyContract.connect(owner).deploy(
      owner.address,
      launchpadFactory.address
    );

    const Crowdsale = await ethers.getContractFactory("Crowdsale");
    const crowdSaleImpl = await Crowdsale.deploy();
    
    await launchpadFactory.setCrowdsaleLauncher(proxyContract.address);
    await launchpadFactory.connect(owner).addImplementation(crowdSaleImpl.address);
    await proxyContract.connect(owner).addDeployerAddress(deployer.address);

    startTime = (await latestTimestamp()) + 100;
    endTime = parseInt(startTime) + 10000;
    vestingStart = parseInt(endTime) + 1000;
    vestingEnd = parseInt(vestingStart) + 1000;
    cliffDuration = 500;
    whitelistEnabled = false;
    whitelistAddresses = [];
    amountAllocation = toToken(100);
    minTokenSaleAmount = toToken(10);
    maxUserAllocation = toToken(50);
    rate = toToken(1, 18);
    tokenURL = "ipfs://QmQ3Z1X";
  });

  it("should launch new crowdsale", async function () {
    await crowdsaleToken.connect(deployer).approve(proxyContract.address, amountAllocation);

    const deployerBalanceBefore = await crowdsaleToken.balanceOf(deployer.address);

    const encodedData = encodeImplData(
      startTime,
      endTime,
      vestingStart,
      vestingEnd,
      cliffDuration,
      whitelistEnabled,
      whitelistAddresses,
      crowdsaleToken.address,
      amountAllocation,
      [inputToken.address],
      [rate],
      crowdsaleOwner.address,
      tokenURL,
      minTokenSaleAmount,
      maxUserAllocation
    );

    const tx = await proxyContract.connect(deployer).launchCrowdsale(0, encodedData);
    const receipt = await tx.wait();
    assert.isOk(receipt.status);

    const newCrowdsaleInfo = await launchpadFactory.crowdsales(0);
    const newCrowdsale = await ethers.getContractAt(
      "Crowdsale",
      newCrowdsaleInfo.crowdsaleAddress
    );
    const newCrowdsaleToken = await newCrowdsale.token();
    const deployerBalanceAfter = await crowdsaleToken.balanceOf(deployer.address);
    const newCrowdsaleBalance = await crowdsaleToken.balanceOf(newCrowdsale.address);

    assert.notEqual(
      newCrowdsaleInfo.crowdsaleAddress,
      ethers.constants.AddressZero,
      "Invalid crowdsale address"
    );
    assert.equal(
      newCrowdsaleToken,
      crowdsaleToken.address,
      "Invalid crowdsale token"
    );
    assert.equal(
      newCrowdsaleInfo.projectToken,
      crowdsaleToken.address,
      "Invalid project token"
    );
    assert.equal(
      newCrowdsaleInfo.owner,
      crowdsaleOwner.address,
      "Invalid crowdsale owner"
    );
    assert.equal(
      deployerBalanceAfter.toString(),
      deployerBalanceBefore.sub(amountAllocation).toString(),
      "Invalid deployer balance"
    );
    assert.equal(
      newCrowdsaleBalance.toString(),
      amountAllocation.toString(),
      "Invalid crowdsale balance"
    );
  });

  it("should update owner of LaunchpadFactory", async function () {
    await launchpadFactory.connect(owner).transferOwnership(otherAccount.address);
    expect(await launchpadFactory.owner()).to.equal(otherAccount.address);
  });

  it("should update LaunchpadFactory address", async function () {
    await proxyContract.updateLaunchpadFactoryAddress(
      "0x0B306BF915C4d645ff596e518fAf3F9669b97016"
    );
    expect(await proxyContract.launchpadFactory()).to.equal(
      "0x0B306BF915C4d645ff596e518fAf3F9669b97016"
    );
  });

  it("should revert if crowdsale implementation does not exist", async function () {
    await crowdsaleToken.connect(deployer).approve(proxyContract.address, amountAllocation);

    const encodedData = web3.eth.abi.encodeParameters(
      ["address", "uint256"], [crowdsaleToken.address, amountAllocation]
    );

    await expect(
      proxyContract.connect(deployer).launchCrowdsale(1, encodedData)
    ).to.be.revertedWith("LaunchpadFactory: Incorrect Id");
  });

  it("should revert if non-deployer tries to launch crowdsale", async function () {
    await crowdsaleToken.connect(deployer).approve(proxyContract.address, amountAllocation);

    const encodedData = web3.eth.abi.encodeParameters(
      ["address", "uint256"], [crowdsaleToken.address, amountAllocation]
    );

    await expect(
      launchpadFactory.connect(otherAccount).launchCrowdsale(0, encodedData)
    ).to.be.revertedWith("LaunchpadFactory: Only launcher");
  });
});

const encodeImplData = (
    startTime,
    endTime,
    vestingStart,
    vestingEnd,
    cliffDuration,
    whitelistEnabled,
    whitelistAddresses,
    crowdsaleToken,
    amountAllocation,
    inputTokens,
    rate,
    crowdsaleOwner,
    tokenURL,
    minTokenSaleAmount,
    maxUserAllocation
) => {
    const crowdsaleTimings = web3.eth.abi.encodeParameters(
      ["uint128", "uint128", "uint128", "uint128", "uint128"],
      [startTime, endTime, vestingStart, vestingEnd, cliffDuration]
    );
  
    const whitelist = web3.eth.abi.encodeParameters(
      ["bool", "address[]"],
      [whitelistEnabled, whitelistAddresses]
    );
  
    const encodedData = web3.eth.abi.encodeParameters(
      [
        "address",
        "uint256",
        "address",
        "address[]",
        "uint256[]",
        "bytes",
        "bytes",
        "string",
        "uint256",
        "uint256",
      ],
      [
        crowdsaleToken,
        amountAllocation,
        crowdsaleOwner,
        inputTokens,
        rate,
        crowdsaleTimings,
        whitelist,
        tokenURL,
        minTokenSaleAmount,
        maxUserAllocation,
      ]
    );
  
    return encodedData;
};