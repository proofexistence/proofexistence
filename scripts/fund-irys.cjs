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
    console.log('\n=== Irys Funding Script ===\n');
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
      ? 'https://polygon-rpc.com'
      : 'https://rpc-amoy.polygon.technology/';

    console.log('\n> Selected network:', network);
    console.log('> RPC:', rpc);

    // Step 2: Enter funding amount
    const amountInput = await ask(
      rl,
      '\nEnter amount to fund in MATIC [default: 0.1]: '
    );
    const amount = parseFloat(amountInput.trim()) || 0.1;

    if (amount <= 0) {
      console.error('❌ Invalid amount. Must be greater than 0.');
      rl.close();
      return;
    }

    console.log('\n> Funding amount:', amount, 'MATIC');

    // Initialize Irys
    const irys = new Irys({
      network: network,
      token: 'matic',
      key: key,
      config: { providerUrl: rpc },
    });

    console.log(
      '\nCurrent balance:',
      irys.utils.fromAtomic(await irys.getLoadedBalance()).toString(),
      'MATIC'
    );

    // Confirm before funding
    const confirm = await ask(
      rl,
      `\nProceed with funding ${amount} MATIC to ${network}? (y/n) [default: y]: `
    );
    if (confirm.trim().toLowerCase() === 'n') {
      console.log('Cancelled.');
      rl.close();
      return;
    }

    console.log('\nFunding', amount, 'MATIC...');

    const receipt = await irys.fund(irys.utils.toAtomic(amount));
    console.log('✅ Funded successfully!');
    console.log('TX:', receipt.id);
    console.log(
      'New balance:',
      irys.utils.fromAtomic(await irys.getLoadedBalance()).toString(),
      'MATIC'
    );
  } catch (e) {
    console.error('❌ Funding failed:', e.message);
  } finally {
    rl.close();
  }
}

main();
