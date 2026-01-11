/**
 * Backfill TIME26 Transactions
 *
 * This script populates the time26_transactions table with historical data from:
 * 1. userDailyRewards - daily proof rewards
 * 2. bonusRewards - ranking, referral, airdrop, contest, kol bonuses
 * 3. Historical spend - calculated from difference
 *
 * Run with: bun run scripts/backfill-transactions.ts
 */

import { db } from '../src/db';
import {
  users,
  userDailyRewards,
  bonusRewards,
  time26Transactions,
} from '../src/db/schema';
import { eq, desc } from 'drizzle-orm';

async function backfillTransactions() {
  console.log('Starting TIME26 transactions backfill...\n');

  // Get all users
  const allUsers = await db
    .select({
      id: users.id,
      walletAddress: users.walletAddress,
      time26Balance: users.time26Balance,
      time26PendingBurn: users.time26PendingBurn,
    })
    .from(users);

  console.log(`Found ${allUsers.length} users to process\n`);

  let totalDailyRewards = 0;
  let totalBonusRewards = 0;
  let totalHistoricalSpend = 0;

  for (const user of allUsers) {
    const balance = BigInt(user.time26Balance || '0');
    const pendingBurn = BigInt(user.time26PendingBurn || '0');

    // Track running balance for this user
    let runningBalance = BigInt(0);
    let totalEarned = BigInt(0);

    // 1. Get all daily rewards for this user (ordered by date)
    const dailyRewards = await db
      .select()
      .from(userDailyRewards)
      .where(eq(userDailyRewards.userId, user.id))
      .orderBy(userDailyRewards.dayId);

    // Skip users with no rewards
    if (dailyRewards.length === 0) {
      // Check for bonus rewards too
      const bonusCheck = await db
        .select()
        .from(bonusRewards)
        .where(eq(bonusRewards.userId, user.id))
        .limit(1);
      if (bonusCheck.length === 0) continue;
    }

    console.log(`\nProcessing user: ${user.walletAddress}`);
    console.log(`  Found ${dailyRewards.length} daily reward records`);

    for (const reward of dailyRewards) {
      const amount = BigInt(reward.totalReward);
      if (amount === BigInt(0)) continue;

      const balanceBefore = runningBalance;
      runningBalance += amount;
      totalEarned += amount;

      await db.insert(time26Transactions).values({
        userId: user.id,
        type: 'daily_reward',
        amount: reward.totalReward,
        direction: 'credit',
        balanceBefore: balanceBefore.toString(),
        balanceAfter: runningBalance.toString(),
        referenceId: reward.dayId,
        referenceType: 'daily_reward',
        description: `Daily reward for ${reward.dayId} (${reward.totalSeconds}s drawing)`,
        metadata: {
          dayId: reward.dayId,
          totalSeconds: reward.totalSeconds,
          exclusiveSeconds: reward.exclusiveSeconds,
          sharedSeconds: reward.sharedSeconds,
          baseReward: reward.baseReward,
          bonusReward: reward.bonusReward,
          originalCreatedAt: reward.createdAt?.toISOString(),
        },
        createdAt: reward.createdAt || new Date(),
      });

      totalDailyRewards++;
    }

    // 2. Get all bonus rewards for this user (ordered by creation date)
    const bonuses = await db
      .select()
      .from(bonusRewards)
      .where(eq(bonusRewards.userId, user.id))
      .orderBy(bonusRewards.createdAt);

    console.log(`  Found ${bonuses.length} bonus reward records`);

    for (const bonus of bonuses) {
      // Only count approved/sent bonuses
      if (bonus.status === 'PENDING') continue;

      const amount = BigInt(bonus.amount);
      if (amount === BigInt(0)) continue;

      const balanceBefore = runningBalance;
      runningBalance += amount;
      totalEarned += amount;

      // Map bonus type to transaction type
      const typeMap: Record<string, string> = {
        ranking: 'ranking_bonus',
        referral: 'referral_bonus',
        airdrop: 'airdrop',
        contest: 'contest',
        kol: 'kol',
      };

      await db.insert(time26Transactions).values({
        userId: user.id,
        type: typeMap[bonus.type] || bonus.type,
        amount: bonus.amount,
        direction: 'credit',
        balanceBefore: balanceBefore.toString(),
        balanceAfter: runningBalance.toString(),
        referenceId: bonus.id,
        referenceType: 'bonus_reward',
        description: bonus.description || `${bonus.type} bonus`,
        metadata: {
          bonusType: bonus.type,
          txHash: bonus.txHash,
          status: bonus.status,
          originalCreatedAt: bonus.createdAt?.toISOString(),
          approvedAt: bonus.approvedAt?.toISOString(),
        },
        createdAt: bonus.createdAt || new Date(),
      });

      totalBonusRewards++;
    }

    // 3. Calculate and record historical spend
    // totalSpent = totalEarned - currentBalance - pendingBurn
    // (pendingBurn is already deducted from balance, so this represents burned + pending)
    const totalSpent = totalEarned - balance - pendingBurn;

    console.log(
      `  Earned: ${totalEarned}, Balance: ${balance}, PendingBurn: ${pendingBurn}`
    );

    if (totalSpent > BigInt(0)) {
      console.log(`  Historical spend: ${totalSpent}`);

      const balanceBefore = runningBalance;
      runningBalance -= totalSpent;

      await db.insert(time26Transactions).values({
        userId: user.id,
        type: 'historical_debit',
        amount: totalSpent.toString(),
        direction: 'debit',
        balanceBefore: balanceBefore.toString(),
        balanceAfter: runningBalance.toString(),
        referenceId: null,
        referenceType: null,
        description:
          'Historical spending (instant proofs, NFT mints) - aggregated',
        metadata: {
          note: 'Aggregated historical spend before transaction logging was implemented',
          calculatedFrom: {
            totalEarned: totalEarned.toString(),
            currentBalance: balance.toString(),
            pendingBurn: pendingBurn.toString(),
          },
        },
        createdAt: new Date(),
      });

      totalHistoricalSpend++;
    }

    // Verify final balance matches
    const expectedBalance = balance + pendingBurn; // pendingBurn is deducted but not yet burned
    if (runningBalance !== expectedBalance) {
      console.warn(
        `  ⚠️ Balance mismatch! Running: ${runningBalance}, Expected: ${expectedBalance}`
      );
    } else {
      console.log(`  ✓ Balance verified: ${runningBalance}`);
    }
  }

  console.log('\n========================================');
  console.log('Backfill complete!');
  console.log(`  Daily rewards:     ${totalDailyRewards}`);
  console.log(`  Bonus rewards:     ${totalBonusRewards}`);
  console.log(`  Historical spend:  ${totalHistoricalSpend}`);
  console.log('========================================\n');
}

// Run the backfill
backfillTransactions()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exit(1);
  });
