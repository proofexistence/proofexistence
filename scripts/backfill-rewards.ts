#!/usr/bin/env bun
/**
 * Backfill rewards for specific dates
 *
 * Usage:
 *   bun run scripts/backfill-rewards.ts                    # Dry run for yesterday (dev)
 *   bun run scripts/backfill-rewards.ts --date 2026-01-01  # Dry run for specific date
 *   bun run scripts/backfill-rewards.ts --date 2026-01-01 --insert  # Actually insert
 *   bun run scripts/backfill-rewards.ts --range 2026-01-01 2026-01-03 --insert  # Range
 *   bun run scripts/backfill-rewards.ts --prod --range 2026-01-01 2026-01-03    # Use production DB
 *
 * Environment:
 *   --prod    Use .env.production instead of .env.local
 */

import { config } from 'dotenv';

// Load environment based on --prod flag BEFORE any other imports
const isProd = process.argv.includes('--prod');
if (isProd) {
  config({ path: '.env.production', override: true });
  console.log('🔴 USING PRODUCTION DATABASE');
  console.log(`   DATABASE_URL: ${process.env.DATABASE_URL?.slice(0, 30)}...`);
} else {
  config({ path: '.env.local', override: true });
  console.log('🟢 Using development database (.env.local)');
}

// Dynamic imports after env is loaded
const { neon } = await import('@neondatabase/serverless');
const { drizzle } = await import('drizzle-orm/neon-http');
const schema = await import('../src/db/schema');
const { eq, and, gte, lte, sql } = await import('drizzle-orm');
const rewards = await import('../src/lib/rewards/calculate');

// Create DB connection with current env
const sqlClient = neon(process.env.DATABASE_URL!);
const db = drizzle(sqlClient, { schema });

const { sessions, dailyRewards, userDailyRewards, users } = schema;
const { calculateDailyRewards, getDayStartEnd, formatTime26 } = rewards;
type DrawingPeriod = rewards.DrawingPeriod;

async function processDay(
  dayId: string,
  shouldInsert: boolean
): Promise<boolean> {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Processing: ${dayId}`);
  console.log('='.repeat(50));

  // Check if already settled
  const existingSettlement = await db
    .select()
    .from(dailyRewards)
    .where(eq(dailyRewards.dayId, dayId))
    .limit(1);

  if (existingSettlement.length > 0) {
    console.log(`⏭️  Already settled, skipping`);
    return true;
  }

  // Fetch sessions for the day
  const { start, end } = getDayStartEnd(dayId);
  console.log(`Query range: ${start.toISOString()} to ${end.toISOString()}`);

  const daySessions = await db
    .select({
      id: sessions.id,
      userId: sessions.userId,
      startTime: sessions.startTime,
      duration: sessions.duration,
    })
    .from(sessions)
    .where(and(gte(sessions.startTime, start), lte(sessions.startTime, end)));

  console.log(`Sessions found: ${daySessions.length}`);

  if (daySessions.length === 0) {
    console.log(`⚠️  No sessions for this day`);
    return true;
  }

  // Calculate rewards
  const drawingPeriods: DrawingPeriod[] = daySessions.map((s) => ({
    userId: s.userId,
    sessionId: s.id,
    startTime: s.startTime,
    duration: s.duration,
  }));

  const rewardResult = calculateDailyRewards(dayId, drawingPeriods);

  console.log(`\nReward Summary:`);
  console.log(`  Participants: ${rewardResult.participantCount}`);
  console.log(`  Total Seconds: ${rewardResult.totalSeconds}`);
  console.log(
    `  Total Distributed: ${formatTime26(rewardResult.totalDistributed)} TIME26`
  );

  console.log(`\nUser Rewards:`);
  for (const ur of rewardResult.userRewards) {
    console.log(
      `  ${ur.userId.slice(0, 8)}... | ${ur.totalSeconds}s | ${formatTime26(ur.totalReward)} TIME26`
    );
  }

  if (!shouldInsert) {
    console.log(`\n🔍 DRY RUN - no data inserted`);
    return true;
  }

  // Insert data
  console.log(`\n📝 Inserting data...`);
  try {
    // Insert daily summary
    await db.insert(dailyRewards).values({
      dayId,
      totalBudget: rewardResult.totalBudget,
      totalSeconds: rewardResult.totalSeconds,
      totalDistributed: rewardResult.totalDistributed,
      participantCount: rewardResult.participantCount,
      contractBalanceBefore: null,
      contractBalanceAfter: null,
    });
    console.log(`  ✅ daily_rewards inserted`);

    // Insert per-user rewards and update balances
    for (const userReward of rewardResult.userRewards) {
      await db.insert(userDailyRewards).values({
        userId: userReward.userId,
        dayId,
        totalSeconds: userReward.totalSeconds,
        exclusiveSeconds: userReward.exclusiveSeconds,
        sharedSeconds: userReward.sharedSeconds,
        baseReward: userReward.baseReward,
        bonusReward: userReward.bonusReward,
        totalReward: userReward.totalReward,
      });

      await db
        .update(users)
        .set({
          time26Balance: sql`${users.time26Balance} + ${userReward.totalReward}::numeric`,
        })
        .where(eq(users.id, userReward.userId));
    }
    console.log(
      `  ✅ user_daily_rewards inserted (${rewardResult.userRewards.length} users)`
    );
    console.log(`  ✅ user balances updated`);

    return true;
  } catch (err) {
    console.error(`  ❌ INSERT FAILED:`, err);
    return false;
  }
}

function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate + 'T00:00:00Z');
  const end = new Date(endDate + 'T00:00:00Z');

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

async function main() {
  const args = process.argv.slice(2);
  const shouldInsert = args.includes('--insert');

  let dates: string[] = [];

  // Parse arguments
  const rangeIndex = args.indexOf('--range');
  const dateIndex = args.indexOf('--date');

  if (rangeIndex !== -1 && args[rangeIndex + 1] && args[rangeIndex + 2]) {
    // Range mode: --range START END
    const startDate = args[rangeIndex + 1];
    const endDate = args[rangeIndex + 2];
    dates = getDateRange(startDate, endDate);
    console.log(`Processing date range: ${startDate} to ${endDate}`);
  } else if (dateIndex !== -1 && args[dateIndex + 1]) {
    // Single date mode: --date DATE
    dates = [args[dateIndex + 1]];
  } else {
    // Default: yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    dates = [yesterday.toISOString().split('T')[0]];
  }

  console.log(`\n🚀 Backfill Rewards Script`);
  console.log(`Mode: ${shouldInsert ? '📝 INSERT' : '🔍 DRY RUN'}`);
  console.log(`Dates to process: ${dates.join(', ')}`);

  if (isProd && shouldInsert) {
    console.log(`\n⚠️  WARNING: You are about to INSERT into PRODUCTION!`);
    console.log(`   Press Ctrl+C within 5 seconds to abort...`);
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  let successCount = 0;
  let failCount = 0;

  for (const date of dates) {
    const success = await processDay(date, shouldInsert);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`SUMMARY`);
  console.log('='.repeat(50));
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);

  if (!shouldInsert) {
    console.log(`\n💡 Add --insert flag to actually insert data`);
  }

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
