/**
 * Mint missing NFT for user affected by unconfigured ProofRecorder
 *
 * Transaction: 0xd5cdbd740ba88325a9058a5a095e90ec3ea69b6409509a53f7f4ae74db5f4b0c
 * User paid 5 POL but received no NFT because ProofRecorder.trailNFT was not set.
 *
 * Run: npx hardhat run scripts/mint-missing-nft.cjs --network polygon
 */

const { ethers } = require('hardhat');

const TRAIL_NFT_ADDRESS = '0x23BA06eeD9007052c9f95f7dC8E92B825399aAa1';
const PROOF_RECORDER_V4 = '0x72Ac729a8f6efb68A5d6765EC375aC4578a3c756';

// Affected user details from tx 0xd5cdbd740ba88325a9058a5a095e90ec3ea69b6409509a53f7f4ae74db5f4b0c
const USER_ADDRESS = '0x94A202a48e094472A1f9Dc2bD50a913e499d0Ca2';
const ARWEAVE_HASH = 'wJ_PmUuqXcNJNwSGXWe2v6GTCFjMoDLTNZa0fdGWCgk';
const DURATION = 16; // seconds

async function main() {
  const [signer] = await ethers.getSigners();
  console.log('='.repeat(60));
  console.log('MINT MISSING NFT');
  console.log('='.repeat(60));
  console.log('');
  console.log('Signer:', signer.address);
  console.log('');
  console.log('Affected User:', USER_ADDRESS);
  console.log('Arweave Hash:', ARWEAVE_HASH);
  console.log('Duration:', DURATION, 'seconds');
  console.log('');

  const trailNFT = await ethers.getContractAt(
    [
      'function owner() view returns (address)',
      'function minter() view returns (address)',
      'function setMinter(address _minter) external',
      'function mint(address to, string calldata arweaveHash, uint256 duration) external returns (uint256)',
      'function totalSupply() view returns (uint256)',
    ],
    TRAIL_NFT_ADDRESS
  );

  // Verify ownership
  const owner = await trailNFT.owner();
  const currentMinter = await trailNFT.minter();

  console.log('TrailNFT owner:', owner);
  console.log('Current minter:', currentMinter);
  console.log('');

  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    console.error('❌ ERROR: Signer is not the TrailNFT owner!');
    console.error('   Expected:', owner);
    console.error('   Got:', signer.address);
    process.exit(1);
  }

  const supplyBefore = await trailNFT.totalSupply();
  console.log('Total supply before:', supplyBefore.toString());
  console.log('');

  // Step 1: Set minter to owner (ourselves)
  console.log('Step 1: Setting minter to owner...');
  let tx = await trailNFT.setMinter(signer.address);
  await tx.wait();
  console.log('✅ Minter set to:', signer.address);
  console.log('');

  // Step 2: Mint the NFT
  console.log('Step 2: Minting NFT for user...');
  tx = await trailNFT.mint(USER_ADDRESS, ARWEAVE_HASH, DURATION);
  const receipt = await tx.wait();
  console.log('✅ NFT minted! Tx:', receipt.hash);
  console.log('');

  // Step 3: Restore minter to ProofRecorder v4
  console.log('Step 3: Restoring minter to ProofRecorder v4...');
  tx = await trailNFT.setMinter(PROOF_RECORDER_V4);
  await tx.wait();
  console.log('✅ Minter restored to:', PROOF_RECORDER_V4);
  console.log('');

  const supplyAfter = await trailNFT.totalSupply();
  console.log('Total supply after:', supplyAfter.toString());
  console.log('');

  console.log('='.repeat(60));
  console.log('✅ DONE! Token #' + (supplyAfter - 1n).toString() + ' minted for', USER_ADDRESS);
  console.log('='.repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
