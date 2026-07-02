import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";
dotenv.config();

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: "0.8.20",
  paths: {
    tests: "./tests",
  },
  networks: {
    sepolia: {
      url: process.env.RPC_URL || "https://rpc.sepolia.org",
      accounts: process.env.PRIVATE_KEY && process.env.PRIVATE_KEY.length === 64 ? [process.env.PRIVATE_KEY] : [],
    },
  },
};
