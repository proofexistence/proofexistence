/**
 * TIME26 Migration & Distribution Script
 *
 * This script:
 * 1. Checks current balances
 * 2. Migrates TIME26 from old ProofRecorder v3 to new v4
 * 3. Sets up proper token distribution
 *
 * Run with: npx hardhat run scripts/migrate-time26.cjs --network polygon
 *
 * IMPORTANT: Make sure you are the owner of both v3 and v4 contracts!
 */

const { ethers } = require('hardhat');

// =============================================================================
// CONFIGURATION
// =============================================================================

// Contract addresses (mainnet)
const TIME26 = '0x56C79b61FFc3D826188DB700791F1A7ECb007FD0';
const PROOF_RECORDER_V4 = '0x72Ac729a8f6efb68A5d6765EC375aC4578a3c756';
const PROOF_RECORDER_V3 = '0x7FF137359720f01aDcA9C524818E55ed352831DB';
const TREASURY_SAFE = '0xBDA2B288154339F88F886949F4CC9dF7D2491f6D';

// Distribution amounts (in wei, 18 decimals)
const DISTRIBUTION = {
  // User Rewards → ProofRecorder v4
  // Whitepaper says 31,500,000 but v3 has 31,536,000 (seconds in a year)
  // We'll use what's actually in v3
  REWARDS_POOL: ethers.parseUnits('31500000', 18), // 31.5M for rewards

  // The remaining 36,000 can go to treasury for operations
  // 31,536,000 - 31,500,000 = 36,000 extra

  // Expected distribution for remaining 16,884,000:
  LIQUIDITY_POOL: ethers.parseUnits('10000000', 18), // 10M for DEX
  TEAM_ALLOCATION: ethers.parseUnits('4730400', 18), // 4.73M for team (needs vesting)
  OPERATIONS_RESERVE: ethers.parseUnits('2153600', 18), // 2.15M for operations
};

