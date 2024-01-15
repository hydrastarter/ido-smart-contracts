const hre = require("hardhat");

async function main() {
  const deployerAccount = await hre.reef.getSignerByName("testnet_account");

  const LaunchpadFactory = await hre.reef.getContractFactory("LaunchpadFactory", deployerAccount);
  const launchpadFactoryInstance = await LaunchpadFactory.deploy();
  await launchpadFactoryInstance.deployed();

  await launchpadFactoryInstance.deployTransaction.wait([(confirms = 20)]);

  console.log("Deploy done");
  console.log("Launchpad factory deployed:", launchpadFactoryInstance.address);

  await hre.reef.verifyContract(
    launchpadFactoryInstance.address,
    "LaunchpadFactory",
    []
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
