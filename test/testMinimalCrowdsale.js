const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const { toToken } = require("./utils/utils");
const Web3 = require("web3");
const { advanceTime, duration, latestTimestamp } = require("./utils/time");
const web3 = new Web3();

describe("MinimalCrowdsale", function async() {
  let owner, deployer, investor, otherAccount, launchpadFactory, proxyContract, inputToken, crowdsaleToken;
  let endTime, amountAllocation, rate, crowdsaleOwner, tokenURL, maxUserAllocation, crowdsaleTokenDecimals, inputTokenDecimals;

  beforeEach(async () => {
    accounts = await ethers.getSigners();
    owner = accounts[0];
    deployer = accounts[1];
    investor = accounts[2];
    crowdsaleOwner = accounts[3];
    otherAccount = accounts[4];

    const LaunchpadFactory = await ethers.getContractFactory("LaunchpadFactory");
    launchpadFactory = await LaunchpadFactory.connect(owner).deploy();

    const ProxyContract = await ethers.getContractFactory("ProxyContract");
    proxyContract = await ProxyContract.connect(owner).deploy(
      owner.address,
      launchpadFactory.address
    );

    const MinimalCrowdsaleImpl = await ethers.getContractFactory("MinimalCrowdsale");
    const minimalCrowdSaleImpl = await MinimalCrowdsaleImpl.deploy();
    
    await launchpadFactory.setCrowdsaleLauncher(proxyContract.address);
    await launchpadFactory.connect(owner).addImplementation(minimalCrowdSaleImpl.address);
    await proxyContract.connect(owner).addDeployerAddress(deployer.address);

    endTime = (await latestTimestamp()) + 10000;
    amountAllocation = toToken(100);
    maxUserAllocation = toToken(50);
    rate = toToken(1, 18);
    tokenURL = "ipfs://QmQ3Z1X";
    crowdsaleTokenDecimals = 18;
    inputTokenDecimals = 18;
  });

  it("should launch new MinimalCrowdsale", async function () {
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    crowdsaleToken = await MockERC20.connect(deployer).deploy("ABC", "XYZ", crowdsaleTokenDecimals);
    inputToken = await MockERC20.connect(investor).deploy("DUM", "DUMMY", inputTokenDecimals);

    await crowdsaleToken.connect(deployer).approve(proxyContract.address, amountAllocation);

    const deployerBalanceBefore = await crowdsaleToken.balanceOf(deployer.address);

    const encodedData = encodeImplData(
      endTime,
      crowdsaleToken.address,
      amountAllocation,
      [inputToken.address],
      [rate],
      crowdsaleOwner.address,
      tokenURL,
      maxUserAllocation
    );

    const tx = await proxyContract.connect(deployer).launchCrowdsale(0, encodedData);
    const receipt = await tx.wait();
    assert.isOk(receipt.status);

    const newCrowdsaleInfo = await launchpadFactory.crowdsales(0);
    const newCrowdsale = await ethers.getContractAt(
      "MinimalCrowdsale",
      newCrowdsaleInfo.crowdsaleAddress
    );

    const newCrowdsaleOwner = await newCrowdsale.owner();
    const newCrowdsaleToken = await newCrowdsale.token();
    const newCrowdsaleIsValidInputToken = await newCrowdsale.validInputToken(inputToken.address);
    const newCrowdsaleInputTokens = await newCrowdsale.getValidInputTokens();
    const newCrowdsaleInputTokenRate = await newCrowdsale.inputTokenRate(inputToken.address);
    const newCrowdsaleEndTime = await newCrowdsale.crowdsaleEndTime();
    const newCrowdsaleTokenAllocated = await newCrowdsale.crowdsaleTokenAllocated();
    const newCrowdsaleMaxUserAllocation = await newCrowdsale.maxUserAllocation();
    const deployerBalanceAfter = await crowdsaleToken.balanceOf(deployer.address);
    const newCrowdsaleBalance = await crowdsaleToken.balanceOf(newCrowdsale.address);

    assert.equal(
      newCrowdsaleOwner,
      crowdsaleOwner.address,
      "Invalid crowdsale owner"
    );
    assert.equal(
      newCrowdsaleToken,
      crowdsaleToken.address,
      "Invalid crowdsale token"
    );
    assert.equal(
      newCrowdsaleInfo.owner,
      crowdsaleOwner.address,
      "Invalid crowdsale owner"
    );
    assert.equal(
      newCrowdsaleIsValidInputToken,
      true,
      "Invalid crowdsale input token"
    );
    assert.equal(
      newCrowdsaleInputTokens[0],
      inputToken.address,
      "Invalid crowdsale input token"
    );
    assert.equal(
      newCrowdsaleInputTokenRate.toString(),
      rate.toString(),
      "Invalid crowdsale input token rate"
    );
    assert.equal(
      newCrowdsaleEndTime,
      endTime,
      "Invalid crowdsale end time"
    );
    assert.equal(
      newCrowdsaleTokenAllocated.toString(),
      amountAllocation.toString(),
      "Invalid crowdsale token allocation"
    );
    assert.equal(
      newCrowdsaleMaxUserAllocation.toString(),
      maxUserAllocation.toString(),
      "Invalid crowdsale max user allocation"
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

  it("should receive correct amount of tokens", async function () {
    const inputData = [
      {
        crowdsaleTokenDecimals: 18,
        inputTokenDecimals: 18,
        rateUnit: 1,
        inputTokenAmountUnit: 10,
      },
      {
        crowdsaleTokenDecimals: 18,
        inputTokenDecimals: 6,
        rateUnit: 1,
        inputTokenAmountUnit: 10,
      },
      {
        crowdsaleTokenDecimals: 6,
        inputTokenDecimals: 18,
        rateUnit: 1,
        inputTokenAmountUnit: 10,
      },
      {
        crowdsaleTokenDecimals: 32,
        inputTokenDecimals: 18,
        rateUnit: 1,
        inputTokenAmountUnit: 10,
      },
      {
        crowdsaleTokenDecimals: 18,
        inputTokenDecimals: 32,
        rateUnit: 1,
        inputTokenAmountUnit: 10,
      },
      {
        crowdsaleTokenDecimals: 6,
        inputTokenDecimals: 6,
        rateUnit: 1,
        inputTokenAmountUnit: 10,
      },
      {
        crowdsaleTokenDecimals: 36,
        inputTokenDecimals: 36,
        rateUnit: 1,
        inputTokenAmountUnit: 10,
      },
      {
        crowdsaleTokenDecimals: 6,
        inputTokenDecimals: 18,
        rateUnit: 2,
        inputTokenAmountUnit: 15,
      },
      {
        crowdsaleTokenDecimals: 32,
        inputTokenDecimals: 18,
        rateUnit: 0.5,
        inputTokenAmountUnit: 20,
      },
      {
        crowdsaleTokenDecimals: 18,
        inputTokenDecimals: 32,
        rateUnit: 16,
        inputTokenAmountUnit: 1,
      },
    ];  

    
    for (let i = 0; i < inputData.length; i++) {
      // console.log(inputData[i]);
      crowdsaleTokenDecimals = crowdsaleTokenDecimals;
      inputTokenDecimals = inputTokenDecimals;
      amountAllocation = toToken(100, crowdsaleTokenDecimals);
      maxUserAllocation = toToken(50, crowdsaleTokenDecimals);
      const inputTokenAmountUnit = inputData[i].inputTokenAmountUnit;
      const inputTokenAmount = toToken(inputTokenAmountUnit, inputTokenDecimals);
      const rateUnit = inputData[i].rateUnit;

      const MockERC20 = await ethers.getContractFactory("MockERC20");
      crowdsaleToken = await MockERC20.connect(deployer).deploy("ABC", "XYZ", crowdsaleTokenDecimals);
      inputToken = await MockERC20.connect(investor).deploy("DUM", "DUMMY", inputTokenDecimals);
      await crowdsaleToken.connect(deployer).approve(proxyContract.address, amountAllocation);

      const encodedData = encodeImplData(
        endTime,
        crowdsaleToken.address,
        amountAllocation,
        [inputToken.address],
        [toToken(rateUnit, 18)],
        crowdsaleOwner.address,
        tokenURL,
        maxUserAllocation
      );
      await proxyContract.connect(deployer).launchCrowdsale(0, encodedData);
      const newCrowdsaleInfo = await launchpadFactory.crowdsales(i);
      const newCrowdsale = await ethers.getContractAt(
        "MinimalCrowdsale",
        newCrowdsaleInfo.crowdsaleAddress
      );

      await inputToken.connect(investor).approve(newCrowdsale.address, inputTokenAmount);
      await newCrowdsale.connect(investor).purchaseToken(inputToken.address, inputTokenAmount);
      
      const investorCrowdsaleTokenBalance = await crowdsaleToken.balanceOf(investor.address);
      const crowdsaleInputTokenBalance = await inputToken.balanceOf(newCrowdsale.address);

      const expectedCrowdsaleTokenAmount = toToken(inputTokenAmountUnit * rateUnit, crowdsaleTokenDecimals);

      assert.equal(
        investorCrowdsaleTokenBalance.toString(),
        expectedCrowdsaleTokenAmount.toString(),
        "Invalid investor crowdsale token balance"
      );

      assert.equal(
        crowdsaleInputTokenBalance.toString(),
        inputTokenAmount.toString(),
        "Invalid crowdsale input token balance"
      );
    }
  });

  it("should update owner of MinimalCrowdsale", async function () {
    await launchpadFactory.connect(owner).transferOwnership(otherAccount.address);
    expect(await launchpadFactory.owner()).to.equal(otherAccount.address);
  });

  it("should update input token rate", async function () {
    const newRate = toToken(6254, 18);
    const minimalCrowdsale = await deployMinimalCrowdsale();
    minimalCrowdsale.connect(crowdsaleOwner).updateInputTokenRate(inputToken.address, newRate);
    const updatedRate = await minimalCrowdsale.inputTokenRate(inputToken.address);
    assert.equal(updatedRate.toString(), newRate.toString());
  });

  it("should add input token", async function () {
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const inputToken2 = await MockERC20.connect(investor).deploy("DUM2", "DUMMY2", inputTokenDecimals);
    const newRate = toToken(2, 18);

    const minimalCrowdsale = await deployMinimalCrowdsale();
    minimalCrowdsale.connect(crowdsaleOwner).updateInputTokenRate(inputToken2.address, newRate);
    const updatedRate = await minimalCrowdsale.inputTokenRate(inputToken2.address);
    const inputToken2IsValid = await minimalCrowdsale.validInputToken(inputToken2.address);
    const crowdsaleInputToken2 = await minimalCrowdsale.inputToken(1);
    const crowdsaleInputTokens = await minimalCrowdsale.getValidInputTokens();

    assert.equal(updatedRate.toString(), newRate.toString());
    expect(inputToken2IsValid).to.be.true;
    assert.equal(crowdsaleInputToken2, inputToken2.address);
    assert.equal(crowdsaleInputTokens.length, 2);
  });

  it("should update max user allocation", async function () {
    const newMaxUserAllocation = toToken(972, crowdsaleTokenDecimals);
    const minimalCrowdsale = await deployMinimalCrowdsale();
    minimalCrowdsale.connect(crowdsaleOwner).updateMaxUserAllocation(newMaxUserAllocation);
    const updatedMaxUserAllocation = await minimalCrowdsale.maxUserAllocation();
    assert.equal(updatedMaxUserAllocation.toString(), newMaxUserAllocation.toString());
  });

  it("should update max crowdsale allocation", async function () {
    const newMaxCrowdsaleAllocation = toToken(49310, crowdsaleTokenDecimals);
    const minimalCrowdsale = await deployMinimalCrowdsale();
    minimalCrowdsale.connect(crowdsaleOwner).updateMaxCrowdsaleAllocation(newMaxCrowdsaleAllocation);
    const updatedMaxCrowdsaleAllocation = await minimalCrowdsale.crowdsaleTokenAllocated();
    assert.equal(updatedMaxCrowdsaleAllocation.toString(), newMaxCrowdsaleAllocation.toString());
  });

  it("should end crowdsale and withdraw available funds", async function () { 
    const inputTokenAmount = toToken(25, inputTokenDecimals);
    const minimalCrowdsale = await deployMinimalCrowdsale();
    await inputToken.connect(investor).approve(minimalCrowdsale.address, inputTokenAmount);
    await minimalCrowdsale.connect(investor).purchaseToken(inputToken.address, inputTokenAmount);

    const timestampBefore = await latestTimestamp();
    const elapsedTime = duration.days(30).toNumber();
    await advanceTime(elapsedTime);
    const endTimeBefore = await minimalCrowdsale.crowdsaleEndTime();
    const crowdsaleTokenBalanceBefore = await crowdsaleToken.balanceOf(crowdsaleOwner.address);
    const inputTokenBalanceBefore = await inputToken.balanceOf(crowdsaleOwner.address);

    await minimalCrowdsale.connect(crowdsaleOwner).endCrowdsale();
    const availableInputTokenAmount = await minimalCrowdsale.getContractTokenBalance(inputToken.address);
    await minimalCrowdsale.connect(crowdsaleOwner).withdrawFunds(inputToken.address, availableInputTokenAmount);
    const crowdsaleTokenBalanceAfter = await crowdsaleToken.balanceOf(crowdsaleOwner.address);
    const inputTokenBalanceAfter = await inputToken.balanceOf(crowdsaleOwner.address);
    const endTimeAfter = await minimalCrowdsale.crowdsaleEndTime();

    assert.equal(crowdsaleTokenBalanceAfter.toString(), crowdsaleTokenBalanceBefore.add(amountAllocation).sub(inputTokenAmount).toString());
    assert.equal(inputTokenBalanceAfter.toString(), inputTokenBalanceBefore.add(inputTokenAmount).toString());
    assert.closeTo(endTimeAfter.toNumber(), timestampBefore + elapsedTime, 30);
    assert.closeTo(endTimeAfter.sub(endTimeBefore).toNumber(), elapsedTime, 10030);
  });

  it("should revert if non-owner tries to update input token rate", async function () {
    const newRate = toToken(6254, 18);
    const minimalCrowdsale = await deployMinimalCrowdsale();
    await expect(
      minimalCrowdsale.connect(otherAccount).updateInputTokenRate(inputToken.address, newRate)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("should revert if non-owner tries to update max user allocation", async function () {
    const newMaxUserAllocation = toToken(972, crowdsaleTokenDecimals);
    const minimalCrowdsale = await deployMinimalCrowdsale();
    await expect(
      minimalCrowdsale.connect(otherAccount).updateMaxUserAllocation(newMaxUserAllocation)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("should revert if non-owner tries to update max crowdsale allocation", async function () {
    const newMaxCrowdsaleAllocation = toToken(49310, crowdsaleTokenDecimals);
    const minimalCrowdsale = await deployMinimalCrowdsale();
    await expect(
      minimalCrowdsale.connect(otherAccount).updateMaxCrowdsaleAllocation(newMaxCrowdsaleAllocation)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  const deployMinimalCrowdsale = async () => {
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    crowdsaleToken = await MockERC20.connect(deployer).deploy("ABC", "XYZ", crowdsaleTokenDecimals);
    inputToken = await MockERC20.connect(investor).deploy("DUM", "DUMMY", inputTokenDecimals);
  
    await crowdsaleToken.connect(deployer).approve(proxyContract.address, amountAllocation);
  
    const encodedData = encodeImplData(
      endTime,
      crowdsaleToken.address,
      amountAllocation,
      [inputToken.address],
      [rate],
      crowdsaleOwner.address,
      tokenURL,
      maxUserAllocation
    );
  
    const tx = await proxyContract.connect(deployer).launchCrowdsale(0, encodedData);
    const receipt = await tx.wait();
    assert.isOk(receipt.status);
  
    const newCrowdsaleInfo = await launchpadFactory.crowdsales(0);
    const newCrowdsale = await ethers.getContractAt(
      "MinimalCrowdsale",
      newCrowdsaleInfo.crowdsaleAddress
    );
    return newCrowdsale;
  };
  
});


const encodeImplData = (
  endTime,
  crowdsaleToken,
  amountAllocation,
  inputTokens,
  rate,
  crowdsaleOwner,
  tokenURL,
  maxUserAllocation
) => {
  const encodedData = web3.eth.abi.encodeParameters(
    [
      "address",
      "uint256",
      "address",
      "address[]",
      "uint256[]",
      "uint256",
      "string",
      "uint256",
    ],
    [
      crowdsaleToken,
      amountAllocation,
      crowdsaleOwner,
      inputTokens,
      rate,
      endTime,
      tokenURL,
      maxUserAllocation,
    ]
  );

  return encodedData;
};