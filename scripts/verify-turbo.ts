import { TurboFactory, ArweaveSigner } from '@ardrive/turbo-sdk';
import Arweave from 'arweave';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const arweave = Arweave.init({
  host: 'arweave.net',
  port: 443,
  protocol: 'https',
});

async function main() {
  try {
    console.log('Initializing ArDrive Turbo...');

    const jwkStr = process.env.ARWEAVE_JWK;
    if (!jwkStr) {
      throw new Error('ARWEAVE_JWK is missing');
    }

    const jwk = JSON.parse(jwkStr);
    const address = await arweave.wallets.jwkToAddress(jwk);
    console.log('Wallet address:', address);

    const signer = new ArweaveSigner(jwk);
    const turbo = TurboFactory.authenticated({ signer });

    const balance = await turbo.getBalance();
    console.log('Turbo Credits (Winc):', balance.winc);

    const arEquivalent = arweave.ar.winstonToAr(balance.winc);
    console.log('Turbo Credits (AR Equivalent):', arEquivalent);

    const balanceAr = parseFloat(arEquivalent);
    if (balanceAr < 0.1) {
      console.warn('Warning: Low Turbo Credits (< 0.1 AR equivalent)');
    } else {
      console.log('Credits are sufficient.');
    }

    // Estimate price for 100KB data
    const size = 100 * 1024;
    const rates = await turbo.getUploadRates();
    const priceWinc = (rates.winc * size) / 1024 / 1024; // Approximation or use SDK method if available (SDK usually handles this internally)

    // Turbo doesn't have a simple getPrice(byteSize) like Irys in the public docs easily accessible,
    // but the upload will fail if insufficient.
    // We can just rely on the balance check.
  } catch (e) {
    console.error('Error:', e);
  }
}

main();
