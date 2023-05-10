require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("@reef-defi/hardhat-reef");
require("@openzeppelin/hardhat-upgrades");

module.exports = {
  networks: {
    localhost: {
      url: "http://localhost:8545", // uses account 0 of the hardhat node to deploy
    },
    // Mainnet reef network configuration
    reef_mainnet: {
      url: "wss://rpc.reefscan.info/ws",
      scanUrl: "https://api.reefscan.info/",
      seeds: {
        MyAccount1:
          process.env.SEED_PHRASE,
      },
    },
    // Testnet reef network configuration
    reef_testnet: {
      url: "wss://rpc-testnet.reefscan.com/ws",
      seeds: {
        MyAccount1:
          process.env.SEED_PHRASE,
      },
    },
  },
  plugins: ["solidity-coverage"],
  solidity: {
    compilers: [
      {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.7.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};