/**
 * Set pricing on ProofRecorder v4 (Mainnet)
 * Run with: npx hardhat run scripts/set-pricing-v4.cjs --network polygon
 */

const hre = require('hardhat');
const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Setting pricing with account:', deployer.address);

  // ProofRecorder v4 on Polygon Mainnet
  const PROOF_RECORDER = '0x72Ac729a8f6efb68A5d6765EC375aC4578a3c756';

  // Pricing from deploy-v3.cjs
  const PRICING = {
    baseFeeNative: ethers.parseEther('5'), // 5 POL base
    pricePerSecondNative: ethers.parseEther('0.05'), // 0.05 POL per second
    baseFeeTime26: ethers.parseUnits('400', 18), // 400 TIME26
    pricePerSecondTime26: ethers.parseUnits('0.04', 18), // 0.04 TIME26 per second
  };

  console.log('\n=== Pricing Configuration ===');
  console.log(
    'baseFeeNative:',
    ethers.formatEther(PRICING.baseFeeNative),
    'POL'
  );
  console.log(
    'pricePerSecondNative:',
    ethers.formatEther(PRICING.pricePerSecondNative),
    'POL/sec'
  );
  console.log(
    'baseFeeTime26:',
    ethers.formatUnits(PRICING.baseFeeTime26, 18),
    'TIME26'
  );
  console.log(
    'pricePerSecondTime26:',
    ethers.formatUnits(PRICING.pricePerSecondTime26, 18),
    'TIME26/sec'
  );
  console.log('');

  // Get contract
  const proofRecorder = await hre.ethers.getContractAt(
    [
      'function setPricing(uint256 _baseNative, uint256 _rateNative, uint256 _baseTime26, uint256 _rateTime26, uint256 _allowance) external',
    ],
    PROOF_RECORDER,
    deployer
  );

  console.log('Calling setPricing on', PROOF_RECORDER, '...');

  const tx = await proofRecorder.setPricing(
    PRICING.baseFeeNative,
    PRICING.pricePerSecondNative,
    PRICING.baseFeeTime26,
    PRICING.pricePerSecondTime26,
    45 // freeAllowance: 45 seconds
  );

  console.log('Transaction hash:', tx.hash);
  console.log('Waiting for confirmation...');

  await tx.wait();

  console.log('\n✅ Pricing set successfully!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
