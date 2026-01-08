/**
 * Update baseURI on TrailNFT and SnapshotNFT contracts
 *
 * Usage:
 *   # Testnet (Amoy)
 *   PRIVATE_KEY=0x... npx hardhat run scripts/update-base-uri.cjs --network amoy
 *
 *   # Mainnet (Polygon)
 *   PRIVATE_KEY=0x... npx hardhat run scripts/update-base-uri.cjs --network polygon
 */

const { ethers } = require('hardhat');

// New base URI (Arweave gateway)
const NEW_BASE_URI = 'https://arweave.net/';

// Contract addresses
const CONTRACTS = {
  amoy: {
    trailNFT: '0xDAE66367ED26661974Dd7a69cC718829d2Ea8355',
    snapshotNFT: '0x2A93dB42D9b45EA136C2e9903f962cFF85097F16',
  },
  polygon: {
    trailNFT: '0x23BA06eeD9007052c9f95f7dC8E92B825399aAa1',
    snapshotNFT: '0x994b45d12DE1Cdf812d1302417F5c9DFab3E1a3C',
  },
};

const NFT_ABI = [
  'function setBaseURI(string calldata baseURI) external',
  'function owner() external view returns (address)',
];

async function main() {
  const [signer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  // Determine which network we're on
  let networkName;
  if (network.chainId === 80002n) {
    networkName = 'amoy';
    console.log('Network: Polygon Amoy (Testnet)');
  } else if (network.chainId === 137n) {
    networkName = 'polygon';
    console.log('Network: Polygon Mainnet');
  } else {
    throw new Error(`Unknown network: chainId ${network.chainId}`);
  }

  const addresses = CONTRACTS[networkName];
  console.log('Signer:', signer.address);
  console.log('New Base URI:', NEW_BASE_URI);
  console.log('');

  // Update TrailNFT
  console.log('='.repeat(50));
  console.log('Updating TrailNFT...');
  console.log('Address:', addresses.trailNFT);

  const trailNFT = new ethers.Contract(addresses.trailNFT, NFT_ABI, signer);

  try {
    const owner = await trailNFT.owner();
    console.log('Contract Owner:', owner);

    if (owner.toLowerCase() !== signer.address.toLowerCase()) {
      console.log('WARNING: Signer is not the owner! Transaction will fail.');
      console.log('Please use the owner wallet to run this script.');
    } else {
      console.log('Sending transaction...');
      const tx = await trailNFT.setBaseURI(NEW_BASE_URI);
      console.log('TX Hash:', tx.hash);
      await tx.wait();
      console.log('TrailNFT baseURI updated!');
    }
  } catch (error) {
    console.error('TrailNFT update failed:', error.message);
  }

  console.log('');

  // Update SnapshotNFT
  console.log('='.repeat(50));
  console.log('Updating SnapshotNFT...');
  console.log('Address:', addresses.snapshotNFT);

  const snapshotNFT = new ethers.Contract(addresses.snapshotNFT, NFT_ABI, signer);

  try {
    const owner = await snapshotNFT.owner();
    console.log('Contract Owner:', owner);

    if (owner.toLowerCase() !== signer.address.toLowerCase()) {
      console.log('WARNING: Signer is not the owner! Transaction will fail.');
      console.log('Please use the owner wallet to run this script.');
    } else {
      console.log('Sending transaction...');
      const tx = await snapshotNFT.setBaseURI(NEW_BASE_URI);
      console.log('TX Hash:', tx.hash);
      await tx.wait();
      console.log('SnapshotNFT baseURI updated!');
    }
  } catch (error) {
    console.error('SnapshotNFT update failed:', error.message);
  }

  console.log('');
  console.log('='.repeat(50));
  console.log('Done!');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
