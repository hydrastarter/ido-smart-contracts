const hre = require("hardhat");

async function main() {
  const deployerAccount = await hre.reef.getSignerByName("MyAccount1");

  const ProxyContract = await hre.reef.getContractFactory(
    "ProxyContract",
    deployerAccount
  );
  const adminAddress = "0x557834D643b70A0E8015B0e1c174d512a8d67332";
  const launchpadFactoryAddress = "0xC58B97d8850f72A812BBdECA7Dd0672Ce406DAd4";
  const proxyContractInstance = await ProxyContract.deploy(
    adminAddress,
    launchpadFactoryAddress
  );
  await proxyContractInstance.deployed();

  await proxyContractInstance.deployTransaction.wait([(confirms = 20)]);

  console.log("Deploy done");
  console.log("Proxy Contract deployed:", proxyContractInstance.address);

  await hre.reef.verifyContract(
    proxyContractInstance.address,
    "ProxyContract",
    [adminAddress, launchpadFactoryAddress]
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
