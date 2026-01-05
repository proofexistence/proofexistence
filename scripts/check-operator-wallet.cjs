/**
 * Check operator wallet balance on Polygon
 */

const { ethers } = require('ethers');
require('dotenv').config({ path: '.env.local' });

async function checkWallet() {
  const privateKey = process.env.OPERATOR_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.log('No private key found in env');
    process.exit(1);
  }

  const wallet = new ethers.Wallet(privateKey);
  console.log('Operator wallet:', wallet.address);

  // Check Polygon mainnet balance
  const polygonRpc = process.env.NEXT_PUBLIC_RPC_URL || 'https://polygon-rpc.com';
  console.log('RPC:', polygonRpc);

  const provider = new ethers.JsonRpcProvider(polygonRpc);

  try {
    const balance = await provider.getBalance(wallet.address);
    console.log('POL Balance:', ethers.formatEther(balance), 'POL');

    if (balance === 0n) {
      console.log('\n⚠️  Wallet has no POL for gas!');
      console.log('Send some POL to:', wallet.address);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkWallet();
