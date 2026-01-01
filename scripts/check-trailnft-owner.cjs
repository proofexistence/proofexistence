const { ethers } = require('hardhat');

async function main() {
  const TRAIL_NFT = '0x23BA06eeD9007052c9f95f7dC8E92B825399aAa1';

  const trailNFT = await ethers.getContractAt(
    [
      'function owner() external view returns (address)',
      'function minter() external view returns (address)',
    ],
    TRAIL_NFT
  );

  console.log('TrailNFT:', TRAIL_NFT);
  console.log('Owner:', await trailNFT.owner());
  console.log('Current Minter:', await trailNFT.minter());
}

main().catch(console.error);
