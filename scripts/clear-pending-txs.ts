/**
 * Clear pending transactions by sending 0-value self-transfers with higher gas
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { ethers } from 'ethers';

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  const nonce = await provider.getTransactionCount(wallet.address, 'latest');
  const pendingNonce = await provider.getTransactionCount(
    wallet.address,
    'pending'
  );
  const pendingCount = pendingNonce - nonce;

  console.log(`Wallet: ${wallet.address}`);
  console.log(`Pending transactions: ${pendingCount}`);

  if (pendingCount === 0) {
    console.log('No pending transactions to clear');
    return;
  }

  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? BigInt(0);
  const highGasPrice = (gasPrice * BigInt(200)) / BigInt(100); // 2x gas price
  console.log(
    `Using gas price: ${ethers.formatUnits(highGasPrice, 'gwei')} gwei`
  );

  // Send replacement transactions for each pending nonce
  for (let i = nonce; i < pendingNonce; i++) {
    console.log(`\nClearing nonce ${i}...`);
    try {
      const tx = await wallet.sendTransaction({
        to: wallet.address,
        value: 0,
        nonce: i,
        gasPrice: highGasPrice,
        gasLimit: 21000,
      });
      console.log(`  TX: ${tx.hash}`);
      await tx.wait();
      console.log(`  ✅ Confirmed`);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.log(`  ❌ Error: ${error.message}`);
      }
    }
  }

  console.log('\n✅ Done clearing pending transactions');
}

main().catch(console.error);
