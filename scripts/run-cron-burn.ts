/**
 * Run the burn and merkle task from daily cron
 */

import { ethers } from 'ethers';
import { neon } from '@neondatabase/serverless';
import { MerkleTree } from 'merkletreejs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

function generateRewardLeaf(
  walletAddress: string,
  cumulativeAmount: string
): Buffer {
  const packed = ethers.solidityPacked(
    ['address', 'uint256'],
    [walletAddress, cumulativeAmount]
  );
  const hash = ethers.keccak256(packed);
  return Buffer.from(hash.slice(2), 'hex');
}

async function main() {
  const isTestnet = process.env.NEXT_PUBLIC_IS_TESTNET === 'true';
  const proofRecorderAddress = isTestnet
    ? '0xA0b6b101Cde5FeF3458C820928d1202A281001cd'
    : '0x72Ac729a8f6efb68A5d6765EC375aC4578a3c756';
  const rpcUrl = isTestnet
    ? process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology'
    : 'https://polygon-rpc.com';

  console.log('Network:', isTestnet ? 'Amoy Testnet' : 'Polygon Mainnet');
  console.log('ProofRecorder:', proofRecorderAddress);

  const sql = neon(process.env.DATABASE_URL!);

  // 1. Get all users with balance
  const usersWithBalance = await sql`
    SELECT wallet_address, time26_balance
    FROM users
    WHERE time26_balance::numeric > 0
  `;

  console.log('\nFound ' + usersWithBalance.length + ' users with balance');

  if (usersWithBalance.length === 0) {
    console.log('No users with balance, nothing to do');
    return;
  }

  // 2. Create entries for merkle tree
  const entries = usersWithBalance.map((u) => ({
    walletAddress: (u.wallet_address as string).toLowerCase(),
    cumulativeAmount: u.time26_balance as string,
  }));

  // Show entries
  console.log('\nUser entries:');
  for (const e of entries) {
    console.log(
      '  ' +
        e.walletAddress +
        ': ' +
        ethers.formatEther(e.cumulativeAmount) +
        ' TIME26'
    );
  }

  // 3. Generate merkle tree
  const leaves = entries.map((e) =>
    generateRewardLeaf(e.walletAddress, e.cumulativeAmount)
  );
  const tree = new MerkleTree(leaves, ethers.keccak256, {
    sortPairs: true,
    hashLeaves: false,
  });
  const root = tree.getHexRoot();

  console.log('\nNew Merkle root:', root);

  // 4. Check current on-chain root
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const privateKey =
    process.env.OPERATOR_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('OPERATOR_PRIVATE_KEY or PRIVATE_KEY not set');
  }
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log('Wallet:', wallet.address);

  const proofRecorder = new ethers.Contract(
    proofRecorderAddress,
    [
      'function rewardsMerkleRoot() view returns (bytes32)',
      'function setRewardsMerkleRoot(bytes32 newRoot) external',
    ],
    wallet
  );

  const currentRoot = await proofRecorder.rewardsMerkleRoot();
  console.log('Current on-chain root:', currentRoot);

  if (root.toLowerCase() === currentRoot.toLowerCase()) {
    console.log('\n✅ Root already matches, no update needed');
    return;
  }

  console.log('\n📝 Updating Merkle root on-chain...');

  const nonce = await provider.getTransactionCount(wallet.address, 'latest');
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? BigInt(0);
  const adjustedGasPrice = (gasPrice * BigInt(150)) / BigInt(100);

  const tx = await proofRecorder.setRewardsMerkleRoot(root, {
    nonce,
    gasPrice: adjustedGasPrice,
    gasLimit: 100000,
  });

  console.log('TX hash:', tx.hash);
  console.log('Waiting for confirmation...');

  await tx.wait();

  console.log('\n✅ Merkle root updated successfully!');

  // Verify
  const newRoot = await proofRecorder.rewardsMerkleRoot();
  console.log('Verified on-chain root:', newRoot);
}

main().catch(console.error);
