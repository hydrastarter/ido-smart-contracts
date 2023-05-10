const hre = require("hardhat");

async function main() {
    const contractAddress = "0xC58B97d8850f72A812BBdECA7Dd0672Ce406DAd4";
    const signer = await hre.reef.getSignerByName("MyAccount1");
    const LaunchpadFactory = await hre.reef.getContractAt("LaunchpadFactory", contractAddress, signer);

    await LaunchpadFactory.addImplementation("0xb0F6fF9478f73402262Ec9CF4B77fF47c3358C33");

    console.log("Current Implementation", await LaunchpadFactory.implementationIdVsImplementation(0));
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });