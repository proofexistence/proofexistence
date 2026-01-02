/**
 * Deploy NEW ProofRecorder and update TrailNFT minter
 *
 * This script:
 * 1. Deploys a new ProofRecorder with correct Treasury/Operator/Owner
 * 2. Updates TrailNFT to point to the new ProofRecorder
 * 3. Does NOT transfer ownership (keeps deployer as owner)
 *
 * Usage:
 *   npx hardhat run scripts/deploy-new-proof-recorder.cjs --network polygon
 *
 * Requirements:
 *   - Must be run by: 0xA7D2A0647F1f12455f543Db4CaA350e85C0Eae09
 *   - Ensure you have enough POL for gas (~0.1 POL should be enough)
 */

const { ethers } = require('hardhat');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('');
  console.log('===========================================');
  console.log('  Deploy New ProofRecorder');
  console.log('===========================================');
  console.log('');
  console.log('Deployer:', deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('Balance:', ethers.formatEther(balance), 'POL');
  console.log('');

  // ============================================================
  // CONFIGURATION
  // ============================================================

  // Existing contracts (DO NOT CHANGE)
  const TIME26_ADDRESS = '0x56C79b61FFc3D826188DB700791F1A7ECb007FD0';
  const TRAIL_NFT_ADDRESS = '0x23BA06eeD9007052c9f95f7dC8E92B825399aAa1';

  // New addresses
  const NEW_TREASURY = '0xBDA2B288154339F88F886949F4CC9dF7D2491f6D';
  const NEW_OPERATOR = '0x0Af9d487E8AEaf2B9d0409EDa53fA751d01aF8d1';
  const NEW_OWNER = deployer.address; // Keep as deployer this time!

  console.log('Configuration:');
  console.log('  Time26:', TIME26_ADDRESS);
  console.log('  TrailNFT:', TRAIL_NFT_ADDRESS);
  console.log('  New Treasury:', NEW_TREASURY);
  console.log('  New Operator:', NEW_OPERATOR);
  console.log('  New Owner:', NEW_OWNER);
  console.log('');

  // ============================================================
  // STEP 1: Deploy new ProofRecorder
  // ============================================================
  console.log('Step 1: Deploying new ProofRecorder...');

  const ProofRecorder = await ethers.getContractFactory('ProofRecorder');
  const proofRecorder = await ProofRecorder.deploy(
    TIME26_ADDRESS,
    NEW_TREASURY,
    NEW_OPERATOR,
    NEW_OWNER
  );
  await proofRecorder.waitForDeployment();
  const proofRecorderAddress = await proofRecorder.getAddress();

  console.log('  ✅ ProofRecorder deployed:', proofRecorderAddress);
  console.log('');

  // ============================================================
  // STEP 2: Update TrailNFT minter
  // ============================================================
  console.log('Step 2: Updating TrailNFT minter...');

  const TRAIL_NFT_ABI = [
    'function owner() view returns (address)',
    'function minter() view returns (address)',
    'function setMinter(address _minter) external',
  ];
  const trailNFT = new ethers.Contract(
    TRAIL_NFT_ADDRESS,
    TRAIL_NFT_ABI,
    deployer
  );

  // Check ownership
  const trailOwner = await trailNFT.owner();
  if (trailOwner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.error('  ❌ ERROR: You are not the owner of TrailNFT!');
    console.error('     Owner:', trailOwner);
    console.error('     You:', deployer.address);
    process.exit(1);
  }

  const oldMinter = await trailNFT.minter();
  console.log('  Old minter:', oldMinter);

  const tx = await trailNFT.setMinter(proofRecorderAddress);
  console.log('  TX:', tx.hash);
  await tx.wait();

  const newMinter = await trailNFT.minter();
  console.log('  ✅ New minter:', newMinter);
  console.log('');

  // ============================================================
  // STEP 3: Verify deployment
  // ============================================================
  console.log('Step 3: Verification...');

  const prOwner = await proofRecorder.owner();
  const prTreasury = await proofRecorder.treasury();
  const prOperator = await proofRecorder.operator();

  console.log('  ProofRecorder:');
  console.log('    Address:', proofRecorderAddress);
  console.log(
    '    Owner:',
    prOwner,
    prOwner.toLowerCase() === NEW_OWNER.toLowerCase() ? '✅' : '❌'
  );
  console.log(
    '    Treasury:',
    prTreasury,
    prTreasury.toLowerCase() === NEW_TREASURY.toLowerCase() ? '✅' : '❌'
  );
  console.log(
    '    Operator:',
    prOperator,
    prOperator.toLowerCase() === NEW_OPERATOR.toLowerCase() ? '✅' : '❌'
  );
  console.log('');
  console.log('  TrailNFT:');
  console.log(
    '    Minter:',
    newMinter,
    newMinter.toLowerCase() === proofRecorderAddress.toLowerCase() ? '✅' : '❌'
  );
  console.log('');

  // ============================================================
  // NEXT STEPS
  // ============================================================
  console.log('===========================================');
  console.log('  🎉 Deployment Complete!');
  console.log('===========================================');
  console.log('');
  console.log('New ProofRecorder:', proofRecorderAddress);
  console.log('');
  console.log('NEXT STEPS:');
  console.log('');
  console.log('1. Update src/lib/contracts.ts:');
  console.log(`   PROOF_RECORDER_ADDRESS = '${proofRecorderAddress}'`);
  console.log('');
  console.log('2. Verify contract on Polygonscan:');
  console.log(
    `   npx hardhat verify --network polygon ${proofRecorderAddress} "${TIME26_ADDRESS}" "${NEW_TREASURY}" "${NEW_OPERATOR}" "${NEW_OWNER}"`
  );
  console.log('');
  console.log('3. Redeploy frontend');
  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