// DRY RUN mode - set to false to execute transactions
const DRY_RUN = true;

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log('='.repeat(70));
  console.log('TIME26 MIGRATION & DISTRIBUTION');
  console.log('='.repeat(70));
  console.log('');
  console.log(
    'Mode:',
    DRY_RUN ? '🔍 DRY RUN (no transactions)' : '🚀 LIVE (will execute!)'
  );
  console.log('Deployer:', deployer.address);
  console.log('');

  // Connect to contracts
  const time26 = await ethers.getContractAt(
    [
      'function balanceOf(address) view returns (uint256)',
      'function transfer(address, uint256) returns (bool)',
      'function totalSupply() view returns (uint256)',
    ],
    TIME26
  );

  const proofRecorderV3 = await ethers.getContractAt(
    [
      'function owner() view returns (address)',
      'function emergencyWithdrawERC20(address token, address to, uint256 amount)',
    ],
    PROOF_RECORDER_V3
  );

  const proofRecorderV4 = await ethers.getContractAt(
    ['function owner() view returns (address)'],
    PROOF_RECORDER_V4
  );

  // ==========================================================================
  // STEP 0: Verify ownership
  // ==========================================================================
  console.log('Step 0: Verifying ownership...');
  console.log('-'.repeat(70));

  const v3Owner = await proofRecorderV3.owner();
  const v4Owner = await proofRecorderV4.owner();

  console.log('ProofRecorder v3 owner:', v3Owner);
  console.log('ProofRecorder v4 owner:', v4Owner);
  console.log('You are:', deployer.address);
  console.log('');

  const isV3Owner = v3Owner.toLowerCase() === deployer.address.toLowerCase();
  const isV4Owner = v4Owner.toLowerCase() === deployer.address.toLowerCase();

  if (!isV3Owner) {
    console.log('❌ You are NOT the owner of ProofRecorder v3');
    console.log('   Cannot migrate tokens from v3');
    console.log('   Need to use Gnosis Safe if v3 owner is:', v3Owner);
  } else {
    console.log('✅ You ARE the owner of ProofRecorder v3');
  }

  if (!isV4Owner) {
    console.log('❌ You are NOT the owner of ProofRecorder v4');
  } else {
    console.log('✅ You ARE the owner of ProofRecorder v4');
  }
  console.log('');

  // ==========================================================================
  // STEP 1: Check current balances
  // ==========================================================================
  console.log('Step 1: Current balances...');
  console.log('-'.repeat(70));

  const balances = {
    deployer: await time26.balanceOf(deployer.address),
    v3: await time26.balanceOf(PROOF_RECORDER_V3),
    v4: await time26.balanceOf(PROOF_RECORDER_V4),
    treasury: await time26.balanceOf(TREASURY_SAFE),
    total: await time26.totalSupply(),
  };

  console.log(
    'Deployer:'.padEnd(20),
    ethers.formatUnits(balances.deployer, 18).padStart(20),
    'TIME26'
  );
  console.log(
    'ProofRecorder v3:'.padEnd(20),
    ethers.formatUnits(balances.v3, 18).padStart(20),
    'TIME26'
  );
  console.log(
    'ProofRecorder v4:'.padEnd(20),
    ethers.formatUnits(balances.v4, 18).padStart(20),
    'TIME26'
  );
  console.log(
    'Treasury Safe:'.padEnd(20),
    ethers.formatUnits(balances.treasury, 18).padStart(20),
    'TIME26'
  );
  console.log('-'.repeat(70));

  const accounted =
    balances.deployer + balances.v3 + balances.v4 + balances.treasury;
  const unaccounted = balances.total - accounted;

  console.log(
    'Total Supply:'.padEnd(20),
    ethers.formatUnits(balances.total, 18).padStart(20),
    'TIME26'
  );
  console.log(
    'Accounted:'.padEnd(20),
    ethers.formatUnits(accounted, 18).padStart(20),
    'TIME26'
  );
  console.log(
    'Unaccounted:'.padEnd(20),
    ethers.formatUnits(unaccounted, 18).padStart(20),
    'TIME26'
  );
  console.log('');

  if (unaccounted > 0n) {
    console.log(
      '⚠️  WARNING: There are',
      ethers.formatUnits(unaccounted, 18),
      'TIME26 unaccounted for!'
    );
    console.log('   Check PolygonScan for token holders:');
    console.log(
      '   https://polygonscan.com/token/0x56C79b61FFc3D826188DB700791F1A7ECb007FD0#balances'
    );
    console.log('');
  }

  // ==========================================================================
  // STEP 2: Migration plan
  // ==========================================================================
  console.log('Step 2: Migration plan...');
  console.log('-'.repeat(70));

  if (balances.v3 > 0n) {
    console.log(
      '📦 FROM ProofRecorder v3:',
      ethers.formatUnits(balances.v3, 18),
      'TIME26'
    );
    console.log('   → Move to ProofRecorder v4 (rewards pool)');
    console.log('');

    if (!DRY_RUN && isV3Owner) {
      console.log('   Executing emergencyWithdrawERC20...');
      // First withdraw to deployer
      const tx1 = await proofRecorderV3.emergencyWithdrawERC20(
        TIME26,
        deployer.address,
        balances.v3
      );
      console.log('   TX:', tx1.hash);
      await tx1.wait();
      console.log('   ✅ Withdrawn to deployer');

      // Then transfer to v4
      const tx2 = await time26.transfer(
        PROOF_RECORDER_V4,
        DISTRIBUTION.REWARDS_POOL
      );
      console.log('   TX:', tx2.hash);
      await tx2.wait();
      console.log(
        '   ✅ Transferred',
        ethers.formatUnits(DISTRIBUTION.REWARDS_POOL, 18),
        'TIME26 to v4'
      );

      // Any remaining goes to treasury
      const remaining = balances.v3 - DISTRIBUTION.REWARDS_POOL;
      if (remaining > 0n) {
        const tx3 = await time26.transfer(TREASURY_SAFE, remaining);
        console.log('   TX:', tx3.hash);
        await tx3.wait();
        console.log(
          '   ✅ Transferred',
          ethers.formatUnits(remaining, 18),
          'TIME26 to Treasury'
        );
      }
    } else if (DRY_RUN) {
      console.log('   [DRY RUN] Would execute:');
      console.log(
        '   1. proofRecorderV3.emergencyWithdrawERC20(TIME26, deployer,',
        ethers.formatUnits(balances.v3, 18),
        ')'
      );
      console.log(
        '   2. time26.transfer(PROOF_RECORDER_V4,',
        ethers.formatUnits(DISTRIBUTION.REWARDS_POOL, 18),
        ')'
      );
      const remaining = balances.v3 - DISTRIBUTION.REWARDS_POOL;
      if (remaining > 0n) {
        console.log(
          '   3. time26.transfer(TREASURY_SAFE,',
          ethers.formatUnits(remaining, 18),
          ')'
        );
      }
    } else {
      console.log('   [SKIPPED] You are not the owner of v3');
    }
  } else {
    console.log('   ProofRecorder v3 is empty, nothing to migrate');
  }
  console.log('');

  // ==========================================================================
  // STEP 3: Distribution summary
  // ==========================================================================
  console.log('Step 3: Expected final distribution...');
  console.log('-'.repeat(70));
  console.log(
    'ProofRecorder v4 (Rewards):'.padEnd(35),
    '31,500,000 TIME26 (65%)'
  );
  console.log(
    'Liquidity Pool (Uniswap):'.padEnd(35),
    '10,000,000 TIME26 (21%)'
  );
  console.log('Team (with vesting):'.padEnd(35), ' 4,730,400 TIME26 (10%)');
  console.log('Treasury (Operations):'.padEnd(35), ' 2,189,600 TIME26 (4.5%)');
  console.log('-'.repeat(70));
  console.log('Total:'.padEnd(35), '48,420,000 TIME26');
  console.log('');

  // ==========================================================================
  // NEXT STEPS
  // ==========================================================================
  console.log('='.repeat(70));
  console.log('NEXT STEPS');
  console.log('='.repeat(70));
  console.log('');
  console.log('1. If v3 owner is Gnosis Safe, execute via Safe UI:');
  console.log('   - Call emergencyWithdrawERC20(TIME26, v4, 31536000e18)');
  console.log('');
  console.log('2. Find the unaccounted 16,884,000 TIME26:');
  console.log(
    '   - Check: https://polygonscan.com/token/' + TIME26 + '#balances'
  );
  console.log('');
  console.log('3. Set up Team vesting (4,730,400 TIME26):');
  console.log('   - Deploy vesting contract or use Sablier/Hedgey');
  console.log('');
  console.log('4. Add Liquidity to DEX (10,000,000 TIME26):');
  console.log('   - Create TIME26/POL pool on Uniswap V3');
  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
