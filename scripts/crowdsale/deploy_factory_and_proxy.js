const hre = require("hardhat");

async function main() {

  const deployerAccount = await hre.reef.getSignerByName("testnet_account");

  const LaunchpadFactory = await hre.reef.getContractFactory("LaunchpadFactory", deployerAccount);
  const launchpadFactoryInstance = await LaunchpadFactory.deploy();
  await launchpadFactoryInstance.deployed();

  await launchpadFactoryInstance.deployTransaction.wait([(confirms = 20)]);

  console.log("1/3 Launchpad factory deployed:", launchpadFactoryInstance.address);

  await hre.reef.verifyContract(
    launchpadFactoryInstance.address,
    "LaunchpadFactory",
    []
  );

  ////// deploy proxy

  const ProxyContract = await hre.reef.getContractFactory(
      "ProxyContract",
      deployerAccount
  );

  const proxyAdminAddress = deployerAccount.getAddress();
  const launchpadFactoryAddress = launchpadFactoryInstance.address;
  const proxyContractInstance = await ProxyContract.deploy(
      proxyAdminAddress,
      launchpadFactoryAddress
  );
  await proxyContractInstance.deployed();

  await proxyContractInstance.deployTransaction.wait([(confirms = 20)]);

  console.log("2/3 Proxy Contract deployed:", proxyContractInstance.address);

  await hre.reef.verifyContract(
      proxyContractInstance.address,
      "ProxyContract",
      [proxyAdminAddress, launchpadFactoryAddress]
  );

  await launchpadFactoryInstance.setCrowdsaleLauncher(proxyContractInstance.address);

  console.log('3/3 Crowdsale launcher set to proxy');

  console.log('All complete');

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
