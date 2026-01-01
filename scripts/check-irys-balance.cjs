const Irys = require('@irys/sdk');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const key = process.env.PRIVATE_KEY;
  const isTestnet = process.env.NEXT_PUBLIC_IS_TESTNET === 'true';
  const network = isTestnet ? 'devnet' : 'mainnet';
  const rpc = isTestnet
    ? 'https://rpc-amoy.polygon.technology/'
    : process.env.NEXT_PUBLIC_RPC_URL || 'https://polygon-rpc.com';

  console.log('=== Irys Configuration ===');
  console.log('Network:', network);
  console.log('RPC:', rpc);
  console.log('NEXT_PUBLIC_IS_TESTNET:', process.env.NEXT_PUBLIC_IS_TESTNET);

  if (!key) {
    console.error('PRIVATE_KEY not found');
    return;
  }

  const irys = new Irys({
    network: network,
    token: 'matic',
    key: key,
    config: { providerUrl: rpc },
  });

  try {
    const balance = await irys.getLoadedBalance();
    const address = irys.address;

    console.log('\n=== Irys Account ===');
    console.log('Address:', address);
    console.log('Balance:', irys.utils.fromAtomic(balance).toString(), 'MATIC');

    // Test price for 1KB
    const price = await irys.getPrice(1024);
    console.log(
      'Price for 1KB:',
      irys.utils.fromAtomic(price).toString(),
      'MATIC'
    );

    if (balance.lt(price)) {
      console.log('\n⚠️  Balance too low! Need to fund Irys account.');
    } else {
      console.log('\n✅ Balance sufficient for uploads.');
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

main();
