#!/usr/bin/env bun
/**
 * Push schema to production database
 * Usage: bun run scripts/push-prod-schema.ts
 */

import { config } from 'dotenv';
import { execSync } from 'child_process';

// Load production env
config({ path: '.env.production', override: true });

console.log('🔴 Pushing schema to PRODUCTION database');
console.log(`   DATABASE_URL: ${process.env.DATABASE_URL?.slice(0, 40)}...`);
console.log('');

// Run drizzle-kit push
try {
  execSync('npx drizzle-kit push --force', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL,
    },
  });
  console.log('\n✅ Schema pushed successfully!');
} catch (err) {
  console.error('\n❌ Failed to push schema');
  process.exit(1);
}
