import Irys from '@irys/sdk';

// Initialize Irys on the server (Polygon/Matic)
export const getIrys = async () => {
  const key = process.env.PRIVATE_KEY || process.env.IRYS_PRIVATE_KEY;
  // Check for testnet flag (respects explicit false even in dev mode)
  const isTestnet =
    process.env.NEXT_PUBLIC_IS_TESTNET === 'true' ||
    (process.env.NODE_ENV === 'development' &&
      process.env.NEXT_PUBLIC_IS_TESTNET !== 'false');
  const network = isTestnet ? 'devnet' : 'mainnet';

  // Select RPC based on network
  // Devnet = Amoy, Mainnet = Polygon Mainnet
  // CRITICAL: Force Amoy for devnet to avoid env vars pointing to Mainnet
  const rpc =
    network === 'devnet'
      ? 'https://rpc-amoy.polygon.technology/'
      : process.env.NEXT_PUBLIC_RPC_URL || 'https://polygon-rpc.com';

  if (!key) {
    throw new Error('IRYS_PRIVATE_KEY is missing');
  }

  const irys = new Irys({
    network: network,
    token: 'matic',
    key: key,
    config: { providerUrl: rpc },
  });

  return irys;
};

export const uploadToIrys = async (
  data: string | Buffer,
  customTags: { name: string; value: string }[] = []
): Promise<string> => {
  const irys = await getIrys();

  const tags = [
    { name: 'App-Name', value: 'ProofOfExistence2026' },
    { name: 'Version', value: '2.3' },
    { name: 'Timestamp', value: Date.now().toString() },
    ...customTags,
  ];

  // If no Content-Type provided, default to JSON
  if (!tags.find((t) => t.name === 'Content-Type')) {
    tags.push({ name: 'Content-Type', value: 'application/json' });
  }

  // Auto-stringify object/string if not Buffer
  let dataToUpload = data;
  if (typeof data !== 'string' && !Buffer.isBuffer(data)) {
    dataToUpload = JSON.stringify(data);
  }

  try {
    const size = Buffer.isBuffer(dataToUpload)
      ? dataToUpload.length
      : Buffer.from(dataToUpload as string).length;
    const price = await irys.getPrice(size);
    const balance = await irys.getLoadedBalance();

    if (balance.lt(price)) {
      await irys.fund(price);
    }

    const receipt = await irys.upload(dataToUpload as string | Buffer, {
      tags,
    });
    return receipt.id;
  } catch (e) {
    console.error('Irys upload failed:', e);
    throw e;
  }
};
