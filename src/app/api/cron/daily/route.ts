/**
 * Combined Daily Cron Job
 *
 * Runs daily at 00:00 UTC to:
 * 1. Settle pending sessions (Merkle tree batch)
 * 2. Calculate and distribute TIME26 rewards for yesterday
 *
 * This combines /api/cron/settle and /api/cron/rewards
 * to stay within Vercel's cron job limit.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import {
  sessions,
  dailySnapshots,
  users,
  dailyRewards,
  userDailyRewards,
} from '@/db/schema';
import { eq, and, gte, lte, inArray, sql } from 'drizzle-orm';
import { generateMerkleTree } from '@/lib/merkle';
import { uploadToIrys } from '@/lib/irys';
import { ethers } from 'ethers';
import {
  PROOF_OF_EXISTENCE_ADDRESS,
  PROOF_OF_EXISTENCE_ABI,
  TIME26_ADDRESS,
  TIME26_ABI,
  PROOF_RECORDER_ADDRESS,
} from '@/lib/contracts';
import {
  createAmoyProvider,
  createPolygonProvider,
  waitForTransaction,
} from '@/lib/provider';
import {
  calculateDailyRewards,
  getYesterdayDayId,
  getDayStartEnd,
  formatTime26,
  type DrawingPeriod,
} from '@/lib/rewards/calculate';

// Force dynamic to avoid caching
export const dynamic = 'force-dynamic';

// ============================================================
// Task 1: Settle Pending Sessions
// ============================================================
async function runSettle(): Promise<{
  success: boolean;
  settledCount: number;
  merkleRoot?: string;
  arweaveId?: string;
  txHash?: string;
  error?: string;
}> {
  console.log('[Daily Cron] Running settle task...');

  try {
    // Fetch Pending Sessions
    const pendingSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.status, 'PENDING'));

    if (pendingSessions.length === 0) {
      console.log('[Daily Cron] No pending sessions to settle');
      return { success: true, settledCount: 0 };
    }

    // Generate Merkle Tree
    const treeSessions = pendingSessions.map((s) => ({
      sessionId: s.id,
      userId: s.userId,
      timestamp: s.startTime.getTime(),
      data: JSON.stringify(s.trailData),
    }));

    const tree = generateMerkleTree(treeSessions);
    const root = tree.getHexRoot();

    // Upload Batch to Arweave (Irys)
    console.log('[Daily Cron] Uploading to Irys...');
    const batchData = JSON.stringify(pendingSessions);
    const ipfsCid = await uploadToIrys(batchData, [
      { name: 'Content-Type', value: 'application/json' },
      { name: 'Batch-Size', value: pendingSessions.length.toString() },
      { name: 'Merkle-Root', value: root },
    ]);

    // Submit to Blockchain
    console.log('[Daily Cron] Arweave ID:', ipfsCid);
    const provider = createAmoyProvider();
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('PRIVATE_KEY environment variable is not set');
    }
    const wallet = new ethers.Wallet(privateKey, provider);

    const nonce = await provider.getTransactionCount(wallet.address, 'latest');
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice ?? BigInt(0);
    const adjustedGasPrice = (gasPrice * BigInt(150)) / BigInt(100);

    const contract = new ethers.Contract(
      PROOF_OF_EXISTENCE_ADDRESS,
      PROOF_OF_EXISTENCE_ABI,
      wallet
    );

    const tx = await contract.emitBatchProof(root, ipfsCid, {
      nonce,
      gasPrice: adjustedGasPrice,
      gasLimit: 200000,
    });
    console.log('[Daily Cron] TX hash:', tx.hash);

    const receipt = await waitForTransaction(provider, tx.hash, 1, 120000);
    console.log('[Daily Cron] TX confirmed in block:', receipt.blockNumber);

    // Update Database
    const sessionIds = pendingSessions.map((s) => s.id);
    await db
      .update(sessions)
      .set({ status: 'SETTLED' })
      .where(inArray(sessions.id, sessionIds));

    const today = new Date().toISOString().split('T')[0];
    await db
      .insert(dailySnapshots)
      .values({
        dayId: today,
        merkleRoot: root,
        totalRewards: '0',
        participantCount: pendingSessions.length,
        txHash: tx.hash,
      })
      .onConflictDoUpdate({
        target: dailySnapshots.dayId,
        set: {
          merkleRoot: root,
          participantCount: pendingSessions.length,
          txHash: tx.hash,
          createdAt: new Date(),
        },
      });

    return {
      success: true,
      settledCount: pendingSessions.length,
      merkleRoot: root,
      arweaveId: ipfsCid,
      txHash: tx.hash,
    };
  } catch (error) {
    console.error('[Daily Cron] Settle error:', error);
    return {
      success: false,
      settledCount: 0,
      error: String(error),
    };
  }
}

// ============================================================
// Task 2: Calculate and Distribute Rewards
// ============================================================
async function runRewards(): Promise<{
  success: boolean;
  dayId: string;
  participantCount: number;
  totalDistributed: string;
  skipped?: boolean;
  error?: string;
}> {
  console.log('[Daily Cron] Running rewards task...');

  const dayId = getYesterdayDayId();

  try {
    // Check if already settled
    const existingSettlement = await db
      .select()
      .from(dailyRewards)
      .where(eq(dailyRewards.dayId, dayId))
      .limit(1);

    if (existingSettlement.length > 0) {
      console.log(`[Daily Cron] Day ${dayId} already settled, skipping`);
      return {
        success: true,
        dayId,
        participantCount: 0,
        totalDistributed: '0',
        skipped: true,
      };
    }

    // Fetch all sessions for the day
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
      `[Daily Cron] Found ${daySessions.length} sessions for ${dayId}`
    );

    // Calculate rewards
    const drawingPeriods: DrawingPeriod[] = daySessions.map((s) => ({
      userId: s.userId,
      sessionId: s.id,
      startTime: s.startTime,
      duration: s.duration,
    }));

    const rewardResult = calculateDailyRewards(dayId, drawingPeriods);
    console.log(
      `[Daily Cron] Calculated: ${rewardResult.participantCount} participants`
    );

    // Get contract balance for auditing
    let contractBalanceBefore: string | null = null;
    try {
      const provider = createPolygonProvider();
      const time26Contract = new ethers.Contract(
        TIME26_ADDRESS,
        TIME26_ABI,
        provider
      );
      const balance = await time26Contract.balanceOf(PROOF_RECORDER_ADDRESS);
      contractBalanceBefore = balance.toString();
    } catch (err) {
      console.warn('[Daily Cron] Could not fetch contract balance:', err);
    }

    // Database transaction
    await db.transaction(async (tx) => {
      await tx.insert(dailyRewards).values({
        dayId,
        totalBudget: rewardResult.totalBudget,
        totalSeconds: rewardResult.totalSeconds,
        totalDistributed: rewardResult.totalDistributed,
        participantCount: rewardResult.participantCount,
        contractBalanceBefore,
        contractBalanceAfter: null,
      });

      for (const userReward of rewardResult.userRewards) {
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

        await tx
          .update(users)
          .set({
            time26Balance: sql`${users.time26Balance} + ${userReward.totalReward}::numeric`,
          })
          .where(eq(users.id, userReward.userId));
      }
    });

    return {
      success: true,
      dayId,
      participantCount: rewardResult.participantCount,
      totalDistributed: formatTime26(rewardResult.totalDistributed),
    };
  } catch (error) {
    console.error('[Daily Cron] Rewards error:', error);
    return {
      success: false,
      dayId,
      participantCount: 0,
      totalDistributed: '0',
      error: String(error),
    };
  }
}

// ============================================================
// Main Handler
// ============================================================
export async function GET(req: NextRequest) {
  console.log('[Daily Cron] Starting combined daily tasks...');

  // Security Check
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Run both tasks sequentially
  const settleResult = await runSettle();
  const rewardsResult = await runRewards();

  const success = settleResult.success && rewardsResult.success;

  return NextResponse.json({
    success,
    settle: settleResult,
    rewards: rewardsResult,
  });
}
