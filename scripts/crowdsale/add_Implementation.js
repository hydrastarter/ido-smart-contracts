const hre = require("hardhat");

async function main() {
    const contractAddress = "0x219c9F5C9b8548aA7925f71650D131C474f9c62c";
    const signer = await hre.reef.getSignerByName("testnet_account");
    const LaunchpadFactory = await hre.reef.getContractAt("LaunchpadFactory", contractAddress, signer);

    await LaunchpadFactory.addImplementation("0xf81e2d6eB63F854062e08Dc66808CA32133dBff5");

    console.log("Current Implementation", await LaunchpadFactory.implementationIdVsImplementation(0));
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
