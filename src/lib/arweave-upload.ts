import { TurboFactory, ArweaveSigner } from '@ardrive/turbo-sdk';
import Arweave from 'arweave';
import { Readable } from 'stream';

// Check for testnet flag
export const isTestnet = process.env.NEXT_PUBLIC_IS_TESTNET === 'true';

// Initialize Arweave for utils (address generation, ar conversion)
const arweave = Arweave.init({
  host: 'arweave.net',
  port: 443,
  protocol: 'https',
});

// Helper to get Turbo Client
const getTurbo = async () => {
  const jwkStr = process.env.ARWEAVE_JWK;
  if (!jwkStr) {
    throw new Error('ARWEAVE_JWK is missing in environment variables');
  }

  let jwk;
  try {
    jwk = JSON.parse(jwkStr);
  } catch {
    throw new Error('Failed to parse ARWEAVE_JWK');
  }

  const signer = new ArweaveSigner(jwk);
  return TurboFactory.authenticated({ signer });
};

/**
 * Upload data to ArDrive Turbo (Instant Access)
 * @param data - String or Buffer data to upload
 * @param customTags - Array of { name, value } tags
 * @returns - The transaction ID (TXID)
 */
export const uploadToArweave = async (
  data: string | Buffer,
  customTags: { name: string; value: string }[] = []
): Promise<string> => {
  const turbo = await getTurbo();

  const tags = [
    { name: 'App-Name', value: 'ProofOfExistence2026' },
    { name: 'Version', value: '2.3' },
    { name: 'Timestamp', value: Date.now().toString() },
    ...customTags,
  ];

  // Ensure Content-Type
  if (!tags.find((t) => t.name === 'Content-Type')) {
    tags.push({ name: 'Content-Type', value: 'application/json' });
  }

  // Prepare data
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const fileSize = buffer.length;

  try {
    const uploadResult = await turbo.uploadFile({
      fileStreamFactory: () => Readable.from(buffer),
      fileSizeFactory: () => fileSize,
      dataItemOpts: {
        tags,
      },
    });

    return uploadResult.id;
  } catch (e) {
    console.error('Turbo upload failed:', e);
    throw e;
  }
};

// Check TURBO CREDITS balance (Winc) -> Converted to AR
export const getArweaveBalance = async (): Promise<string> => {
  try {
    const turbo = await getTurbo();
    const balance = await turbo.getBalance(); // Returns { winc: string }
    return arweave.ar.winstonToAr(balance.winc);
  } catch (e) {
    console.error('Failed to get Turbo balance:', e);
    return '0';
  }
};

// Export arweave instance if needed elsewhere
export { arweave };
