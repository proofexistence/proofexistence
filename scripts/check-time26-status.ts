/**
 * Quick status check for Time26 payment test
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { ethers } from 'ethers';

const POE_ADDRESS = '0x0c109bEc02C2b548980fE357BF32D938A0bfc5bf';
const TIME26_ADDRESS = '0x04dAa891066d5cAf98Df93c2C2Ae2F9b6B62e591';

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  console.log('Wallet:', wallet.address);

  // Check nonces
  const nonce = await provider.getTransactionCount(wallet.address, 'latest');
  const pendingNonce = await provider.getTransactionCount(
    wallet.address,
    'pending'
  );
  console.log('Nonce (latest):', nonce);
  console.log('Nonce (pending):', pendingNonce);
  console.log('Pending TXs:', pendingNonce - nonce);

  // Check TIME26 allowance
  const time26 = new ethers.Contract(
    TIME26_ADDRESS,
    [
      'function allowance(address owner, address spender) view returns (uint256)',
      'function balanceOf(address) view returns (uint256)',
    ],
    provider
  );

  const allowance = await time26.allowance(wallet.address, POE_ADDRESS);
  const balance = await time26.balanceOf(wallet.address);

  console.log('TIME26 Balance:', ethers.formatUnits(balance, 18));
  console.log('TIME26 Allowance for POE:', ethers.formatUnits(allowance, 18));

  // Check POE config
  const poe = new ethers.Contract(
    POE_ADDRESS,
    [
      'function deflationMode() view returns (bool)',
      'function baseFeeTime26() view returns (uint256)',
      'function pricePerSecondTime26() view returns (uint256)',
    ],
    provider
  );

  const deflationMode = await poe.deflationMode();
  const baseFee = await poe.baseFeeTime26();
  const pricePerSecond = await poe.pricePerSecondTime26();

  console.log('Deflation Mode:', deflationMode);
  console.log('Base Fee TIME26:', ethers.formatUnits(baseFee, 18));
  console.log('Price/Second TIME26:', ethers.formatUnits(pricePerSecond, 18));
}

main().catch(console.error);
