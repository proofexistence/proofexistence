/**
 * Add test TIME26 balance to a user for testing claim feature
 *
 * Usage: node scripts/add-test-balance.cjs <wallet_address> [amount]
 * Example: node scripts/add-test-balance.cjs 0x123... 1000
 */

const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

async function addTestBalance() {
  const walletAddress = process.argv[2];
  const amount = process.argv[3] || '1000'; // Default 1000 TIME26

  if (!walletAddress) {
    console.error('Usage: node scripts/add-test-balance.cjs <wallet_address> [amount]');
    process.exit(1);
  }

  // Convert to wei (18 decimals)
  const amountWei = BigInt(amount) * BigInt(10 ** 18);

  try {
    const result = await sql`
      UPDATE users
      SET time26_balance = time26_balance + ${amountWei.toString()}::numeric
      WHERE LOWER(wallet_address) = LOWER(${walletAddress})
      RETURNING id, wallet_address, time26_balance
    `;

    if (result.length === 0) {
      console.error('User not found with wallet:', walletAddress);
      process.exit(1);
    }

    const user = result[0];
    const balanceFormatted = (BigInt(user.time26_balance) / BigInt(10 ** 18)).toString();

    console.log('\n✓ Added test balance');
    console.log('  Wallet:', user.wallet_address);
    console.log('  Added:', amount, 'TIME26');
    console.log('  New Balance:', balanceFormatted, 'TIME26');
    console.log('\nNote: Run the cron to update Merkle root before claiming:');
    console.log('  curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/daily');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

addTestBalance();
