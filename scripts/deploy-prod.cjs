const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('===================================================');
  console.log('🚀 STARSHIP LAUNCH: DEPLOYING TO PRODUCTION (OR DRY RUN)');
  console.log('Account:', deployer.address);
  console.log('Network:', hre.network.name);
  console.log('===================================================');

  // Hardcoded check to prevent accidental mainnet deploy with testnet/dev logic
  if (hre.network.name === 'amoy' || hre.network.name === 'localhost') {
    console.log(
      '⚠️  Warning: You are running the PROD script on a test network.'
    );
  }

  // 1. Deploy Time26
  console.log('\nStep 1: Deploying Time26 Token...');
  const Time26 = await hre.ethers.getContractFactory('Time26');
  const time26 = await Time26.deploy(deployer.address);
  await time26.deployed();
  console.log('✅ Time26 deployed to:', time26.address);
  console.log('ℹ️  NOTE: 48,420,000 Tokens minted to', deployer.address);
  console.log(
    '   -> ACTION REQUIRED: Move these to Treasury/Liquidity Pools after deploy!'
  );

  // 2. Deploy ProofOfExistence
  console.log('\nStep 2: Deploying ProofOfExistence...');
  const ProofOfExistence =
    await hre.ethers.getContractFactory('ProofOfExistence');

  // Treasury and Owner are the deployer initially
  const treasuryAddress = deployer.address;
  const ownerAddress = deployer.address;

  const proof = await ProofOfExistence.deploy(
    time26.address,
    treasuryAddress,
    ownerAddress
  );
  await proof.deployed();
  console.log('✅ ProofOfExistence deployed to:', proof.address);

  // 3. Setup Pricing (PRODUCTION VALUES)
  // TODO: USER PLEASE VERIFY THESE VALUES BEFORE RUNNING
  console.log('\nStep 3: Configuring Production Pricing...');

  // Hypothetical "Real" Prices:
  // Native: 1 MATIC base, 0.01 MATIC per second
  // Time26: 100 TIME base, 10 TIME per second (just examples)
  const baseNative = hre.ethers.utils.parseEther('1.0');
  const rateNative = hre.ethers.utils.parseEther('0.01');
  const baseTime26 = hre.ethers.utils.parseEther('100');
  const rateTime26 = hre.ethers.utils.parseEther('10');
  const freeAllowance = 45;

  await proof.setPricing(
    baseNative,
    rateNative,
    baseTime26,
    rateTime26,
    freeAllowance
  );
  console.log('✅ Pricing configured.');
  console.log(
    `   - Base Native: ${hre.ethers.utils.formatEther(baseNative)} MATIC`
  );
  console.log(
    `   - Rate Native: ${hre.ethers.utils.formatEther(rateNative)} MATIC/s`
  );
  console.log(
    `   - Base Time26: ${hre.ethers.utils.formatEther(baseTime26)} TIME26`
  );
  console.log(
    `   - Rate Time26: ${hre.ethers.utils.formatEther(rateTime26)} TIME26/s`
  );

  console.log('\n===================================================');
  console.log('🎉 DEPLOYMENT COMPLETE');
  console.log('---------------------------------------------------');
  console.log(`Time26:           ${time26.address}`);
  console.log(`ProofOfExistence: ${proof.address}`);
  console.log('---------------------------------------------------');
  console.log('NEXT STEPS:');
  console.log('1. Verify contracts on PolygonScan (npx hardhat verify ...)');
  console.log('2. Update src/lib/contracts.ts');
  console.log('3. Distribute Time26 tokens to Treasury/DEX.');
  console.log('===================================================');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
