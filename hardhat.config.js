require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("@reef-chain/hardhat-reef");
require("@openzeppelin/hardhat-upgrades");

module.exports = {
  defaultNetwork: "reef_mainnet",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545/", // uses account 0 of the hardhat node to deploy
    },
    reef_testnet: {
      url: "wss://rpc-testnet.reefscan.com/ws",
      scanUrl: "https://api-testnet.reefscan.com",
      seeds: {
        testnet_account: process.env.MNEMONIC_TESTNET|| "expire pepper arena virus budget craft industry hawk devote major symbol labor",
        proxy_admin_account: process.env.MNEMONIC_TESTNET|| "expire pepper arena virus budget craft industry hawk devote major symbol labor",
      },
    },
    reef_mainnet: {
      url: "wss://rpc.reefscan.com/ws",
      scanUrl: "https://api.reefscan.com",
      seeds: {
        testnet_account: process.env.MNEMONIC_MAINNET || "expire pepper arena virus budget craft industry hawk devote major symbol labor",
      },
    },
  },
  plugins: ["solidity-coverage"],
  solidity: {
    compilers: [
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
