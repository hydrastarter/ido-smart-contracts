// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.

const hre = require("hardhat");


async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const testnetAccount = await hre.reef.getSignerByName("testnet_account");
  await testnetAccount.claimDefaultAccount();

  const Crowdsale = await hre.reef.getContractFactory("Crowdsale", testnetAccount);
  const crowdSaleInstance = await Crowdsale.deploy();

  await crowdSaleInstance.deployed();
  await crowdSaleInstance.deployTransaction.wait([(confirms = 20)]);
  console.log("Deploy done");

  console.log('Crowdsale address ', crowdSaleInstance.address);


  await hre.reef.verifyContract(crowdSaleInstance.address, "Crowdsale", []);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
