const hre = require("hardhat");

async function main() {
  const deployerAccount = await hre.reef.getSignerByName("testnet_account");

  const ProxyContract = await hre.reef.getContractFactory(
    "ProxyContract",
    deployerAccount
  );


  const adminAddress = "0x7Ca7886e0b851e6458770BC1d85Feb6A5307b9a2";
  const launchpadFactoryAddress = "0xf81e2d6eB63F854062e08Dc66808CA32133dBff5";
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

  console.log("Deployed and verified");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
