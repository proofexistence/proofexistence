/**
 * Migration Script: Rename time26_spent to time26_pending_burn
 *
 * Run with:
 *   node scripts/migrate-pending-burn.cjs           # staging (default)
 *   node scripts/migrate-pending-burn.cjs production # production
 */

const { neon } = require('@neondatabase/serverless');
require('dotenv').config({
  path: process.argv[2] === 'production' ? '.env.production' : '.env.local'
});

const sql = neon(process.env.DATABASE_URL);

async function migrateColumn() {
  const env = process.argv[2] === 'production' ? 'PRODUCTION' : 'STAGING';
  console.log(`\n=== Running migration on ${env} ===\n`);

  try {
    // Check existing columns
    const result = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('time26_spent', 'time26_pending_burn')
    `;

    const existingColumns = result.map(r => r.column_name);
    console.log('Existing columns:', existingColumns);

    const hasSpent = existingColumns.includes('time26_spent');
    const hasPendingBurn = existingColumns.includes('time26_pending_burn');

    if (hasSpent && !hasPendingBurn) {
      // Rename existing column
      await sql`ALTER TABLE users RENAME COLUMN time26_spent TO time26_pending_burn`;
      console.log('✓ Renamed time26_spent to time26_pending_burn');
    } else if (!hasSpent && !hasPendingBurn) {
      // Create new column
      await sql`ALTER TABLE users ADD COLUMN time26_pending_burn NUMERIC(78, 0) DEFAULT '0' NOT NULL`;
      console.log('✓ Created time26_pending_burn column');
    } else if (hasPendingBurn && hasSpent) {
      // Both exist - drop old one
      await sql`ALTER TABLE users DROP COLUMN time26_spent`;
      console.log('✓ Dropped redundant time26_spent column (time26_pending_burn already exists)');
    } else {
      console.log('✓ time26_pending_burn already exists, no changes needed');
    }

    // Verify final state
    const finalCheck = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name = 'time26_pending_burn'
    `;

    if (finalCheck.length > 0) {
      console.log('\nColumn details:', finalCheck[0]);
    }

    console.log(`\n=== Migration complete for ${env} ===\n`);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrateColumn();
