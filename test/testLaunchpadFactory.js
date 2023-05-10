const { expect, assert } = require("chai");
const { parseEther } = require("ethers/lib/utils");
const { ethers } = require("hardhat");
const { BigNumber } = ethers.utils;
const Web3 = require('web3');
const web3 = new Web3();

describe("LaunchpadFactory", function async() {

  let erc20Contract, owner, launchpadFactoryContract, startTime, referrer;
  let crowdSaleLibrary, tokenURL = "ipfs://hlajsfohaslnfsf";
  beforeEach(async () => {
    accounts = await ethers.getSigners();
    owner = accounts[0];
    referrer = accounts[7];

    const MockERC20 = await ethers.getContractFactory("MockERC20");

    erc20Contract = await MockERC20.connect(owner).deploy(
      "DUM",
      "DUMMY",
      18
    );

    await erc20Contract.connect(owner).transfer(accounts[1].address, "500000000000000000000000");
    await erc20Contract.connect(owner).transfer(accounts[2].address, "500000000000000000000000");

    // const FeeManager = await ethers.getContractFactory('MockFeeManager');

    // const feeManager = await FeeManager.connect(owner).deploy();

    purchaseTokenContract = await MockERC20.connect(owner).deploy(
      "ABC",
      "XYZ",
      18
    );

    await purchaseTokenContract.connect(owner).transfer(accounts[2].address, "2000000000000000000");
    const LaunchpadFactory = await ethers.getContractFactory("LaunchpadFactory");
    launchpadFactoryContract = await LaunchpadFactory.connect(owner).deploy();
    const Crowdsale = await ethers.getContractFactory("Crowdsale");
    crowdSaleLibrary = await Crowdsale.deploy();
    const ownerAddress = await launchpadFactoryContract.owner()
    console.log(ownerAddress, owner.address)
    // await launchpadFactoryContract.connect(owner).initialize(0)
    await launchpadFactoryContract.connect(owner).addImplementation(crowdSaleLibrary.address);
    // await launchpadFactoryContract.connect(owner).updateFeeManagerMode(false, feeManager.address);
    startTime = (Date.now() / 1000).toFixed() + 100;
    endTime = parseInt(startTime) + 10000;
    cliffDurationInSecs = parseInt(startTime) + 1000;

  });

  it("should successfully launch new crowdsale contract", async function () {
    const crowdsaleCreator = accounts[0];
    await erc20Contract.connect(crowdsaleCreator).approve(launchpadFactoryContract.address, 1000);

    const startTime = parseInt((Date.now() / 1000).toFixed()) + 1000;

    const crowdsaleTimings = web3.eth.abi.encodeParameters(
      ['uint128', 'uint128', 'uint128', 'uint128', 'uint128'],
      [startTime, '0', '0', '0', '0']
    );

    const whitelist = web3.eth.abi.encodeParameters(
      ['bool', 'address[]'],
      ["false", []],
    );

    const encodedData = web3.eth.abi.encodeParameters(
      ['address', 'uint256', 'address[]', 'uint256', 'bytes', 'bytes', 'address', 'string', 'uint256', 'uint256'],
      [erc20Contract.address, 100, [purchaseTokenContract.address], 1, crowdsaleTimings, whitelist, crowdsaleCreator.address, tokenURL, 10, 50]
    );
    console.log('data', [erc20Contract.address, 100, [purchaseTokenContract.address], 1, crowdsaleTimings, whitelist, crowdsaleCreator.address, tokenURL, 10])
    const txObject = await launchpadFactoryContract.connect(crowdsaleCreator).launchCrowdsale(
      0,
      encodedData
    );

    const receipt = await txObject.wait();

    assert.isOk(receipt.status);

    const newCrowdsaleAddress = await launchpadFactoryContract.crowdsales(0);

    const newCrowdsaleInstance = await ethers.getContractAt('Crowdsale', newCrowdsaleAddress.crowdsaleAddress);

    const owner = await newCrowdsaleInstance.owner();

    assert.equal(
      owner,
      crowdsaleCreator.address,
      "Invalid crowdsale owner"
    );

    const inContractStartTime = await newCrowdsaleInstance.crowdsaleStartTime();
    const inContractEndTime = await newCrowdsaleInstance.crowdsaleEndTime();
    const inContractCliffDurationTime = await newCrowdsaleInstance.cliffDuration();

    assert.strictEqual(
      inContractStartTime.eq(startTime),
      true,
      `Expected start time for crowdsale is ${startTime} but got ${inContractStartTime} `
    );

    assert.strictEqual(
      inContractEndTime.eq(0),
      true,
      `Expected start time for crowdsale is ${startTime} but got ${inContractEndTime} `
    );

    assert.strictEqual(
      inContractCliffDurationTime.eq(0),
      true,
      `Expected start time for crowdsale is ${startTime} but got ${inContractCliffDurationTime} `
    );

  });

  it("should successfully launch new crowdsale contract and whitelist user", async function () {

    const crowdsaleCreator = accounts[0];
    const whitelistUser = accounts[6];

    await erc20Contract.connect(crowdsaleCreator).approve(launchpadFactoryContract.address, 1000);

    const startTime = parseInt((Date.now() / 1000).toFixed()) + 1000;

    const crowdsaleTimings = web3.eth.abi.encodeParameters(
      ['uint128', 'uint128', 'uint128', 'uint128', 'uint128'],
      [startTime, '0', '0', '0', '0']
    );

    const whitelist = web3.eth.abi.encodeParameters(
      ['bool', 'address[]'],
      ["true", [whitelistUser.address]],
    );

    const encodedData = web3.eth.abi.encodeParameters(
      ['address', 'uint256', 'address[]', 'uint256', 'bytes', 'bytes', 'address', 'string', 'uint256', 'uint256'],
      [erc20Contract.address, 100, [purchaseTokenContract.address], 1, crowdsaleTimings, whitelist, crowdsaleCreator.address, tokenURL, 10, 50]
    );
    console.log([erc20Contract.address, 100, [purchaseTokenContract.address], 1, crowdsaleTimings, whitelist, crowdsaleCreator.address, tokenURL, 10]);
    const txObject = await launchpadFactoryContract.connect(crowdsaleCreator).launchCrowdsale(
      0,
      encodedData
    );

    const receipt = await txObject.wait();

    assert.isOk(receipt.status);

    const newCrowdsaleAddress = await launchpadFactoryContract.crowdsales(0);
    console.log({ newCrowdsaleAddress })
    const newCrowdsaleInstance = await ethers.getContractAt('Crowdsale', newCrowdsaleAddress.crowdsaleAddress);

    const owner = await newCrowdsaleInstance.owner();

    assert.equal(
      owner,
      crowdsaleCreator.address,
      "Invalid crowdsale owner"
    );

    const inContractStartTime = await newCrowdsaleInstance.crowdsaleStartTime();
    const inContractEndTime = await newCrowdsaleInstance.crowdsaleEndTime();
    const inContractCliffDurationTime = await newCrowdsaleInstance.cliffDuration();

    assert.strictEqual(
      inContractStartTime.eq(startTime),
      true,
      `Expected start time for crowdsale is ${startTime} but got ${inContractStartTime} `
    );

    assert.strictEqual(
      inContractEndTime.eq(0),
      true,
      `Expected start time for crowdsale is ${startTime} but got ${inContractEndTime} `
    );

    assert.strictEqual(
      inContractCliffDurationTime.eq(0),
      true,
      `Expected start time for crowdsale is ${startTime} but got ${inContractCliffDurationTime} `
    );

    const whitelistStatus = await newCrowdsaleInstance.whitelistedAddress(whitelistUser.address);

    assert.ok(whitelistStatus, "User must be whitelisted");

  });

  it("should successfully launch 2 crowdsale contracts", async function () {

    const crowdsaleCreator = accounts[0];
    const crowdsaleCreator2 = accounts[0];

    const approveTx = await erc20Contract.connect(crowdsaleCreator).approve(launchpadFactoryContract.address, 1000);
    const approveReceipt = await approveTx.wait();

    assert.isOk(approveReceipt.status);

    const startTime = parseInt((Date.now() / 1000).toFixed()) + 1000;

    const crowdsaleTimings = web3.eth.abi.encodeParameters(
      ['uint128', 'uint128', 'uint128', 'uint128', 'uint128'],
      [startTime, '0', '0', '0', '0']
    );

    const whitelist = web3.eth.abi.encodeParameters(
      ['bool', 'address[]'],
      ["false", []],
    );

    const encodedData = web3.eth.abi.encodeParameters(
      ['address', 'uint256', 'address[]', 'uint256', 'bytes', 'bytes', 'address', 'string', 'uint256', 'uint256'],
      [erc20Contract.address, 100, [purchaseTokenContract.address], 1, crowdsaleTimings, whitelist, crowdsaleCreator.address, tokenURL, 10, 50]
    );

    const txObject = await launchpadFactoryContract.connect(crowdsaleCreator).launchCrowdsale(
      0,
      encodedData
    );

    const receipt = await txObject.wait();

    assert.isOk(receipt.status);

    const newCrowdsaleAddress = await launchpadFactoryContract.crowdsales(0);

    const newCrowdsaleInstance = await ethers.getContractAt('Crowdsale', newCrowdsaleAddress.crowdsaleAddress);

    const owner = await newCrowdsaleInstance.owner();

    assert.equal(
      owner,
      crowdsaleCreator.address,
      "Invalid crowdsale owner"
    );

    const inContractStartTime = await newCrowdsaleInstance.crowdsaleStartTime();
    const inContractEndTime = await newCrowdsaleInstance.crowdsaleEndTime();
    const inContractCliffDurationTime = await newCrowdsaleInstance.cliffDuration();

    assert.strictEqual(
      inContractStartTime.eq(startTime),
      true,
      `Expected start time for crowdsale is ${startTime} but got ${inContractStartTime} `
    );

    assert.strictEqual(
      inContractEndTime.eq(0),
      true,
      `Expected start time for crowdsale is ${startTime} but got ${inContractEndTime} `
    );

    assert.strictEqual(
      inContractCliffDurationTime.eq(0),
      true,
      `Expected start time for crowdsale is ${startTime} but got ${inContractCliffDurationTime} `
    );

    assert.strictEqual(
      (await newCrowdsaleInstance.tokenMeta(erc20Contract.address)).imageUrl,
      tokenURL,
      'Incorrect token url set'
    );

    // launching 2nd crowdsale contract
    const tokenURL2 = "www.cryption.network/token.png";
    const approveTx2 = await erc20Contract.connect(crowdsaleCreator2).approve(launchpadFactoryContract.address, 1000);
    const approveReceipt2 = await approveTx2.wait();

    assert.isOk(approveReceipt2.status);

    const startTime2 = parseInt((Date.now() / 1000).toFixed()) + 1000;

    const crowdsaleTimings2 = web3.eth.abi.encodeParameters(
      ['uint128', 'uint128', 'uint128', 'uint128', 'uint128'],
      [startTime2, '0', '0', '0', '0']
    );

    const encodedData2 = web3.eth.abi.encodeParameters(
      ['address', 'uint256', 'address[]', 'uint256', 'bytes', 'bytes', 'address', 'string', 'uint256', 'uint256'],
      [erc20Contract.address, 100, [purchaseTokenContract.address], 1, crowdsaleTimings2, whitelist, crowdsaleCreator2.address, tokenURL2, 10, 50]
    );

    const txObject2 = await launchpadFactoryContract.connect(crowdsaleCreator2).launchCrowdsale(
      0,
      encodedData2
    );

    const receipt2 = await txObject2.wait();

    assert.isOk(receipt2.status);

    const newCrowdsaleAddress2 = await launchpadFactoryContract.crowdsales(1);

    const newCrowdsaleInstance2 = await ethers.getContractAt('Crowdsale', newCrowdsaleAddress2.crowdsaleAddress);

    const owner2 = await newCrowdsaleInstance2.owner();

    assert.equal(
      owner2,
      crowdsaleCreator2.address,
      "Invalid crowdsale owner"
    );

    const inContractStartTime2 = await newCrowdsaleInstance2.crowdsaleStartTime();
    const inContractEndTime2 = await newCrowdsaleInstance2.crowdsaleEndTime();
    const inContractCliffDurationTime2 = await newCrowdsaleInstance2.cliffDuration();

    assert.strictEqual(
      inContractStartTime2.eq(startTime2),
      true,
      `Expected start time for crowdsale is ${startTime} but got ${inContractStartTime2} `
    );

    assert.strictEqual(
      inContractEndTime2.eq(0),
      true,
      `Expected start time for crowdsale is ${startTime} but got ${inContractEndTime2} `
    );

    assert.strictEqual(
      inContractCliffDurationTime2.eq(0),
      true,
      `Expected start time for crowdsale is ${startTime} but got ${inContractCliffDurationTime2} `
    );

    assert.strictEqual(
      (await newCrowdsaleInstance2.tokenMeta(erc20Contract.address)).imageUrl,
      tokenURL2,
      'Incorrect token url set'
    );

  });

  it("should successfully launch new crowdsale contract and updating minimum token sale limit", async function () {
    const crowdsaleCreator = accounts[0];
    await erc20Contract.connect(crowdsaleCreator).approve(launchpadFactoryContract.address, 1000);

    const startTime = parseInt((Date.now() / 1000).toFixed()) + 1000;

    const crowdsaleTimings = web3.eth.abi.encodeParameters(
      ['uint128', 'uint128', 'uint128', 'uint128', 'uint128'],
      [startTime, '0', '0', '0', '0']
    );

    const whitelist = web3.eth.abi.encodeParameters(
      ['bool', 'address[]'],
      ["false", []],
    );

    const encodedData = web3.eth.abi.encodeParameters(
      ['address', 'uint256', 'address[]', 'uint256', 'bytes', 'bytes', 'address', 'string', 'uint256', 'uint256'],
      [erc20Contract.address, 100, [purchaseTokenContract.address], 1, crowdsaleTimings, whitelist, crowdsaleCreator.address, tokenURL, 10, 50]
    );
    console.log('data', [erc20Contract.address, 100, [purchaseTokenContract.address], 1, crowdsaleTimings, whitelist, crowdsaleCreator.address, tokenURL, 10])
    const txObject = await launchpadFactoryContract.connect(crowdsaleCreator).launchCrowdsale(
      0,
      encodedData
    );

    const receipt = await txObject.wait();

    assert.isOk(receipt.status);

    const newCrowdsaleAddress = await launchpadFactoryContract.crowdsales(0);

    const newCrowdsaleInstance = await ethers.getContractAt('Crowdsale', newCrowdsaleAddress.crowdsaleAddress);

    const owner = await newCrowdsaleInstance.owner();
    const txObject2 = await newCrowdsaleInstance.connect(crowdsaleCreator).updateMinimumTokenSaleAmount(15);
    const receipt2 = await txObject2.wait();

    console.log(receipt2)

    assert.equal(
      owner,
      crowdsaleCreator.address,
      "Invalid crowdsale owner"
    );

    const inContractStartTime = await newCrowdsaleInstance.crowdsaleStartTime();
    const inContractEndTime = await newCrowdsaleInstance.crowdsaleEndTime();
    const inContractCliffDurationTime = await newCrowdsaleInstance.cliffDuration();

    assert.strictEqual(
      inContractStartTime.eq(startTime),
      true,
      `Expected start time for crowdsale is ${startTime} but got ${inContractStartTime} `
    );

    assert.strictEqual(
      inContractEndTime.eq(0),
      true,
      `Expected start time for crowdsale is ${startTime} but got ${inContractEndTime} `
    );

    assert.strictEqual(
      inContractCliffDurationTime.eq(0),
      true,
      `Expected start time for crowdsale is ${startTime} but got ${inContractCliffDurationTime} `
    );

  });

  it("should successfully launch new crowdsale contract and Add qualification Contract", async function () {
    const crowdsaleCreator = accounts[0];
    const MockCrowdsaleQualification = await ethers.getContractFactory("MockCrowdsaleQualification");
    const mockCrowdsaleQualification = await MockCrowdsaleQualification.connect(crowdsaleCreator).deploy();

    await erc20Contract.connect(crowdsaleCreator).approve(launchpadFactoryContract.address, "10000000000000000000000");

    const startTime = parseInt((Date.now() / 1000).toFixed()) - 1000;

    const crowdsaleTimings = web3.eth.abi.encodeParameters(
      ['uint128', 'uint128', 'uint128', 'uint128', 'uint128'],
      [startTime, '0', '0', '0', '0']
    );

    const whitelist = web3.eth.abi.encodeParameters(
      ['bool', 'address[]'],
      ["false", []],
    );

    const encodedData = web3.eth.abi.encodeParameters(
      ['address', 'uint256', 'address[]', 'uint256', 'bytes', 'bytes', 'address', 'string', 'uint256', 'uint256'],
      [erc20Contract.address, "100000000000000000000", [purchaseTokenContract.address], "1000000000000000000", crowdsaleTimings, whitelist, crowdsaleCreator.address, tokenURL, "10000000000000000000", "50000000000000000000"]
    );
    const txObject = await launchpadFactoryContract.connect(crowdsaleCreator).launchCrowdsale(
      0,
      encodedData
    );

    const receipt = await txObject.wait();

    assert.isOk(receipt.status);

    const newCrowdsaleAddress = await launchpadFactoryContract.crowdsales(0);

    const newCrowdsaleInstance = await ethers.getContractAt('Crowdsale', newCrowdsaleAddress.crowdsaleAddress);

    const owner = await newCrowdsaleInstance.owner();


    const txForUpdatingQualificationContract = await newCrowdsaleInstance.connect(crowdsaleCreator).updateCrowdsaleQualificationAddress(mockCrowdsaleQualification.address)
    const receiptCheck = await txForUpdatingQualificationContract.wait();

    console.log(receiptCheck)

    const txForWhitelistUsers = await newCrowdsaleInstance.connect(crowdsaleCreator).whitelistUsers([accounts[2].address]);
    const receiptForWhitelistUsers = await txForWhitelistUsers.wait();

    console.log(receiptForWhitelistUsers)
    const approveTx = await purchaseTokenContract.connect(accounts[2]).approve(newCrowdsaleInstance.address, "20000000000000000000");
    const approveReceipt = await approveTx.wait()
    console.log(approveReceipt)
    const purchaseTx = await newCrowdsaleInstance.connect(accounts[2]).purchaseToken(purchaseTokenContract.address, "20000000000000000")
    const purchaseReceipt = await purchaseTx.wait()

    console.log(purchaseReceipt)

    assert.equal(
      owner,
      crowdsaleCreator.address,
      "Invalid crowdsale owner"
    );

    const inContractStartTime = await newCrowdsaleInstance.crowdsaleStartTime();
    const inContractEndTime = await newCrowdsaleInstance.crowdsaleEndTime();
    const inContractCliffDurationTime = await newCrowdsaleInstance.cliffDuration();

    assert.strictEqual(
      inContractStartTime.eq(startTime),
      true,
      `Expected start time for crowdsale is ${startTime} but got ${inContractStartTime} `
    );

    assert.strictEqual(
      inContractEndTime.eq(0),
      true,
      `Expected start time for crowdsale is ${startTime} but got ${inContractEndTime} `
    );

    assert.strictEqual(
      inContractCliffDurationTime.eq(0),
      true,
      `Expected start time for crowdsale is ${startTime} but got ${inContractCliffDurationTime} `
    );

  });
});