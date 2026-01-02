const Irys = require('@irys/sdk');
const readline = require('readline');
require('dotenv').config({ path: '.env.local' });

function createPrompt() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function ask(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  const key = process.env.PRIVATE_KEY;
  const rl = createPrompt();

  try {
    // Step 1: Select network
    console.log('\n=== Irys Balance Checker ===\n');
    console.log('Select network:');
    console.log('  1. devnet (Polygon Amoy testnet)');
    console.log('  2. mainnet (Polygon mainnet)');

    const networkChoice = await ask(
      rl,
      '\nEnter choice (1 or 2) [default: 1]: '
    );
    const isMainnet = networkChoice.trim() === '2';
    const network = isMainnet ? 'mainnet' : 'devnet';

    const rpc = isMainnet
      ? process.env.NEXT_PUBLIC_RPC_URL || 'https://polygon-rpc.com'
      : 'https://rpc-amoy.polygon.technology/';

    console.log('\n=== Irys Configuration ===');
    console.log('Network:', network);
    console.log('RPC:', rpc);

    if (!key) {
      console.error('❌ PRIVATE_KEY not found in .env.local');
      rl.close();
      return;
    }

    const irys = new Irys({
      network: network,
      token: 'matic',
      key: key,
      config: { providerUrl: rpc },
    });

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
    console.error('❌ Error:', e.message);
  } finally {
    rl.close();
  }
}

main();
