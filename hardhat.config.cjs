require('@nomiclabs/hardhat-ethers');
require('dotenv').config({ path: '.env.local' });

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const POLYGON_AMOY_RPC_URL =
  process.env.POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology/';
const POLYGON_MAINNET_RPC_URL =
  process.env.POLYGON_MAINNET_RPC_URL || 'https://polygon-rpc.com/';

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: '0.8.27',
  paths: {
    artifacts: './artifacts',
    cache: './cache',
    sources: './contracts',
    tests: './test',
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    localhost: {
      url: 'http://127.0.0.1:8545',
    },
    amoy: {
      url: POLYGON_AMOY_RPC_URL,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 80002,
    },
    polygon: {
      url: POLYGON_MAINNET_RPC_URL,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 137,
    },
  },
};
