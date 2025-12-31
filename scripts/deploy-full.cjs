/**
 * Deploy full contract suite for Proof of Existence
 * Run: npx hardhat run scripts/deploy-full.cjs --network amoy
 */
const { ethers } = require('hardhat');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying contracts with account:', deployer.address);

  const balance = await deployer.getBalance();
  console.log('Account balance:', ethers.utils.formatEther(balance), 'POL');

  // Configuration
  const treasury = deployer.address;
  const operator = deployer.address;
  const initialOwner = deployer.address;

  console.log('\n📦 Deployment Configuration:');
  console.log('  Treasury:', treasury);
  console.log('  Operator:', operator);
  console.log('  Initial Owner:', initialOwner);

  // Get gas price
  const gasPrice = await ethers.provider.getGasPrice();
  const adjustedGasPrice = gasPrice.mul(150).div(100);
  console.log(
    '  Gas Price:',
    ethers.utils.formatUnits(adjustedGasPrice, 'gwei'),
    'gwei'
  );

  // ========== Step 1: Deploy Time26 ==========
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Step 1: Deploying Time26...');

  const Time26 = await ethers.getContractFactory('Time26');
  const time26 = await Time26.deploy(initialOwner, {
    gasPrice: adjustedGasPrice,
  });
  await time26.deployed();
  console.log('  Time26 deployed to:', time26.address);

  // ========== Step 2: Deploy TrailNFT ==========
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Step 2: Deploying TrailNFT...');

  const TrailNFT = await ethers.getContractFactory('TrailNFT');
  const trailNFT = await TrailNFT.deploy(treasury, initialOwner, {
    gasPrice: adjustedGasPrice,
  });
  await trailNFT.deployed();
  console.log('  TrailNFT deployed to:', trailNFT.address);

  // ========== Step 3: Deploy SnapshotNFT ==========
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Step 3: Deploying SnapshotNFT...');

  const SnapshotNFT = await ethers.getContractFactory('SnapshotNFT');
  const snapshotNFT = await SnapshotNFT.deploy(
    operator,
    treasury,
    initialOwner,
    { gasPrice: adjustedGasPrice }
  );
  await snapshotNFT.deployed();
  console.log('  SnapshotNFT deployed to:', snapshotNFT.address);

  // ========== Step 4: Deploy ProofRecorder ==========
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Step 4: Deploying ProofRecorder...');

  const ProofRecorder = await ethers.getContractFactory('ProofRecorder');
  const proofRecorder = await ProofRecorder.deploy(
    time26.address,
    treasury,
    operator,
    initialOwner,
    { gasPrice: adjustedGasPrice }
  );
  await proofRecorder.deployed();
  console.log('  ProofRecorder deployed to:', proofRecorder.address);

  // ========== Step 5: Configure Contracts ==========
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Step 5: Configuring contracts...');

  // Set TrailNFT minter to ProofRecorder
  console.log('  Setting TrailNFT minter...');
  const setMinterTx = await trailNFT.setMinter(proofRecorder.address, {
    gasPrice: adjustedGasPrice,
  });
  await setMinterTx.wait();
  console.log('  ✓ TrailNFT minter set to ProofRecorder');

  // Set ProofRecorder's TrailNFT reference
  console.log('  Setting ProofRecorder TrailNFT...');
  const setTrailNFTTx = await proofRecorder.setTrailNFT(trailNFT.address, {
    gasPrice: adjustedGasPrice,
  });
  await setTrailNFTTx.wait();
  console.log('  ✓ ProofRecorder TrailNFT set');

  // Set pricing
  console.log('  Setting pricing...');
  const setPricingTx = await proofRecorder.setPricing(
    ethers.utils.parseEther('0.1'), // 0.1 POL base
    ethers.utils.parseEther('0.005'), // 0.005 POL per second
    ethers.utils.parseUnits('10', 18), // 10 TIME26 base
    ethers.utils.parseUnits('1', 18), // 1 TIME26 per second
    45, // 45 seconds free
    { gasPrice: adjustedGasPrice }
  );
  await setPricingTx.wait();
  console.log('  ✓ Pricing configured');

  // ========== Summary ==========
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ DEPLOYMENT COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Contract Addresses:');
  console.log('  Time26:        ', time26.address);
  console.log('  TrailNFT:      ', trailNFT.address);
  console.log('  SnapshotNFT:   ', snapshotNFT.address);
  console.log('  ProofRecorder: ', proofRecorder.address);

  console.log('\n📝 Update these in your .env.local:');
  console.log(`NEXT_PUBLIC_TIME26_ADDRESS=${time26.address}`);
  console.log(`NEXT_PUBLIC_TRAIL_NFT_ADDRESS=${trailNFT.address}`);
  console.log(`NEXT_PUBLIC_SNAPSHOT_NFT_ADDRESS=${snapshotNFT.address}`);
  console.log(`NEXT_PUBLIC_PROOF_RECORDER_ADDRESS=${proofRecorder.address}`);

  console.log('\n📝 Update src/lib/contracts.ts with these addresses');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
