const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const { toToken } = require("./utils/utils");
const Web3 = require("web3");
const { duration, advanceTime, latestTimestamp } = require("./utils/time");
const web3 = new Web3();

describe("Crowdsale", function async() {
  let owner, deployer, investor, investor2, otherAccount, launchpadFactory, proxyContract, inputToken, crowdsaleToken;
  let startTime, endTime, vestingStart, vestingEnd, cliffDuration, whitelistEnabled, whitelistAddresses, 
    amountAllocation, rate, crowdsaleOwner, tokenURL, minTokenSaleAmount, maxUserAllocation, crowdsaleTokenDecimals, inputTokenDecimals;

  beforeEach(async () => {
    accounts = await ethers.getSigners();
    owner = accounts[0];
    deployer = accounts[1];
    investor = accounts[2];
    investor2 = accounts[3];
    crowdsaleOwner = accounts[4];
    otherAccount = accounts[5];

    const LaunchpadFactory = await ethers.getContractFactory("LaunchpadFactory");
    launchpadFactory = await LaunchpadFactory.connect(owner).deploy();

    const ProxyContract = await ethers.getContractFactory("ProxyContract");
    proxyContract = await ProxyContract.connect(owner).deploy(
      owner.address,
      launchpadFactory.address
    );

    const CrowdsaleImpl = await ethers.getContractFactory("Crowdsale");
    const crowdSaleImpl = await CrowdsaleImpl.deploy();
    
    await launchpadFactory.setCrowdsaleLauncher(proxyContract.address);
    await launchpadFactory.connect(owner).addImplementation(crowdSaleImpl.address);
    await proxyContract.connect(owner).addDeployerAddress(deployer.address);

    startTime = (await latestTimestamp()) + 100;
    endTime = startTime + 10000;
    vestingStart = endTime + 1000;
    vestingEnd = vestingStart + 1000;
    cliffDuration = 500;
    whitelistEnabled = false;
    whitelistAddresses = [];
    amountAllocation = toToken(100);
    minTokenSaleAmount = toToken(10);
    maxUserAllocation = toToken(50);
    rate = toToken(1, 18);
    tokenURL = "ipfs://QmQ3Z1X";
    crowdsaleTokenDecimals = 18;
    inputTokenDecimals = 18;
  });

  it("should launch new Crowdsale", async function () {
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    crowdsaleToken = await MockERC20.connect(deployer).deploy("ABC", "XYZ", crowdsaleTokenDecimals);
    inputToken = await MockERC20.connect(investor).deploy("DUM", "DUMMY", inputTokenDecimals);

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

    const newCrowdsaleOwner = await newCrowdsale.owner();
    const newCrowdsaleToken = await newCrowdsale.token();
    const newCrowdsaleIsValidInputToken = await newCrowdsale.validInputToken(inputToken.address);
    const newCrowdsaleInputToken = await newCrowdsale.inputToken(0);
    const newCrowdsaleInputTokens = await newCrowdsale.getValidInputTokens();
    const newCrowdsaleInputTokenRate = await newCrowdsale.inputTokenRate(inputToken.address);
    const newCrowdsaleCliffDuration = await newCrowdsale.cliffDuration();
    const newCrowdsaleVestingStart = await newCrowdsale.vestingStart();
    const newCrowdsaleVestingEnd = await newCrowdsale.vestingEnd();
    const newCrowdsaleStartTime = await newCrowdsale.crowdsaleStartTime();
    const newCrowdsaleEndTime = await newCrowdsale.crowdsaleEndTime();
    const newCrowdsaleTokenAllocated = await newCrowdsale.crowdsaleTokenAllocated();
    const newCrowdsaleTokenRemainingForSale = await newCrowdsale.tokenRemainingForSale();
    const newCrowdsaleMinTokenSaleAmount = await newCrowdsale.minimumTokenSaleAmount();
    const newCrowdsaleMaxUserAllocation = await newCrowdsale.maxUserAllocation();
    const newCrowdsaleWhitelistEnabled = await newCrowdsale.whitelistingEnabled();
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
      newCrowdsaleIsValidInputToken,
      true,
      "Invalid input token validity"
    );
    assert.equal(
      newCrowdsaleInputToken,
      inputToken.address,
      "Invalid crowdsale input token"
    );
    assert.equal(
      newCrowdsaleInputTokens.length,
      1,
      "Invalid crowdsale input tokens length"
    );
    assert.equal(
      newCrowdsaleInputTokens[0],
      inputToken.address,
      "Invalid crowdsale first input token"
    );
    assert.equal(
      newCrowdsaleInputTokenRate.toString(),
      rate.toString(),
      "Invalid crowdsale input token rate"
    );
    assert.equal(
      newCrowdsaleCliffDuration,
      cliffDuration,
      "Invalid crowdsale cliff duration"
    );
    assert.equal(
      newCrowdsaleVestingStart,
      vestingStart,
      "Invalid crowdsale vesting start"
    );
    assert.equal(
      newCrowdsaleVestingEnd,
      vestingEnd,
      "Invalid crowdsale vesting end"
    );
    assert.equal(
      newCrowdsaleStartTime,
      startTime,
      "Invalid crowdsale start time"
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
      newCrowdsaleTokenRemainingForSale.toString(),
      amountAllocation.toString(),
      "Invalid crowdsale token remaining for sale"
    );
    assert.equal(
      newCrowdsaleMinTokenSaleAmount.toString(),
      minTokenSaleAmount.toString(),
      "Invalid crowdsale minimum token sale amount"
    );
    assert.equal(
      newCrowdsaleMaxUserAllocation.toString(),
      maxUserAllocation.toString(),
      "Invalid crowdsale max user allocation"
    );
    assert.equal(
      newCrowdsaleWhitelistEnabled,
      whitelistEnabled,
      "Invalid crowdsale whitelist enabled"
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

  it("should vest correct amount of tokens", async function () {
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

      startTime = (await latestTimestamp()) + 100;
      const encodedData = encodeImplData(
        startTime,
        0,
        0,
        0,
        0,
        whitelistEnabled,
        whitelistAddresses,
        crowdsaleToken.address,
        amountAllocation,
        [inputToken.address],
        [toToken(rateUnit, 18)],
        crowdsaleOwner.address,
        tokenURL,
        minTokenSaleAmount,
        maxUserAllocation
      );
      await proxyContract.connect(deployer).launchCrowdsale(0, encodedData);
      const newCrowdsaleInfo = await launchpadFactory.crowdsales(i);
      const newCrowdsale = await ethers.getContractAt("Crowdsale", newCrowdsaleInfo.crowdsaleAddress);

      await advanceTime(100);
      await inputToken.connect(investor).approve(newCrowdsale.address, inputTokenAmount);
      await newCrowdsale.connect(investor).purchaseToken(inputToken.address, inputTokenAmount);
      
      const crowdsaleInputTokenBalance = await inputToken.balanceOf(newCrowdsale.address);
      const userInputData = await newCrowdsale.userInputData(inputToken.address, investor.address);
      const userVestedAmount = await newCrowdsale.vestedAmount(investor.address);
      const tokenRemainingForSale = await newCrowdsale.tokenRemainingForSale();

      const expectedCrowdsaleTokenAmount = toToken(inputTokenAmountUnit * rateUnit, crowdsaleTokenDecimals);
      
      assert.equal(
        crowdsaleInputTokenBalance.toString(),
        inputTokenAmount.toString(),
        "Invalid crowdsale input token balance"
      );

      assert.equal(
        userInputData.toString(),
        inputTokenAmount.toString(),
        "Invalid user input data"
      );

      assert.equal(
        userVestedAmount.toString(),
        expectedCrowdsaleTokenAmount.toString(),
        "Invalid user vested amount"
      );

      assert.equal(
        tokenRemainingForSale.toString(),
        amountAllocation.sub(expectedCrowdsaleTokenAmount).toString(),
        "Invalid crowdsale token remaining for sale"
      );
    }
  });

  it("should end crowdsale", async function () { 
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    crowdsaleToken = await MockERC20.connect(deployer).deploy("ABC", "XYZ", crowdsaleTokenDecimals);
    inputToken = await MockERC20.connect(investor).deploy("DUM", "DUMMY", inputTokenDecimals);

    await crowdsaleToken.connect(deployer).approve(proxyContract.address, amountAllocation);

    const encodedData = encodeImplData(
      startTime,
      0,
      0,
      0,
      0,
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
    const newCrowdsale = await ethers.getContractAt("Crowdsale", newCrowdsaleInfo.crowdsaleAddress);

    const timestampBefore = await latestTimestamp();
    const elapsedTime = duration.days(30).toNumber();
    const estimatedEndTime = timestampBefore + elapsedTime;
    const estimatedVestingStart = estimatedEndTime + duration.hours(1).toNumber();
    const estimatedVestingEnd = estimatedVestingStart + duration.days(2).toNumber();
    const cliffDuration = duration.days(1).toNumber();
    await advanceTime(elapsedTime);

    await newCrowdsale.connect(crowdsaleOwner).endCrowdsale(estimatedVestingStart, estimatedVestingEnd, cliffDuration);
    const crowdsaleVestingStart = await newCrowdsale.vestingStart();
    const crowdsaleVestingEnd = await newCrowdsale.vestingEnd();
    const crowdsaleCliffDuration = await newCrowdsale.cliffDuration();
    const crowdsaleEndTime = await newCrowdsale.crowdsaleEndTime();

    assert.closeTo(crowdsaleVestingStart.toNumber(), estimatedVestingStart, 30);
    assert.closeTo(crowdsaleVestingEnd.toNumber(), estimatedVestingEnd, 30);
    assert.equal(crowdsaleCliffDuration.toString(), cliffDuration.toString());
    assert.closeTo(crowdsaleEndTime.toNumber(), estimatedEndTime, 30);
  });

  it("should return input tokens if minimum crowdsale amount not reached", async function () { 
    const inputTokenAmount = minTokenSaleAmount.sub(1);
    const crowdsale = await deployCrowdsale();

    await advanceTime(100);
    await inputToken.connect(investor).approve(crowdsale.address, inputTokenAmount);
    await crowdsale.connect(investor).purchaseToken(inputToken.address, inputTokenAmount);

    await advanceTime(endTime - startTime);
    const crowdsaleInputTokenBalBefore = await inputToken.balanceOf(crowdsale.address);
    const crowdsaleTokenBalBefore = await crowdsaleToken.balanceOf(crowdsale.address);
    const userInputTokenBalBefore = await inputToken.balanceOf(investor.address);
    const userTokenBalBefore = await crowdsaleToken.balanceOf(investor.address);

    await crowdsale.connect(investor).drawDown();

    const crowdsaleInputTokenBalAfter = await inputToken.balanceOf(crowdsale.address);
    const crowdsaleTokenBalAfter = await crowdsaleToken.balanceOf(crowdsale.address);
    const userInputTokenBalAfter = await inputToken.balanceOf(investor.address);
    const userTokenBalAfter = await crowdsaleToken.balanceOf(investor.address);

    assert.equal(
      crowdsaleInputTokenBalAfter.toString(),
      crowdsaleInputTokenBalBefore.sub(inputTokenAmount).toString());
    assert.equal(crowdsaleTokenBalBefore.toString(), crowdsaleTokenBalAfter.toString());
    assert.equal(
      userInputTokenBalAfter.toString(),
      userInputTokenBalBefore.add(inputTokenAmount).toString()
    );
    assert.equal(userTokenBalBefore.toString(), userTokenBalAfter.toString());
  });

  it("should revert if end of cliff not reached", async function () { 
    const inputTokenAmount = minTokenSaleAmount;
    const crowdsale = await deployCrowdsale();

    await advanceTime(100);
    await inputToken.connect(investor).approve(crowdsale.address, inputTokenAmount);
    await crowdsale.connect(investor).purchaseToken(inputToken.address, inputTokenAmount);

    await advanceTime(vestingStart - (await latestTimestamp()) + cliffDuration - 1);
    await expect(crowdsale.connect(investor).drawDown()).to.be.revertedWith("Crowdsale: No allowance left to withdraw");
  });

  it("should withdraw all crowdsale tokens after vesting ended", async function () { 
    const inputTokenAmount = minTokenSaleAmount.add(1);
    const crowdsale = await deployCrowdsale();

    await advanceTime(100);
    await inputToken.connect(investor).approve(crowdsale.address, inputTokenAmount);
    await crowdsale.connect(investor).purchaseToken(inputToken.address, inputTokenAmount);

    await advanceTime(vestingEnd - (await latestTimestamp()));
    const userTokenBalBefore = await crowdsaleToken.balanceOf(investor.address);
    await crowdsale.connect(investor).drawDown();
    const userTokenBalAfter = await crowdsaleToken.balanceOf(investor.address);

    assert.equal(userTokenBalAfter.toString(), userTokenBalBefore.add(inputTokenAmount).toString());
  });

  it("should withdraw crowdsale progressively", async function () { 
    const inputTokenAmount = minTokenSaleAmount.add(1);
    const crowdsale = await deployCrowdsale();

    await advanceTime(100);
    await inputToken.connect(investor).approve(crowdsale.address, inputTokenAmount);
    await crowdsale.connect(investor).purchaseToken(inputToken.address, inputTokenAmount);

    const initialUserTokenBal = await crowdsaleToken.balanceOf(investor.address);

    await advanceTime(vestingStart - (await latestTimestamp()) + cliffDuration + 100);
    let userTokenBalBefore = initialUserTokenBal
    await crowdsale.connect(investor).drawDown();
    let userTokenBalAfter = await crowdsaleToken.balanceOf(investor.address);
    assert(userTokenBalAfter.gt(userTokenBalBefore));

    await advanceTime(200);
    userTokenBalBefore = userTokenBalAfter
    await crowdsale.connect(investor).drawDown();
    userTokenBalAfter = await crowdsaleToken.balanceOf(investor.address);
    assert(userTokenBalAfter.gt(userTokenBalBefore));

    await advanceTime(220);
    userTokenBalBefore = userTokenBalAfter
    await crowdsale.connect(investor).drawDown();
    userTokenBalAfter = await crowdsaleToken.balanceOf(investor.address);
    assert(userTokenBalAfter.gt(userTokenBalBefore));

    assert.equal(userTokenBalAfter.toString(), initialUserTokenBal.add(inputTokenAmount).toString());
  });

  it("should transfer input tokens to owner if minimum crowdsale amount reached", async function () { 
    const inputTokenAmount = minTokenSaleAmount.mul(2);
    const crowdsale = await deployCrowdsale();

    await advanceTime(100);
    await inputToken.connect(investor).approve(crowdsale.address, inputTokenAmount);
    await crowdsale.connect(investor).purchaseToken(inputToken.address, inputTokenAmount);

    await advanceTime(endTime - (await latestTimestamp()));
    const ownerInputTokenBalBefore = await inputToken.balanceOf(crowdsaleOwner.address);
    await crowdsale.connect(crowdsaleOwner).withdrawFunds(inputToken.address, inputTokenAmount);
    const ownerInputTokenBalAfter = await inputToken.balanceOf(crowdsaleOwner.address);

    assert.equal(ownerInputTokenBalAfter.toString(), ownerInputTokenBalBefore.add(inputTokenAmount).toString());
  });

  it("should transfer crowdsale tokens not sold to owner if minimum crowdsale amount reached", async function () { 
    const inputTokenAmount = minTokenSaleAmount.add(100);
    const crowdsale = await deployCrowdsale();

    await advanceTime(100);
    await inputToken.connect(investor).approve(crowdsale.address, inputTokenAmount);
    await crowdsale.connect(investor).purchaseToken(inputToken.address, inputTokenAmount);

    await advanceTime(endTime - (await latestTimestamp()));
    const amountNotSold = amountAllocation.sub(inputTokenAmount);
    const ownerCrowdsaleTokenBalBefore = await crowdsaleToken.balanceOf(crowdsaleOwner.address);
    await crowdsale.connect(crowdsaleOwner).withdrawFunds(crowdsaleToken.address, amountNotSold);
    const ownerCrowdsaleTokenBalAfter = await crowdsaleToken.balanceOf(crowdsaleOwner.address);

    assert.equal(ownerCrowdsaleTokenBalAfter.toString(), ownerCrowdsaleTokenBalBefore.add(amountNotSold).toString());
  });

  it("should transfer all crowdsale tokens to owner if minimum crowdsale amount not reached", async function () { 
    const inputTokenAmount = minTokenSaleAmount.sub(1);
    const crowdsale = await deployCrowdsale();

    await advanceTime(100);
    await inputToken.connect(investor).approve(crowdsale.address, inputTokenAmount);
    await crowdsale.connect(investor).purchaseToken(inputToken.address, inputTokenAmount);

    await advanceTime(endTime - (await latestTimestamp()));
    const ownerCrowdsaleTokenBalBefore = await crowdsaleToken.balanceOf(crowdsaleOwner.address);
    await crowdsale.connect(crowdsaleOwner).withdrawFunds(crowdsaleToken.address, amountAllocation);
    const ownerCrowdsaleTokenBalAfter = await crowdsaleToken.balanceOf(crowdsaleOwner.address);

    assert.equal(ownerCrowdsaleTokenBalAfter.toString(), ownerCrowdsaleTokenBalBefore.add(amountAllocation).toString());
  });

  it("should revert if owner tries to withdraw input tokens when minimum crowdsale amount not reached", async function () { 
    const inputTokenAmount = minTokenSaleAmount.sub(1);
    const crowdsale = await deployCrowdsale();

    await advanceTime(100);
    await inputToken.connect(investor).approve(crowdsale.address, inputTokenAmount);
    await crowdsale.connect(investor).purchaseToken(inputToken.address, inputTokenAmount);

    await advanceTime(endTime - (await latestTimestamp()));

    await expect(crowdsale.connect(crowdsaleOwner).withdrawFunds(inputToken.address, inputTokenAmount))
      .to.be.revertedWith("Crowdsale: Only crowdsale token can be withdrawn");
  });

  it("should revert if owner tries to withdraw crowdsale tokens sold", async function () { 
    const inputTokenAmount = minTokenSaleAmount.mul(2);
    const crowdsale = await deployCrowdsale();

    await advanceTime(100);
    await inputToken.connect(investor).approve(crowdsale.address, inputTokenAmount);
    await crowdsale.connect(investor).purchaseToken(inputToken.address, inputTokenAmount);

    await advanceTime(endTime - (await latestTimestamp()));

    const amountNotSold = amountAllocation.sub(inputTokenAmount);
    await expect(crowdsale.connect(crowdsaleOwner).withdrawFunds(crowdsaleToken.address, amountNotSold.add(1)))
      .to.be.revertedWith("Crowdsale: Can only withdraw unsold tokens");
  });

  it("should update owner of Crowdsale", async function () {
    await launchpadFactory.connect(owner).transferOwnership(otherAccount.address);
    expect(await launchpadFactory.owner()).to.equal(otherAccount.address);
  });

  it("should update input token rate", async function () {
    const newRate = toToken(6254, 18);
    const crowdsale = await deployCrowdsale();
    crowdsale.connect(crowdsaleOwner).updateInputTokenRate(inputToken.address, newRate);
    const updatedRate = await crowdsale.inputTokenRate(inputToken.address);
    assert.equal(updatedRate.toString(), newRate.toString());
  });

  it("should add input token", async function () {
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const inputToken2 = await MockERC20.connect(investor).deploy("DUM2", "DUMMY2", inputTokenDecimals);
    const newRate = toToken(2, 18);

    const crowdsale = await deployCrowdsale();
    crowdsale.connect(crowdsaleOwner).updateInputTokenRate(inputToken2.address, newRate);
    const updatedRate = await crowdsale.inputTokenRate(inputToken2.address);
    const inputToken2IsValid = await crowdsale.validInputToken(inputToken2.address);
    const crowdsaleInputToken2 = await crowdsale.inputToken(1);
    const crowdsaleInputTokens = await crowdsale.getValidInputTokens();

    assert.equal(updatedRate.toString(), newRate.toString());
    expect(inputToken2IsValid).to.be.true;
    assert.equal(crowdsaleInputToken2, inputToken2.address);
    assert.equal(crowdsaleInputTokens.length, 2);
  });

  it("should update max user allocation", async function () {
    const newMaxUserAllocation = toToken(972, crowdsaleTokenDecimals);
    const crowdsale = await deployCrowdsale();
    crowdsale.connect(crowdsaleOwner).updateMaxUserAllocation(newMaxUserAllocation);
    const updatedMaxUserAllocation = await crowdsale.maxUserAllocation();
    assert.equal(updatedMaxUserAllocation.toString(), newMaxUserAllocation.toString());
  });

  it("should update min token sale amount", async function () {
    const newMinTokenSaleAmount = toToken(8, crowdsaleTokenDecimals);
    const crowdsale = await deployCrowdsale();
    crowdsale.connect(crowdsaleOwner).updateMinimumTokenSaleAmount(newMinTokenSaleAmount);
    const updatedMinTokenSaleAmount = await crowdsale.minimumTokenSaleAmount();
    assert.equal(updatedMinTokenSaleAmount.toString(), newMinTokenSaleAmount.toString());
  });

  it("should add qualification contract", async function () {
    const MockCrowdsaleQualification = await ethers.getContractFactory("MockCrowdsaleQualification");
    const mockCrowdsaleQualification = await MockCrowdsaleQualification.connect(crowdsaleOwner).deploy();

    const crowdsale = await deployCrowdsale();
    await crowdsale.connect(crowdsaleOwner).updateCrowdsaleQualificationAddress(mockCrowdsaleQualification.address);

    const qualificationContract = await crowdsale.crowdsaleQualification();
    assert.equal(qualificationContract, mockCrowdsaleQualification.address);
  });

  it("should create Crowdsale with whitelist and add new address", async function () {
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    crowdsaleToken = await MockERC20.connect(deployer).deploy("ABC", "XYZ", crowdsaleTokenDecimals);
    inputToken = await MockERC20.connect(investor).deploy("DUM", "DUMMY", inputTokenDecimals);
    whitelistAddresses = [investor.address, investor2.address];

    await crowdsaleToken.connect(deployer).approve(proxyContract.address, amountAllocation);

    startTime = (await latestTimestamp()) + 100;
    const encodedData = encodeImplData(
      startTime,
      endTime,
      vestingStart,
      vestingEnd,
      cliffDuration,
      true,
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

    const isEnabled = await newCrowdsale.whitelistingEnabled();
    const investorIsWhitelisted = await newCrowdsale.whitelistedAddress(investor.address);
    const investor2IsWhitelisted = await newCrowdsale.whitelistedAddress(investor2.address);

    expect(isEnabled).to.be.true;
    expect(investorIsWhitelisted).to.be.true;
    expect(investor2IsWhitelisted).to.be.true;

    await newCrowdsale.connect(crowdsaleOwner).whitelistUsers([otherAccount.address]);
    const otherIsWhitelisted = await newCrowdsale.whitelistedAddress(otherAccount.address);
    expect(otherIsWhitelisted).to.be.true;
  });

  it("should revert if non-owner tries to update input token rate", async function () {
    const newRate = toToken(6254, 18);
    const crowdsale = await deployCrowdsale();
    await expect(
      crowdsale.connect(otherAccount).updateInputTokenRate(inputToken.address, newRate)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("should revert if non-owner tries to update max user allocation", async function () {
    const newMaxUserAllocation = toToken(972, crowdsaleTokenDecimals);
    const crowdsale = await deployCrowdsale();
    await expect(
      crowdsale.connect(otherAccount).updateMaxUserAllocation(newMaxUserAllocation)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("should revert if non-owner tries to update min token sale amount", async function () {
    const newMinTokenSaleAmount = toToken(8, crowdsaleTokenDecimals);
    const crowdsale = await deployCrowdsale();
    await expect(
      crowdsale.connect(otherAccount).updateMinimumTokenSaleAmount(newMinTokenSaleAmount)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  const deployCrowdsale = async () => {
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    crowdsaleToken = await MockERC20.connect(deployer).deploy("ABC", "XYZ", crowdsaleTokenDecimals);
    inputToken = await MockERC20.connect(investor).deploy("DUM", "DUMMY", inputTokenDecimals);
  
    await crowdsaleToken.connect(deployer).approve(proxyContract.address, amountAllocation);
  
    startTime = (await latestTimestamp()) + 100;
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
    return newCrowdsale;
  };

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
      "address[]",
      "uint256[]",
      "bytes",
      "bytes",
      "address",
      "string",
      "uint256",
      "uint256",
    ],
    [
      crowdsaleToken,
      amountAllocation,
      inputTokens,
      rate,
      crowdsaleTimings,
      whitelist,
      crowdsaleOwner,
      tokenURL,
      minTokenSaleAmount,
      maxUserAllocation,
    ]
  );

  return encodedData;
};