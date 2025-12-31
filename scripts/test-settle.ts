/**
 * Test script for /api/cron/settle endpoint
 * Run: npx tsx scripts/test-settle.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

const CRON_SECRET = process.env.CRON_SECRET;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testSettle() {
  if (!CRON_SECRET) {
    console.error('❌ CRON_SECRET not set in .env.local');
    process.exit(1);
  }

  console.log('🚀 Testing settle API...');
  console.log(`📍 URL: ${BASE_URL}/api/cron/settle`);

  try {
    // Use AbortController for longer timeout (3 minutes)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180000);

    const response = await fetch(`${BASE_URL}/api/cron/settle`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${CRON_SECRET}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await response.json();

    if (response.ok) {
      console.log('\n✅ Settlement successful!');
      console.log('━'.repeat(40));
      console.log(`📦 Settled count: ${data.settledCount}`);
      console.log(`🌳 Merkle root: ${data.merkleRoot}`);
      console.log(`📁 Arweave ID: ${data.arweaveId}`);
      console.log(`⛓️  TX Hash: ${data.txHash}`);
      console.log('━'.repeat(40));
      console.log(`\n🔗 View on PolygonScan:`);
      console.log(`   https://amoy.polygonscan.com/tx/${data.txHash}`);
    } else {
      console.error('\n❌ Settlement failed:');
      console.error(data);
    }
  } catch (error) {
    console.error('\n❌ Request failed:', error);
    console.log('\n💡 Make sure dev server is running: bun run dev');
  }

  process.exit(0);
}

testSettle();
