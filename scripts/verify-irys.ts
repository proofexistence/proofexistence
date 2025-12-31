import Irys from '@irys/sdk';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const getIrys = async () => {
  const key = process.env.PRIVATE_KEY || process.env.IRYS_PRIVATE_KEY;
  const rpc = process.env.NEXT_PUBLIC_RPC_URL || 'https://polygon-rpc.com';

  if (!key) {
    throw new Error('IRYS_PRIVATE_KEY is missing');
  }

  const irys = new Irys({
    network: 'mainnet',
    token: 'matic',
    key: key,
    config: { providerUrl: rpc },
  });

  return irys;
};

async function main() {
  try {
    console.log('Initializing Irys...');
    const irys = await getIrys();

    const address = irys.address;
    console.log('Wallet address:', address);

    const balance = await irys.getLoadedBalance();
    console.log('Balance (Atomic):', balance.toString());
    console.log('Balance (MATIC):', irys.utils.fromAtomic(balance));

    // Estimate price for small data (metadata size ~ 1KB)
    const size = 1000;
    const price = await irys.getPrice(size);
    console.log(
      `Price for ${size} bytes:`,
      irys.utils.fromAtomic(price),
      'MATIC'
    );

    if (balance.lt(price)) {
      console.error('Insufficient balance!');
    } else {
      console.log('Balance is sufficient.');
    }
  } catch (e) {
    console.error('Error:', e);
  }
}

main();
