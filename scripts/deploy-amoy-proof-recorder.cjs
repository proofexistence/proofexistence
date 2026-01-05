/**
 * Deploy ProofRecorder v4 to Amoy Testnet
 *
 * This script deploys a new ProofRecorder with rewards claiming functionality.
 *
 * Usage:
 *   npx hardhat run scripts/deploy-amoy-proof-recorder.cjs --network amoy
 *
 * Requirements:
 *   - Ensure you have enough Amoy POL for gas
 */

const { ethers } = require('hardhat');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('');
  console.log('===========================================');
  console.log('  Deploy ProofRecorder v4 to Amoy Testnet');
  console.log('===========================================');
  console.log('');
  console.log('Deployer:', deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('Balance:', ethers.formatEther(balance), 'POL');
  console.log('');

  // ============================================================
  // CONFIGURATION - AMOY TESTNET
  // ============================================================

  // Existing contracts on Amoy
  const TIME26_ADDRESS = '0xdb1f87083952FF0267270E209567e52fdcC06A63';
  const TRAIL_NFT_ADDRESS = '0xDAE66367ED26661974Dd7a69cC718829d2Ea8355';

  // Addresses (same as mainnet for consistency)
  const TREASURY = '0xBDA2B288154339F88F886949F4CC9dF7D2491f6D';
  const OPERATOR = '0x0Af9d487E8AEaf2B9d0409EDa53fA751d01aF8d1';
  const OWNER = deployer.address;

  console.log('Configuration:');
  console.log('  Time26:', TIME26_ADDRESS);
  console.log('  TrailNFT:', TRAIL_NFT_ADDRESS);
  console.log('  Treasury:', TREASURY);
  console.log('  Operator:', OPERATOR);
  console.log('  Owner:', OWNER);
  console.log('');

  // ============================================================
  // STEP 1: Deploy new ProofRecorder
  // ============================================================
  console.log('Step 1: Deploying ProofRecorder...');

  const ProofRecorder = await ethers.getContractFactory('ProofRecorder');
  const proofRecorder = await ProofRecorder.deploy(
    TIME26_ADDRESS,
    TREASURY,
    OPERATOR,
    OWNER
  );
  await proofRecorder.waitForDeployment();
  const proofRecorderAddress = await proofRecorder.getAddress();

  console.log('  ✅ ProofRecorder deployed:', proofRecorderAddress);
  console.log('');

  // ============================================================
  // STEP 2: Configure ProofRecorder
  // ============================================================
  console.log('Step 2: Configuring ProofRecorder...');

  // Set TrailNFT
  const tx1 = await proofRecorder.setTrailNFT(TRAIL_NFT_ADDRESS);
  await tx1.wait();
  console.log('  ✅ TrailNFT set');

  // Set pricing (same as mainnet - in wei)
  const baseFeeNative = ethers.parseEther('0.1'); // 0.1 POL base
  const rateNative = ethers.parseEther('0.001'); // 0.001 POL per second
  const baseFeeTime26 = ethers.parseEther('10'); // 10 TIME26 base
  const rateTime26 = ethers.parseEther('0.1'); // 0.1 TIME26 per second
  const freeAllowance = 45; // 45 seconds free

  const tx2 = await proofRecorder.setPricing(
    baseFeeNative,
    rateNative,
    baseFeeTime26,
    rateTime26,
    freeAllowance
  );
  await tx2.wait();
  console.log('  ✅ Pricing set');
  console.log('');

  // ============================================================
  // STEP 3: Update TrailNFT minter (if we own it)
  // ============================================================
  console.log('Step 3: Updating TrailNFT minter...');

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

  try {
    const trailOwner = await trailNFT.owner();
    if (trailOwner.toLowerCase() === deployer.address.toLowerCase()) {
      const oldMinter = await trailNFT.minter();
      console.log('  Old minter:', oldMinter);

      const tx3 = await trailNFT.setMinter(proofRecorderAddress);
      await tx3.wait();

      const newMinter = await trailNFT.minter();
      console.log('  ✅ New minter:', newMinter);
    } else {
      console.log('  ⚠️ Not owner of TrailNFT, skipping minter update');
      console.log('     Owner:', trailOwner);
    }
  } catch (err) {
    console.log('  ⚠️ Could not update TrailNFT minter:', err.message);
  }
  console.log('');

  // ============================================================
  // VERIFICATION
  // ============================================================
  console.log('Step 4: Verification...');

  const prOwner = await proofRecorder.owner();
  const prTreasury = await proofRecorder.treasury();
  const prOperator = await proofRecorder.operator();
  const prTime26 = await proofRecorder.time26Token();

  console.log('  ProofRecorder:');
  console.log('    Address:', proofRecorderAddress);
  console.log('    Owner:', prOwner, prOwner.toLowerCase() === OWNER.toLowerCase() ? '✅' : '❌');
  console.log('    Treasury:', prTreasury, prTreasury.toLowerCase() === TREASURY.toLowerCase() ? '✅' : '❌');
  console.log('    Operator:', prOperator, prOperator.toLowerCase() === OPERATOR.toLowerCase() ? '✅' : '❌');
  console.log('    Time26:', prTime26, prTime26.toLowerCase() === TIME26_ADDRESS.toLowerCase() ? '✅' : '❌');
  console.log('');

  // ============================================================
  // NEXT STEPS
  // ============================================================
  console.log('===========================================');
  console.log('  🎉 Deployment Complete!');
  console.log('===========================================');
  console.log('');
  console.log('New ProofRecorder (Amoy):', proofRecorderAddress);
  console.log('');
  console.log('NEXT STEPS:');
  console.log('');
  console.log('1. Update src/lib/contracts.ts:');
  console.log(`   // Amoy testnet`);
  console.log(`   ? '${proofRecorderAddress}'`);
  console.log('');
  console.log('2. Verify contract on Amoy Polygonscan:');
  console.log(`   npx hardhat verify --network amoy ${proofRecorderAddress} "${TIME26_ADDRESS}" "${TREASURY}" "${OPERATOR}" "${OWNER}"`);
  console.log('');
  console.log('3. Fund the contract with TIME26 for rewards:');
  console.log(`   Transfer TIME26 to: ${proofRecorderAddress}`);
  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
