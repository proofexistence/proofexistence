/**
 * Check TIME26 Token Distribution
 *
 * Run with: npx hardhat run scripts/check-time26-balances.cjs --network polygon
 */

const { ethers } = require('hardhat');

async function main() {
  console.log('='.repeat(60));
  console.log('TIME26 TOKEN DISTRIBUTION CHECK');
  console.log('='.repeat(60));
  console.log('');

  // Contract addresses (mainnet)
  const TIME26 = '0x56C79b61FFc3D826188DB700791F1A7ECb007FD0';
  const PROOF_RECORDER_V4 = '0x72Ac729a8f6efb68A5d6765EC375aC4578a3c756';
  const PROOF_RECORDER_V3 = '0x7FF137359720f01aDcA9C524818E55ed352831DB';
  const TREASURY_SAFE = '0xBDA2B288154339F88F886949F4CC9dF7D2491f6D';
  const TRAIL_NFT = '0x23BA06eeD9007052c9f95f7dC8E92B825399aAa1';

  // Get signer
  const [signer] = await ethers.getSigners();
  console.log('Checking from account:', signer.address);
  console.log('');

  // TIME26 contract
  const time26 = await ethers.getContractAt(
    [
      'function balanceOf(address account) external view returns (uint256)',
      'function totalSupply() external view returns (uint256)',
      'function owner() external view returns (address)',
    ],
    TIME26
  );

  // Get total supply
  const totalSupply = await time26.totalSupply();
  console.log('Total Supply:', ethers.formatUnits(totalSupply, 18), 'TIME26');
  console.log('');

  // Check balances
  const addresses = [
    { name: 'Deployer (you)', address: signer.address },
    { name: 'Treasury Safe', address: TREASURY_SAFE },
    { name: 'ProofRecorder v4', address: PROOF_RECORDER_V4 },
    { name: 'ProofRecorder v3 (old)', address: PROOF_RECORDER_V3 },
  ];

  console.log('Address Balances:');
  console.log('-'.repeat(60));

  let totalAccounted = 0n;

  for (const { name, address } of addresses) {
    const balance = await time26.balanceOf(address);
    totalAccounted = totalAccounted + balance;
    const formatted = ethers.formatUnits(balance, 18);
    const percentage = Number((balance * 10000n) / totalSupply) / 100;
    console.log(`${name.padEnd(25)} ${formatted.padStart(20)} TIME26 (${percentage.toFixed(2)}%)`);
  }

  console.log('-'.repeat(60));
  console.log(`Total Accounted:`.padEnd(25), ethers.formatUnits(totalAccounted, 18).padStart(20), 'TIME26');

  const unaccounted = totalSupply - totalAccounted;
  console.log(`Unaccounted:`.padEnd(25), ethers.formatUnits(unaccounted, 18).padStart(20), 'TIME26');
  console.log('');

  // Check ProofRecorder v4 config
  console.log('ProofRecorder v4 Configuration:');
  console.log('-'.repeat(60));

  const proofRecorder = await ethers.getContractAt(
    [
      'function treasury() external view returns (address)',
      'function operator() external view returns (address)',
      'function owner() external view returns (address)',
      'function time26Token() external view returns (address)',
      'function trailNFT() external view returns (address)',
      'function deflationMode() external view returns (bool)',
      'function rewardsMerkleRoot() external view returns (bytes32)',
    ],
    PROOF_RECORDER_V4
  );

  try {
    const treasury = await proofRecorder.treasury();
    const operator = await proofRecorder.operator();
    const owner = await proofRecorder.owner();
    const time26Token = await proofRecorder.time26Token();
    const trailNFT = await proofRecorder.trailNFT();
    const deflationMode = await proofRecorder.deflationMode();
    const rewardsMerkleRoot = await proofRecorder.rewardsMerkleRoot();

    console.log('Owner:', owner);
    console.log('Treasury:', treasury);
    console.log('Operator:', operator);
    console.log('Time26 Token:', time26Token);
    console.log('TrailNFT:', trailNFT);
    console.log('Deflation Mode:', deflationMode);
    console.log('Rewards Merkle Root:', rewardsMerkleRoot);
  } catch (error) {
    console.log('Error reading ProofRecorder config:', error.message);
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('EXPECTED DISTRIBUTION (from Whitepaper):');
  console.log('='.repeat(60));
  console.log('User Rewards (65%):      31,500,000 TIME26 → ProofRecorder');
  console.log('Liquidity Pool (21%):    10,000,000 TIME26 → DEX');
  console.log('Team (10%):               4,730,400 TIME26 → Vesting');
  console.log('Operations (4%):          2,153,600 TIME26 → Treasury');
  console.log('-'.repeat(60));
  console.log('Total:                   48,420,000 TIME26');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
