const Irys = require('@irys/sdk');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const key = process.env.PRIVATE_KEY;
  const isTestnet = process.env.NEXT_PUBLIC_IS_TESTNET === 'true';
  const network = isTestnet ? 'devnet' : 'mainnet';

  // Use public RPC to avoid Alchemy gas estimation issues
  const rpc = isTestnet
    ? 'https://rpc-amoy.polygon.technology/'
    : 'https://polygon-rpc.com';

  console.log('Network:', network);
  console.log('RPC:', rpc);

  const irys = new Irys({
    network: network,
    token: 'matic',
    key: key,
    config: { providerUrl: rpc },
  });

  const fundAmount = '100000000000000000'; // 0.1 MATIC in wei

  console.log(
    'Current balance:',
    irys.utils.fromAtomic(await irys.getLoadedBalance()).toString(),
    'MATIC'
  );
  console.log(
    'Funding',
    irys.utils.fromAtomic(fundAmount).toString(),
    'MATIC...'
  );

  try {
    const receipt = await irys.fund(irys.utils.toAtomic(0.1));
    console.log('✅ Funded successfully!');
    console.log('TX:', receipt.id);
    console.log(
      'New balance:',
      irys.utils.fromAtomic(await irys.getLoadedBalance()).toString(),
      'MATIC'
    );
  } catch (e) {
    console.error('❌ Funding failed:', e.message);
  }
}

main();
