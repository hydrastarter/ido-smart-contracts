const hre = require("hardhat");

async function main() {
    const contractAddress = "0x61BD471D713b2E24b511bB0b598ec0Da3ba8DBef";
    const signer = await hre.reef.getSignerByName("testnet_account");
    const LaunchpadFactory = await hre.reef.getContractAt("LaunchpadFactory", contractAddress, signer);

    await LaunchpadFactory.addImplementation("0x4F89489c7F5b6d665f6089157e249dF67Ed46f96");

    console.log("Current Implementation", await LaunchpadFactory.implementationIdVsImplementation(0));
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
