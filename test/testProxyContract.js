const { expect } = require("chai");
const { ethers } = require("hardhat");
const Web3 = require("web3");
const web3 = new Web3();

describe("ProxyContract", function async() {
  let owner, deployer, otherAccount, launchpadFactory, proxyContract, crowdsaleToken;

  beforeEach(async () => {
    accounts = await ethers.getSigners();
    owner = accounts[0];
    deployer = accounts[1];
    otherAccount = accounts[2];

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    crowdsaleToken = await MockERC20.connect(deployer).deploy("ABC", "XYZ", 18);

    const LaunchpadFactory = await ethers.getContractFactory("MockLaunchpadFactory");
    launchpadFactory = await LaunchpadFactory.connect(owner).deploy();

    const ProxyContract = await ethers.getContractFactory("ProxyContract");
    proxyContract = await ProxyContract.connect(owner).deploy(
      owner.address,
      launchpadFactory.address
    );

    await launchpadFactory.setCrowdsaleLauncher(proxyContract.address);
  });

  it("should launch new crowdsale", async function () {
    const amountAllocation = BigInt(100e18);

    await proxyContract.connect(owner).addDeployerAddress(deployer.address);

    await crowdsaleToken.connect(deployer).approve(proxyContract.address, amountAllocation);

    const encodedData = web3.eth.abi.encodeParameters(
      ["address", "uint256"],
      [crowdsaleToken.address, amountAllocation]
    );

    const tx = await proxyContract.connect(deployer).launchCrowdsale(1, encodedData);
    const receipt = await tx.wait();
    const crowdsale = receipt.events[2].topics[1];

    expect(Number(crowdsale)).to.equal(Number(await launchpadFactory.MOCK_CROWDSALE_ADDRESS()));
  });

  it("should have the correct initial roles", async function () {
    expect(
      await proxyContract.hasRole(
        await proxyContract.DEFAULT_ADMIN_ROLE(),
        owner.address
      )
    ).to.be.true;

    expect(
      await proxyContract.hasRole(
        await proxyContract.DEPLOYER_ROLE(),
        owner.address
      )
    ).to.be.true;
  });

  it("should add and remove deployer", async function () {
    await proxyContract.connect(owner).addDeployerAddress(deployer.address);
    expect(
      await proxyContract.hasRole(
        await proxyContract.DEPLOYER_ROLE(),
        deployer.address
      )
    ).to.be.true;

    await proxyContract.connect(owner).removeDeployerAddress(deployer.address);
    expect(
      await proxyContract.hasRole(
        await proxyContract.DEPLOYER_ROLE(),
        deployer.address
      )
    ).to.be.false;
  });

  it("should update launchpad factory address", async function () {
    await proxyContract.connect(owner).updateLaunchpadFactoryAddress(otherAccount.address);

    expect(await proxyContract.launchpadFactory()).to.equal(otherAccount.address);
  });

  it("should revert if non-admin tries to add deployer", async function () {
    await expect(
      proxyContract.connect(otherAccount).addDeployerAddress(deployer.address)
    ).to.be.revertedWith("Not the Admin");
  });

  it("should revert if non-deployer tries to launch crowdsale", async function () {
    await expect(
      proxyContract.connect(otherAccount).launchCrowdsale(1, "0x")
    ).to.be.revertedWith("Not the Deployer");
  });
});
