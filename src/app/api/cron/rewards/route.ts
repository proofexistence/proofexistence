/**
 * Daily TIME26 Reward Settlement Cron Job
 *
 * Runs daily at 00:05 UTC to settle the previous day's rewards
 * - Calculates time-weighted rewards for all active users
 * - Updates off-chain balances
 * - Records settlement in DB for audit trail
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sessions, users, dailyRewards, userDailyRewards } from '@/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import {
  calculateDailyRewards,
  getYesterdayDayId,
  getDayStartEnd,
  formatTime26,
  type DrawingPeriod,
} from '@/lib/rewards/calculate';
import { ethers } from 'ethers';
import {
  TIME26_ADDRESS,
  TIME26_ABI,
  PROOF_RECORDER_ADDRESS,
} from '@/lib/contracts';
import { createPolygonProvider } from '@/lib/provider';

// Force dynamic to avoid caching
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  console.log('[Rewards Cron] Starting daily reward settlement...');

  try {
    // 1. Security Check - Vercel Cron uses Authorization: Bearer <CRON_SECRET>
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log('[Rewards Cron] Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Determine which day to settle (yesterday for T+1)
    const dayId = getYesterdayDayId();
    console.log(`[Rewards Cron] Settling rewards for: ${dayId}`);

    // 3. Check if already settled
    const existingSettlement = await db
      .select()
      .from(dailyRewards)
      .where(eq(dailyRewards.dayId, dayId))
      .limit(1);

    if (existingSettlement.length > 0) {
      console.log(`[Rewards Cron] Day ${dayId} already settled, skipping`);
      return NextResponse.json({
        success: true,
        message: `Day ${dayId} already settled`,
        skipped: true,
      });
    }

    // 4. Fetch all sessions for the day
    const { start, end } = getDayStartEnd(dayId);
    const daySessions = await db
      .select({
        id: sessions.id,
        userId: sessions.userId,
        startTime: sessions.startTime,
        duration: sessions.duration,
      })
      .from(sessions)
      .where(and(gte(sessions.startTime, start), lte(sessions.startTime, end)));

    console.log(
      `[Rewards Cron] Found ${daySessions.length} sessions for ${dayId}`
    );

    // 5. Calculate rewards
    const drawingPeriods: DrawingPeriod[] = daySessions.map((s) => ({
      userId: s.userId,
      sessionId: s.id,
      startTime: s.startTime,
      duration: s.duration,
    }));

    const rewardResult = calculateDailyRewards(dayId, drawingPeriods);
    console.log(
      `[Rewards Cron] Calculated: ${rewardResult.participantCount} participants, ` +
        `${formatTime26(rewardResult.totalDistributed)} TIME26 distributed`
    );

    // 6. Get contract balance for auditing (optional)
    let contractBalanceBefore: string | null = null;
    try {
      const provider = createPolygonProvider();
      const time26Contract = new ethers.Contract(
        TIME26_ADDRESS,
        TIME26_ABI,
        provider
      );
      const balance = await time26Contract.balanceOf(PROOF_RECORDER_ADDRESS);
      const balanceStr = balance.toString();
      contractBalanceBefore = balanceStr;
      console.log(
        `[Rewards Cron] Contract balance: ${formatTime26(balanceStr)} TIME26`
      );
    } catch (err) {
      console.warn('[Rewards Cron] Could not fetch contract balance:', err);
    }

    // 7. Begin database transaction
    await db.transaction(async (tx) => {
      // 7a. Record daily summary
      await tx.insert(dailyRewards).values({
        dayId,
        totalBudget: rewardResult.totalBudget,
        totalSeconds: rewardResult.totalSeconds,
        totalDistributed: rewardResult.totalDistributed,
        participantCount: rewardResult.participantCount,
        contractBalanceBefore,
        contractBalanceAfter: null, // Will be updated after claims
      });

      // 7b. Record per-user rewards and update balances
      for (const userReward of rewardResult.userRewards) {
        // Record reward breakdown
        await tx.insert(userDailyRewards).values({
          userId: userReward.userId,
          dayId,
          totalSeconds: userReward.totalSeconds,
          exclusiveSeconds: userReward.exclusiveSeconds,
          sharedSeconds: userReward.sharedSeconds,
          baseReward: userReward.baseReward,
          bonusReward: userReward.bonusReward,
          totalReward: userReward.totalReward,
        });

        // Update user's off-chain balance
        await tx
          .update(users)
          .set({
            time26Balance: sql`${users.time26Balance} + ${userReward.totalReward}::numeric`,
          })
          .where(eq(users.id, userReward.userId));
      }
    });

    console.log(`[Rewards Cron] Settlement complete for ${dayId}`);

    return NextResponse.json({
      success: true,
      dayId,
      participantCount: rewardResult.participantCount,
      totalSeconds: rewardResult.totalSeconds,
      totalDistributed: formatTime26(rewardResult.totalDistributed),
      userRewards: rewardResult.userRewards.map((r) => ({
        userId: r.userId,
        totalSeconds: r.totalSeconds,
        exclusiveSeconds: r.exclusiveSeconds,
        sharedSeconds: r.sharedSeconds,
        reward: formatTime26(r.totalReward),
      })),
    });
  } catch (error) {
    console.error('[Rewards Cron] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
