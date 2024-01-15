const hre = require("hardhat");

async function main() {
  const deployerAccount = await hre.reef.getSignerByName("testnet_account");

  const ProxyContract = await hre.reef.getContractFactory(
    "ProxyContract",
    deployerAccount
  );


  const adminAddress = "0xF999Ae50435a8add9055B55c025d1F294A9545F2";
  const launchpadFactoryAddress = "0x56382c3AA1d402549505Ee3a19E4C1E472524F43";
  const proxyContractInstance = await ProxyContract.attach("0x90FA0aB7d72cfcdF7c76Cce2aE9430461A500F3A")
  /*const proxyContractInstance = await ProxyContract.deploy(
    adminAddress,
    launchpadFactoryAddress
  );
  await proxyContractInstance.deployed();

  await proxyContractInstance.deployTransaction.wait([(confirms = 20)]);*/

  console.log("Deploy done");
  console.log("Proxy Contract deployed:", proxyContractInstance.address);

  await hre.reef.verifyContract(
    proxyContractInstance.address,
    "ProxyContract",
    [adminAddress, launchpadFactoryAddress]
  );

  console.log("Deployed and verified");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
