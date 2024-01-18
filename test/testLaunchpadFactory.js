const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const Web3 = require("web3");
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

    startTime = (Date.now() / 1000).toFixed() + 100;
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
    await proxyContract.connect(owner).addDeployerAddress(deployer.address);

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
      rate,
      crowdsaleOwner.address,
      tokenURL,
      minTokenSaleAmount,
      maxUserAllocation
    );

    const tx = await proxyContract.connect(deployer).launchCrowdsale(0, encodedData);
    const receipt = await tx.wait();
    assert.isOk(receipt.status);

    const newCrowdsaleObj = await launchpadFactory.crowdsales(0);
    const newCrowdsale = await ethers.getContractAt(
      "Crowdsale",
      newCrowdsaleObj.crowdsaleAddress
    );

    const newCrowdsaleOwner = await newCrowdsale.owner();
    const newCrowdsaleToken = await newCrowdsale.token();
    const newCrowdsaleIsValidInputToken = await newCrowdsale.validInputToken(inputToken.address);
    const newCrowdsaleInputToken = await newCrowdsale.inputToken(0);
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
      "Invalid crowdsale input token"
    );
    assert.equal(
      newCrowdsaleInputToken,
      inputToken.address,
      "Invalid crowdsale input token"
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

  it("should update owner of LaunchpadFactory", async function () {
    await launchpadFactory.connect(owner).transferOwnership(otherAccount.address);
    expect(await launchpadFactory.owner()).to.equal(otherAccount.address);
  });

  // it("should successfully launch new crowdsale contract and whitelist user", async function () {

  //   const crowdsaleCreator = accounts[0];
  //   const whitelistUser = accounts[6];

  //   await erc20Contract.connect(crowdsaleCreator).approve(launchpadFactoryContract.address, 1000);

  //   const startTime = parseInt((Date.now() / 1000).toFixed()) + 1000;

  //   const crowdsaleTimings = web3.eth.abi.encodeParameters(
  //     ['uint128', 'uint128', 'uint128', 'uint128', 'uint128'],
  //     [startTime, '0', '0', '0', '0']
  //   );

  //   const whitelist = web3.eth.abi.encodeParameters(
  //     ['bool', 'address[]'],
  //     ["true", [whitelistUser.address]],
  //   );

  //   const encodedData = web3.eth.abi.encodeParameters(
  //     ['address', 'uint256', 'address[]', 'uint256', 'bytes', 'bytes', 'address', 'string', 'uint256', 'uint256'],
  //     [erc20Contract.address, 100, [purchaseTokenContract.address], 1, crowdsaleTimings, whitelist, crowdsaleCreator.address, tokenURL, 10, 50]
  //   );
  //   console.log([erc20Contract.address, 100, [purchaseTokenContract.address], 1, crowdsaleTimings, whitelist, crowdsaleCreator.address, tokenURL, 10]);
  //   const txObject = await launchpadFactoryContract.connect(crowdsaleCreator).launchCrowdsale(
  //     0,
  //     encodedData
  //   );

  //   const receipt = await txObject.wait();

  //   assert.isOk(receipt.status);

  //   const newCrowdsaleAddress = await launchpadFactoryContract.crowdsales(0);
  //   console.log({ newCrowdsaleAddress })
  //   const newCrowdsaleInstance = await ethers.getContractAt('Crowdsale', newCrowdsaleAddress.crowdsaleAddress);

  //   const owner = await newCrowdsaleInstance.owner();

  //   assert.equal(
  //     owner,
  //     crowdsaleCreator.address,
  //     "Invalid crowdsale owner"
  //   );

  //   const inContractStartTime = await newCrowdsaleInstance.crowdsaleStartTime();
  //   const inContractEndTime = await newCrowdsaleInstance.crowdsaleEndTime();
  //   const inContractCliffDurationTime = await newCrowdsaleInstance.cliffDuration();

  //   assert.strictEqual(
  //     inContractStartTime.eq(startTime),
  //     true,
  //     `Expected start time for crowdsale is ${startTime} but got ${inContractStartTime} `
  //   );

  //   assert.strictEqual(
  //     inContractEndTime.eq(0),
  //     true,
  //     `Expected start time for crowdsale is ${startTime} but got ${inContractEndTime} `
  //   );

  //   assert.strictEqual(
  //     inContractCliffDurationTime.eq(0),
  //     true,
  //     `Expected start time for crowdsale is ${startTime} but got ${inContractCliffDurationTime} `
  //   );

  //   const whitelistStatus = await newCrowdsaleInstance.whitelistedAddress(whitelistUser.address);

  //   assert.ok(whitelistStatus, "User must be whitelisted");

  // });

  // it("should successfully launch 2 crowdsale contracts", async function () {

  //   const crowdsaleCreator = accounts[0];
  //   const crowdsaleCreator2 = accounts[0];

  //   const approveTx = await erc20Contract.connect(crowdsaleCreator).approve(launchpadFactoryContract.address, 1000);
  //   const approveReceipt = await approveTx.wait();

  //   assert.isOk(approveReceipt.status);

  //   const startTime = parseInt((Date.now() / 1000).toFixed()) + 1000;

  //   const crowdsaleTimings = web3.eth.abi.encodeParameters(
  //     ['uint128', 'uint128', 'uint128', 'uint128', 'uint128'],
  //     [startTime, '0', '0', '0', '0']
  //   );

  //   const whitelist = web3.eth.abi.encodeParameters(
  //     ['bool', 'address[]'],
  //     ["false", []],
  //   );

  //   const encodedData = web3.eth.abi.encodeParameters(
  //     ['address', 'uint256', 'address[]', 'uint256', 'bytes', 'bytes', 'address', 'string', 'uint256', 'uint256'],
  //     [erc20Contract.address, 100, [purchaseTokenContract.address], 1, crowdsaleTimings, whitelist, crowdsaleCreator.address, tokenURL, 10, 50]
  //   );

  //   const txObject = await launchpadFactoryContract.connect(crowdsaleCreator).launchCrowdsale(
  //     0,
  //     encodedData
  //   );

  //   const receipt = await txObject.wait();

  //   assert.isOk(receipt.status);

  //   const newCrowdsaleAddress = await launchpadFactoryContract.crowdsales(0);

  //   const newCrowdsaleInstance = await ethers.getContractAt('Crowdsale', newCrowdsaleAddress.crowdsaleAddress);

  //   const owner = await newCrowdsaleInstance.owner();

  //   assert.equal(
  //     owner,
  //     crowdsaleCreator.address,
  //     "Invalid crowdsale owner"
  //   );

  //   const inContractStartTime = await newCrowdsaleInstance.crowdsaleStartTime();
  //   const inContractEndTime = await newCrowdsaleInstance.crowdsaleEndTime();
  //   const inContractCliffDurationTime = await newCrowdsaleInstance.cliffDuration();

  //   assert.strictEqual(
  //     inContractStartTime.eq(startTime),
  //     true,
  //     `Expected start time for crowdsale is ${startTime} but got ${inContractStartTime} `
  //   );

  //   assert.strictEqual(
  //     inContractEndTime.eq(0),
  //     true,
  //     `Expected start time for crowdsale is ${startTime} but got ${inContractEndTime} `
  //   );

  //   assert.strictEqual(
  //     inContractCliffDurationTime.eq(0),
  //     true,
  //     `Expected start time for crowdsale is ${startTime} but got ${inContractCliffDurationTime} `
  //   );

  //   assert.strictEqual(
  //     (await newCrowdsaleInstance.tokenMeta(erc20Contract.address)).imageUrl,
  //     tokenURL,
  //     'Incorrect token url set'
  //   );

  //   // launching 2nd crowdsale contract
  //   const tokenURL2 = "www.cryption.network/token.png";
  //   const approveTx2 = await erc20Contract.connect(crowdsaleCreator2).approve(launchpadFactoryContract.address, 1000);
  //   const approveReceipt2 = await approveTx2.wait();

  //   assert.isOk(approveReceipt2.status);

  //   const startTime2 = parseInt((Date.now() / 1000).toFixed()) + 1000;

  //   const crowdsaleTimings2 = web3.eth.abi.encodeParameters(
  //     ['uint128', 'uint128', 'uint128', 'uint128', 'uint128'],
  //     [startTime2, '0', '0', '0', '0']
  //   );

  //   const encodedData2 = web3.eth.abi.encodeParameters(
  //     ['address', 'uint256', 'address[]', 'uint256', 'bytes', 'bytes', 'address', 'string', 'uint256', 'uint256'],
  //     [erc20Contract.address, 100, [purchaseTokenContract.address], 1, crowdsaleTimings2, whitelist, crowdsaleCreator2.address, tokenURL2, 10, 50]
  //   );

  //   const txObject2 = await launchpadFactoryContract.connect(crowdsaleCreator2).launchCrowdsale(
  //     0,
  //     encodedData2
  //   );

  //   const receipt2 = await txObject2.wait();

  //   assert.isOk(receipt2.status);

  //   const newCrowdsaleAddress2 = await launchpadFactoryContract.crowdsales(1);

  //   const newCrowdsaleInstance2 = await ethers.getContractAt('Crowdsale', newCrowdsaleAddress2.crowdsaleAddress);

  //   const owner2 = await newCrowdsaleInstance2.owner();

  //   assert.equal(
  //     owner2,
  //     crowdsaleCreator2.address,
  //     "Invalid crowdsale owner"
  //   );

  //   const inContractStartTime2 = await newCrowdsaleInstance2.crowdsaleStartTime();
  //   const inContractEndTime2 = await newCrowdsaleInstance2.crowdsaleEndTime();
  //   const inContractCliffDurationTime2 = await newCrowdsaleInstance2.cliffDuration();

  //   assert.strictEqual(
  //     inContractStartTime2.eq(startTime2),
  //     true,
  //     `Expected start time for crowdsale is ${startTime} but got ${inContractStartTime2} `
  //   );

  //   assert.strictEqual(
  //     inContractEndTime2.eq(0),
  //     true,
  //     `Expected start time for crowdsale is ${startTime} but got ${inContractEndTime2} `
  //   );

  //   assert.strictEqual(
  //     inContractCliffDurationTime2.eq(0),
  //     true,
  //     `Expected start time for crowdsale is ${startTime} but got ${inContractCliffDurationTime2} `
  //   );

  //   assert.strictEqual(
  //     (await newCrowdsaleInstance2.tokenMeta(erc20Contract.address)).imageUrl,
  //     tokenURL2,
  //     'Incorrect token url set'
  //   );

  // });

  // it("should successfully launch new crowdsale contract and updating minimum token sale limit", async function () {
  //   const crowdsaleCreator = accounts[0];
  //   await erc20Contract.connect(crowdsaleCreator).approve(launchpadFactoryContract.address, 1000);

  //   const startTime = parseInt((Date.now() / 1000).toFixed()) + 1000;

  //   const crowdsaleTimings = web3.eth.abi.encodeParameters(
  //     ['uint128', 'uint128', 'uint128', 'uint128', 'uint128'],
  //     [startTime, '0', '0', '0', '0']
  //   );

  //   const whitelist = web3.eth.abi.encodeParameters(
  //     ['bool', 'address[]'],
  //     ["false", []],
  //   );

  //   const encodedData = web3.eth.abi.encodeParameters(
  //     ['address', 'uint256', 'address[]', 'uint256', 'bytes', 'bytes', 'address', 'string', 'uint256', 'uint256'],
  //     [erc20Contract.address, 100, [purchaseTokenContract.address], 1, crowdsaleTimings, whitelist, crowdsaleCreator.address, tokenURL, 10, 50]
  //   );
  //   console.log('data', [erc20Contract.address, 100, [purchaseTokenContract.address], 1, crowdsaleTimings, whitelist, crowdsaleCreator.address, tokenURL, 10])
  //   const txObject = await launchpadFactoryContract.connect(crowdsaleCreator).launchCrowdsale(
  //     0,
  //     encodedData
  //   );

  //   const receipt = await txObject.wait();

  //   assert.isOk(receipt.status);

  //   const newCrowdsaleAddress = await launchpadFactoryContract.crowdsales(0);

  //   const newCrowdsaleInstance = await ethers.getContractAt('Crowdsale', newCrowdsaleAddress.crowdsaleAddress);

  //   const owner = await newCrowdsaleInstance.owner();
  //   const txObject2 = await newCrowdsaleInstance.connect(crowdsaleCreator).updateMinimumTokenSaleAmount(15);
  //   const receipt2 = await txObject2.wait();

  //   console.log(receipt2)

  //   assert.equal(
  //     owner,
  //     crowdsaleCreator.address,
  //     "Invalid crowdsale owner"
  //   );

  //   const inContractStartTime = await newCrowdsaleInstance.crowdsaleStartTime();
  //   const inContractEndTime = await newCrowdsaleInstance.crowdsaleEndTime();
  //   const inContractCliffDurationTime = await newCrowdsaleInstance.cliffDuration();

  //   assert.strictEqual(
  //     inContractStartTime.eq(startTime),
  //     true,
  //     `Expected start time for crowdsale is ${startTime} but got ${inContractStartTime} `
  //   );

  //   assert.strictEqual(
  //     inContractEndTime.eq(0),
  //     true,
  //     `Expected start time for crowdsale is ${startTime} but got ${inContractEndTime} `
  //   );

  //   assert.strictEqual(
  //     inContractCliffDurationTime.eq(0),
  //     true,
  //     `Expected start time for crowdsale is ${startTime} but got ${inContractCliffDurationTime} `
  //   );

  // });

  // it("should successfully launch new crowdsale contract and Add qualification Contract", async function () {
  //   const crowdsaleCreator = accounts[0];
  //   const MockCrowdsaleQualification = await ethers.getContractFactory("MockCrowdsaleQualification");
  //   const mockCrowdsaleQualification = await MockCrowdsaleQualification.connect(crowdsaleCreator).deploy();

  //   await erc20Contract.connect(crowdsaleCreator).approve(launchpadFactoryContract.address, "10000000000000000000000");

  //   const startTime = parseInt((Date.now() / 1000).toFixed()) - 1000;

  //   const crowdsaleTimings = web3.eth.abi.encodeParameters(
  //     ['uint128', 'uint128', 'uint128', 'uint128', 'uint128'],
  //     [startTime, '0', '0', '0', '0']
  //   );

  //   const whitelist = web3.eth.abi.encodeParameters(
  //     ['bool', 'address[]'],
  //     ["false", []],
  //   );

  //   const encodedData = web3.eth.abi.encodeParameters(
  //     ['address', 'uint256', 'address[]', 'uint256', 'bytes', 'bytes', 'address', 'string', 'uint256', 'uint256'],
  //     [erc20Contract.address, "100000000000000000000", [purchaseTokenContract.address], "1000000000000000000", crowdsaleTimings, whitelist, crowdsaleCreator.address, tokenURL, "10000000000000000000", "50000000000000000000"]
  //   );
  //   const txObject = await launchpadFactoryContract.connect(crowdsaleCreator).launchCrowdsale(
  //     0,
  //     encodedData
  //   );

  //   const receipt = await txObject.wait();

  //   assert.isOk(receipt.status);

  //   const newCrowdsaleAddress = await launchpadFactoryContract.crowdsales(0);

  //   const newCrowdsaleInstance = await ethers.getContractAt('Crowdsale', newCrowdsaleAddress.crowdsaleAddress);

  //   const owner = await newCrowdsaleInstance.owner();

  //   const txForUpdatingQualificationContract = await newCrowdsaleInstance.connect(crowdsaleCreator).updateCrowdsaleQualificationAddress(mockCrowdsaleQualification.address)
  //   const receiptCheck = await txForUpdatingQualificationContract.wait();

  //   console.log(receiptCheck)

  //   const txForWhitelistUsers = await newCrowdsaleInstance.connect(crowdsaleCreator).whitelistUsers([accounts[2].address]);
  //   const receiptForWhitelistUsers = await txForWhitelistUsers.wait();

  //   console.log(receiptForWhitelistUsers)
  //   const approveTx = await purchaseTokenContract.connect(accounts[2]).approve(newCrowdsaleInstance.address, "20000000000000000000");
  //   const approveReceipt = await approveTx.wait()
  //   console.log(approveReceipt)
  //   const purchaseTx = await newCrowdsaleInstance.connect(accounts[2]).purchaseToken(purchaseTokenContract.address, "20000000000000000")
  //   const purchaseReceipt = await purchaseTx.wait()

  //   console.log(purchaseReceipt)

  //   assert.equal(
  //     owner,
  //     crowdsaleCreator.address,
  //     "Invalid crowdsale owner"
  //   );

  //   const inContractStartTime = await newCrowdsaleInstance.crowdsaleStartTime();
  //   const inContractEndTime = await newCrowdsaleInstance.crowdsaleEndTime();
  //   const inContractCliffDurationTime = await newCrowdsaleInstance.cliffDuration();

  //   assert.strictEqual(
  //     inContractStartTime.eq(startTime),
  //     true,
  //     `Expected start time for crowdsale is ${startTime} but got ${inContractStartTime} `
  //   );

  //   assert.strictEqual(
  //     inContractEndTime.eq(0),
  //     true,
  //     `Expected start time for crowdsale is ${startTime} but got ${inContractEndTime} `
  //   );

  //   assert.strictEqual(
  //     inContractCliffDurationTime.eq(0),
  //     true,
  //     `Expected start time for crowdsale is ${startTime} but got ${inContractCliffDurationTime} `
  //   );

  // });

  it("should update LaunchpadFactory address", async function () {
    await proxyContract.updateLaunchpadFactoryAddress(
      "0x0B306BF915C4d645ff596e518fAf3F9669b97016"
    );
    expect(await proxyContract.launchpadFactory()).to.equal(
      "0x0B306BF915C4d645ff596e518fAf3F9669b97016"
    );
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
      "address[]",
      "uint256",
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

const toToken = (value, decimals = 18) => {
  return ethers.utils.parseUnits(value.toString(), decimals);
};

const toWei = (value) => {
  return ethers.utils.parseUnits(value.toString(), "wei");
};

const formatBigNumber = (bigNumber, decimals = 18) => {
  return Number(ethers.utils.formatUnits(bigNumber.toString(), decimals));
};