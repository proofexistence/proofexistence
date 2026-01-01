/**
 * Post-deployment configuration for v3
 *
 * Run this after deploy-v3.cjs to:
 * 1. Update TrailNFT minter and baseURI
 * 2. Distribute TIME26 tokens
 *
 * Usage:
 *   npx hardhat run scripts/post-deploy-v3.cjs --network polygon
 */

const { ethers } = require('hardhat');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Running post-deployment with account:', deployer.address);
  console.log('');

  // ============================================================
  // CONFIGURATION - UPDATE AFTER DEPLOYMENT
  // ============================================================

  // NEW addresses from deploy-v3.cjs output
  const NEW_TIME26 = '0x56C79b61FFc3D826188DB700791F1A7ECb007FD0';
  const NEW_PROOF_RECORDER = '0x7FF137359720f01aDcA9C524818E55ed352831DB';

  // Existing contracts
  const TRAIL_NFT = '0x23BA06eeD9007052c9f95f7dC8E92B825399aAa1';
  const TREASURY_SAFE = '0xc7b9ED3e985706efeb951462d4281f4Ac8fc99B2';

  // Token distribution
  const REWARD_POOL = ethers.utils.parseUnits('31536000', 18); // 31,536,000 TIME26
  const TREASURY_AMOUNT = ethers.utils.parseUnits('16884000', 18); // 16,884,000 TIME26

  // Validate configuration
  if (!NEW_TIME26 || !NEW_PROOF_RECORDER) {
    console.error(
      '❌ ERROR: Please update NEW_TIME26 and NEW_PROOF_RECORDER addresses!'
    );
    console.log('   These should be the addresses output from deploy-v3.cjs');
    process.exit(1);
  }

  // ============================================================
  // STEP 1: Update TrailNFT
  // ============================================================
  console.log('Step 1: Updating TrailNFT...');

  const trailNFT = await ethers.getContractAt(
    [
      'function setMinter(address _minter) external',
      'function setBaseURI(string calldata baseURI) external',
      'function minter() external view returns (address)',
      'function owner() external view returns (address)',
    ],
    TRAIL_NFT
  );

  // Check current owner
  const currentOwner = await trailNFT.owner();
  console.log('   Current TrailNFT owner:', currentOwner);

  if (currentOwner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.log('   ⚠️  WARNING: You are not the owner of TrailNFT');
    console.log('   These transactions need to be executed by:', currentOwner);
    console.log('');
    console.log('   Commands to execute from owner wallet:');
    console.log(`   - setMinter("${NEW_PROOF_RECORDER}")`);
    console.log(`   - setBaseURI("https://gateway.irys.xyz/")`);
  } else {
    // Update minter
    console.log('   Setting new minter...');
    let tx = await trailNFT.setMinter(NEW_PROOF_RECORDER);
    await tx.wait();
    console.log('   ✅ Minter updated to:', NEW_PROOF_RECORDER);

    // Update base URI
    console.log('   Setting new base URI...');
    tx = await trailNFT.setBaseURI('https://gateway.irys.xyz/');
    await tx.wait();
    console.log('   ✅ Base URI updated to: https://gateway.irys.xyz/');
  }
  console.log('');

  // ============================================================
  // STEP 2: Distribute TIME26 tokens
  // ============================================================
  console.log('Step 2: Distributing TIME26 tokens...');

  const time26 = await ethers.getContractAt(
    [
      'function transfer(address to, uint256 amount) external returns (bool)',
      'function balanceOf(address account) external view returns (uint256)',
    ],
    NEW_TIME26
  );

  const deployerBalance = await time26.balanceOf(deployer.address);
  console.log(
    '   Deployer balance:',
    ethers.utils.formatUnits(deployerBalance, 18),
    'TIME26'
  );

  if (deployerBalance < REWARD_POOL + TREASURY_AMOUNT) {
    console.log('   ❌ ERROR: Insufficient balance for distribution');
    process.exit(1);
  }

  // Transfer to ProofRecorder (reward pool)
  console.log('   Transferring to ProofRecorder (reward pool)...');
  let tx = await time26.transfer(NEW_PROOF_RECORDER, REWARD_POOL);
  await tx.wait();
  console.log(
    '   ✅ Transferred',
    ethers.utils.formatUnits(REWARD_POOL, 18),
    'TIME26 to ProofRecorder'
  );

  // Transfer to Treasury
  console.log('   Transferring to Treasury...');
  tx = await time26.transfer(TREASURY_SAFE, TREASURY_AMOUNT);
  await tx.wait();
  console.log(
    '   ✅ Transferred',
    ethers.utils.formatUnits(TREASURY_AMOUNT, 18),
    'TIME26 to Treasury'
  );

  console.log('');

  // ============================================================
  // VERIFICATION
  // ============================================================
  console.log('='.repeat(60));
  console.log('VERIFICATION');
  console.log('='.repeat(60));

  const recorderBalance = await time26.balanceOf(NEW_PROOF_RECORDER);
  const treasuryBalance = await time26.balanceOf(TREASURY_SAFE);
  const remainingBalance = await time26.balanceOf(deployer.address);

  console.log(
    'ProofRecorder balance:',
    ethers.utils.formatUnits(recorderBalance, 18),
    'TIME26'
  );
  console.log(
    'Treasury balance:',
    ethers.utils.formatUnits(treasuryBalance, 18),
    'TIME26'
  );
  console.log(
    'Deployer remaining:',
    ethers.utils.formatUnits(remainingBalance, 18),
    'TIME26'
  );
  console.log('');

  console.log('='.repeat(60));
  console.log('POST-DEPLOYMENT COMPLETE');
  console.log('='.repeat(60));
  console.log('');
  console.log('Next steps:');
  console.log('1. Update src/lib/contracts.ts with new addresses:');
  console.log(`   TIME26_ADDRESS: "${NEW_TIME26}"`);
  console.log(`   PROOF_RECORDER_ADDRESS: "${NEW_PROOF_RECORDER}"`);
  console.log('');
  console.log(
    '2. Verify contracts on PolygonScan (commands from deploy-v3.cjs output)'
  );
  console.log('');
  console.log('3. Test minting with new contracts');
}

main()
  .then(() => {
    console.log('Post-deployment successful!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Post-deployment failed:', error);
    process.exit(1);
  });
