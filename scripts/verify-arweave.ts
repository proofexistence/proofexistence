import Arweave from 'arweave';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

// Initialize Arweave
const arweave = Arweave.init({
  host: 'arweave.net',
  port: 443,
  protocol: 'https',
  logging: true,
});

async function main() {
  try {
    console.log('Initializing Arweave...');

    const jwkStr = process.env.ARWEAVE_JWK;
    if (!jwkStr) {
      throw new Error('ARWEAVE_JWK is missing');
    }

    let jwk;
    try {
      jwk = JSON.parse(jwkStr);
    } catch (e) {
      throw new Error('Invalid JSON in ARWEAVE_JWK');
    }

    const address = await arweave.wallets.jwkToAddress(jwk);
    console.log('Wallet address:', address);

    const winston = await arweave.wallets.getBalance(address);
    const ar = arweave.ar.winstonToAr(winston);
    console.log('Balance (Winston):', winston);
    console.log('Balance (AR):', ar);

    const balanceAr = parseFloat(ar);
    if (balanceAr < 0.1) {
      console.warn('Warning: Balance is low (< 0.1 AR)');
    } else {
      console.log('Balance is sufficient.');
    }

    // Estimate price for 100KB data
    const size = 100 * 1024;
    const priceWinston = await arweave.transactions.getPrice(size);
    const priceAr = arweave.ar.winstonToAr(priceWinston);

    console.log(`Estimated price for 100KB: ${priceAr} AR`);
  } catch (e) {
    console.error('Error:', e);
  }
}

main();
