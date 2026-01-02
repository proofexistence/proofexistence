/**
 * Update Operator address on SnapshotNFT
 *
 * Usage:
 *   npx hardhat run scripts/update-wallets.cjs --network polygon
 *
 * Requirements:
 *   - Must be run by Owner: 0xA7D2A0647F1f12455f543Db4CaA350e85C0Eae09
 *   - Ensure you have enough POL for gas
 *
 * NOTE: ProofRecorder is owned by old Treasury Safe (0xc7b9...99B2)
 *       You cannot update it without access to that wallet.
 */

const { ethers } = require('hardhat');

async function main() {
  const [signer] = await ethers.getSigners();
  console.log('Executing with account:', signer.address);
  const balance = await ethers.provider.getBalance(signer.address);
  console.log('Account balance:', ethers.utils.formatEther(balance), 'POL');
  console.log('');

  // ============================================================
  // NEW ADDRESSES
  // ============================================================
  const NEW_OPERATOR = '0x0Af9d487E8AEaf2B9d0409EDa53fA751d01aF8d1';

  // ============================================================
  // DEPLOYED CONTRACT ADDRESSES (Polygon Mainnet)
  // ============================================================
  const SNAPSHOT_NFT = '0x994b45d12DE1Cdf812d1302417F5c9DFab3E1a3C';

  // ============================================================
  // ABIs (only the functions we need)
  // ============================================================
  const SNAPSHOT_NFT_ABI = [
    'function operator() view returns (address)',
    'function owner() view returns (address)',
    'function setOperator(address _operator) external',
  ];

  // ============================================================
  // CONNECT TO CONTRACT
  // ============================================================
  const snapshotNFT = new ethers.Contract(
    SNAPSHOT_NFT,
    SNAPSHOT_NFT_ABI,
    signer
  );

  // ============================================================
  // CHECK CURRENT STATE
  // ============================================================
  console.log('=== Current State ===');

  const snOwner = await snapshotNFT.owner();
  const snOperator = await snapshotNFT.operator();
  console.log('SnapshotNFT:');
  console.log('  Owner:', snOwner);
  console.log('  Operator:', snOperator);
  console.log('');

  // Check if signer is owner
  if (snOwner.toLowerCase() !== signer.address.toLowerCase()) {
    console.error('ERROR: Signer is not the owner of SnapshotNFT!');
    console.error('  Owner:', snOwner);
    console.error('  Signer:', signer.address);
    process.exit(1);
  }

  // ============================================================
  // UPDATE OPERATOR
  // ============================================================
  console.log('=== Updating Operator ===');
  console.log('New Operator:', NEW_OPERATOR);
  console.log('');

  let tx;

  if (snOperator.toLowerCase() !== NEW_OPERATOR.toLowerCase()) {
    console.log('SnapshotNFT.setOperator...');
    tx = await snapshotNFT.setOperator(NEW_OPERATOR);
    console.log('  TX:', tx.hash);
    await tx.wait();
    console.log('  ✅ Done');
  } else {
    console.log('SnapshotNFT.setOperator - Already set, skipping');
  }

  // ============================================================
  // VERIFY
  // ============================================================
  console.log('');
  console.log('=== Verification ===');

  const newSnOperator = await snapshotNFT.operator();
  console.log('SnapshotNFT:');
  console.log(
    '  Operator:',
    newSnOperator,
    newSnOperator.toLowerCase() === NEW_OPERATOR.toLowerCase() ? '✅' : '❌'
  );

  console.log('');
  console.log('🎉 Done!');
  console.log('');
  console.log('⚠️  WARNING: ProofRecorder still has old Treasury/Operator.');
  console.log(
    '    You need access to 0xc7b9ED3e985706efeb951462d4281f4Ac8fc99B2 to update it.'
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
