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
  time26Transactions,
  questRewards,
  rewardsMerkleSnapshots,
  daisyMints,
} from '@/db/schema';
import { eq, and, gte, lte, gt, inArray, sql, between } from 'drizzle-orm';
import { generateParticipantsMerkleTree } from '@/lib/merkle/participants';
import { getDateMultiplier, getSpecialDay } from '@/lib/daisy/special-days';
import { GENESIS_AUCTION } from '@/lib/daisy/pricing';
import { renderDaisyVisualization } from '@/lib/daisy/render-daisy';
import { uploadToR2 } from '@/lib/r2';
import { generateMerkleTree } from '@/lib/merkle';
import {
  generateRewardsMerkleTree,
  getRewardsRoot,
  type UserRewardEntry,
} from '@/lib/merkle/rewards';
import { uploadToArweave } from '@/lib/arweave-upload';
import { ethers } from 'ethers';
import {
  PROOF_OF_EXISTENCE_ADDRESS,
  PROOF_OF_EXISTENCE_ABI,
  TIME26_ADDRESS,
  TIME26_ABI,
  PROOF_RECORDER_ADDRESS,
  PROOF_RECORDER_ABI,
  DAISY_GENESIS_ADDRESS,
  DAISY_GENESIS_ABI,
  DAISY_STANDARD_ADDRESS,
  DAISY_STANDARD_ABI,
} from '@/lib/contracts';
import { getQuarter } from '@/lib/daisy/special-days';
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
// Helper: Find Missing Days
// ============================================================

/**
 * Get all days that need rewards processing
 * Finds days that have sessions but no rewards record yet
 * Limited to MAX_DAYS_PER_RUN to avoid timeout
 */
async function getMissingDays(): Promise<string[]> {
  const yesterday = getYesterdayDayId();
  const MAX_DAYS_PER_RUN = 30;

  // Get all unique session dates (before yesterday)
  const sessionDates = await db
    .select({
      date: sql<string>`DATE(${sessions.startTime})`.as('date'),
    })
    .from(sessions)
    .where(sql`DATE(${sessions.startTime}) < ${yesterday}`)
    .groupBy(sql`DATE(${sessions.startTime})`)
    .orderBy(sql`DATE(${sessions.startTime})`);

  if (sessionDates.length === 0) {
    return [];
  }

  // Get all processed days
  const processedDays = await db
    .select({ dayId: dailyRewards.dayId })
    .from(dailyRewards);

  const processedSet = new Set(processedDays.map((d) => d.dayId));

  // Find days with sessions but no rewards record
  const missingDays = sessionDates
    .map((s) => s.date)
    .filter((date) => !processedSet.has(date))
    .slice(0, MAX_DAYS_PER_RUN);

  return missingDays;
}

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
  // console.log('[Daily Cron] Running settle task...');

  try {
    // Fetch Pending Sessions
    const pendingSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.status, 'PENDING'));

    if (pendingSessions.length === 0) {
      // console.log('[Daily Cron] No pending sessions to settle');
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

    // Upload Batch to ArDrive Turbo
    // console.log('[Daily Cron] Uploading to ArDrive Turbo...');
    const batchData = JSON.stringify(pendingSessions);
    const ipfsCid = await uploadToArweave(batchData, [
      { name: 'Content-Type', value: 'application/json' },
      { name: 'Batch-Size', value: pendingSessions.length.toString() },
      { name: 'Merkle-Root', value: root },
    ]);

    // Submit to Blockchain
    // console.log('[Daily Cron] Arweave ID:', ipfsCid);
    const provider = createAmoyProvider();
    // Use OPERATOR_PRIVATE_KEY for batch settlement, fallback to PRIVATE_KEY
    const privateKey =
      process.env.OPERATOR_PRIVATE_KEY || process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error(
        'OPERATOR_PRIVATE_KEY or PRIVATE_KEY environment variable is not set'
      );
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
    // console.log('[Daily Cron] TX hash:', tx.hash);

    await waitForTransaction(provider, tx.hash, 1, 120000);
    // console.log('[Daily Cron] TX confirmed in block:', receipt.blockNumber);

    // Update Database - mark sessions as SETTLED with the batch settlement txHash
    const sessionIds = pendingSessions.map((s) => s.id);
    await db
      .update(sessions)
      .set({ status: 'SETTLED', txHash: tx.hash })
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
async function runRewardsForDay(dayId: string): Promise<{
  success: boolean;
  dayId: string;
  participantCount: number;
  totalDistributed: string;
  skipped?: boolean;
  error?: string;
}> {
  // console.log(`[Daily Cron] Running rewards for ${dayId}...`);

  try {
    // Check if already settled
    const existingSettlement = await db
      .select()
      .from(dailyRewards)
      .where(eq(dailyRewards.dayId, dayId))
      .limit(1);

    if (existingSettlement.length > 0) {
      // console.log(`[Daily Cron] Day ${dayId} already settled, skipping`);
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

    // console.log(
    //   `[Daily Cron] Found ${daySessions.length} sessions for ${dayId}`
    // );

    // Calculate rewards
    const drawingPeriods: DrawingPeriod[] = daySessions.map((s) => ({
      userId: s.userId,
      sessionId: s.id,
      startTime: s.startTime,
      duration: s.duration,
    }));

    const rewardResult = calculateDailyRewards(dayId, drawingPeriods);
    // console.log(
    //   `[Daily Cron] Calculated: ${rewardResult.participantCount} participants`
    // );

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

    // Insert daily summary first (acts as lock - PK constraint prevents duplicates)
    await db.insert(dailyRewards).values({
      dayId,
      totalBudget: rewardResult.totalBudget,
      totalSeconds: rewardResult.totalSeconds,
      totalDistributed: rewardResult.totalDistributed,
      participantCount: rewardResult.participantCount,
      contractBalanceBefore,
      contractBalanceAfter: null,
    });

    // Insert per-user rewards and update balances
    // Note: neon-http doesn't support transactions, so we do individual inserts
    // The dailyRewards PK insert above prevents duplicate processing
    for (const userReward of rewardResult.userRewards) {
      // Get user's current balance for transaction logging
      const [currentUser] = await db
        .select({ time26Balance: users.time26Balance })
        .from(users)
        .where(eq(users.id, userReward.userId))
        .limit(1);

      const balanceBefore = BigInt(currentUser?.time26Balance || '0');
      const rewardAmount = BigInt(userReward.totalReward);
      const balanceAfter = balanceBefore + rewardAmount;

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

      // Log transaction
      await db.insert(time26Transactions).values({
        userId: userReward.userId,
        type: 'daily_reward',
        amount: userReward.totalReward,
        direction: 'credit',
        balanceBefore: balanceBefore.toString(),
        balanceAfter: balanceAfter.toString(),
        referenceId: dayId,
        referenceType: 'daily_reward',
        description: `Daily reward for ${dayId} (${userReward.totalSeconds}s drawing)`,
        metadata: {
          dayId,
          totalSeconds: userReward.totalSeconds,
          exclusiveSeconds: userReward.exclusiveSeconds,
          sharedSeconds: userReward.sharedSeconds,
          baseReward: userReward.baseReward,
          bonusReward: userReward.bonusReward,
        },
      });
    }

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
// Task 3: Burn Pending TIME26 and Update Rewards Merkle Root
// ============================================================
async function runBurnAndMerkle(): Promise<{
  success: boolean;
  totalBurned: string;
  merkleRoot?: string;
  userCount: number;
  txHash?: string;
  error?: string;
  skipped: boolean;
}> {
  // console.log('[Daily Cron] Running burn and merkle task...');

  try {
    // 1. Calculate total pending burn across all users
    const usersWithPendingBurn = await db
      .select({
        id: users.id,
        walletAddress: users.walletAddress,
        time26PendingBurn: users.time26PendingBurn,
      })
      .from(users)
      .where(gt(users.time26PendingBurn, '0'));

    // Calculate total to burn
    let totalPendingBurn = BigInt(0);
    for (const user of usersWithPendingBurn) {
      totalPendingBurn += BigInt(user.time26PendingBurn);
    }

    // console.log(
    //   `[Daily Cron] Found ${usersWithPendingBurn.length} users with pending burn, total: ${formatTime26(totalPendingBurn.toString())}`
    // );

    // 2. Burn pending TIME26 if any
    let burnTxHash: string | undefined;
    if (totalPendingBurn > BigInt(0)) {
      const provider = createPolygonProvider();
      const privateKey =
        process.env.OPERATOR_PRIVATE_KEY || process.env.PRIVATE_KEY;
      if (!privateKey) {
        throw new Error('OPERATOR_PRIVATE_KEY or PRIVATE_KEY not set');
      }
      const wallet = new ethers.Wallet(privateKey, provider);

      const proofRecorder = new ethers.Contract(
        PROOF_RECORDER_ADDRESS,
        PROOF_RECORDER_ABI,
        wallet
      );

      const today = new Date().toISOString().split('T')[0];
      const reason = `Daily burn ${today}: ${usersWithPendingBurn.length} users`;

      const nonce = await provider.getTransactionCount(
        wallet.address,
        'latest'
      );
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice ?? BigInt(0);
      const adjustedGasPrice = (gasPrice * BigInt(150)) / BigInt(100);

      const tx = await proofRecorder.burnForRewards(
        totalPendingBurn.toString(),
        reason,
        {
          nonce,
          gasPrice: adjustedGasPrice,
          gasLimit: 100000,
        }
      );
      burnTxHash = tx.hash;
      await waitForTransaction(provider, tx.hash, 1, 60000);

      // Reset pending burn for all users after successful burn and log transactions
      for (const user of usersWithPendingBurn) {
        await db
          .update(users)
          .set({ time26PendingBurn: '0' })
          .where(eq(users.id, user.id));

        // Log burn transaction (note: balance was already deducted when spent)
        // This records the on-chain confirmation of the burn
        await db.insert(time26Transactions).values({
          userId: user.id,
          type: 'burn',
          amount: user.time26PendingBurn,
          direction: 'debit',
          balanceBefore: '0', // Burn doesn't change balance (already deducted)
          balanceAfter: '0',
          referenceId: tx.hash,
          referenceType: 'burn_tx',
          description: `On-chain burn confirmed: ${formatTime26(user.time26PendingBurn)} TIME26`,
          metadata: {
            txHash: tx.hash,
            burnDate: today,
            totalBurnedInBatch: totalPendingBurn.toString(),
            usersInBatch: usersWithPendingBurn.length,
          },
        });
      }

      // console.log(`[Daily Cron] Burned ${formatTime26(totalPendingBurn.toString())} TIME26, tx: ${tx.hash}`);
    }

    // 3. Generate new Merkle tree based on time26Balance
    // With the new model, balance is already the claimable amount
    const usersWithBalance = await db
      .select({
        walletAddress: users.walletAddress,
        time26Balance: users.time26Balance,
      })
      .from(users)
      .where(gt(users.time26Balance, '0'));

    if (usersWithBalance.length === 0) {
      return {
        success: true,
        totalBurned: totalPendingBurn.toString(),
        userCount: 0,
        txHash: burnTxHash,
        skipped: false,
      };
    }

    // Create merkle entries with balance
    const entries: UserRewardEntry[] = usersWithBalance.map((u) => ({
      walletAddress: u.walletAddress.toLowerCase(),
      cumulativeAmount: u.time26Balance,
    }));

    const tree = generateRewardsMerkleTree(entries);
    const root = getRewardsRoot(tree);

    // 4. Update Merkle root on contract
    const provider = createPolygonProvider();
    const privateKey =
      process.env.OPERATOR_PRIVATE_KEY || process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('OPERATOR_PRIVATE_KEY or PRIVATE_KEY not set');
    }
    const wallet = new ethers.Wallet(privateKey, provider);

    const proofRecorder = new ethers.Contract(
      PROOF_RECORDER_ADDRESS,
      PROOF_RECORDER_ABI,
      wallet
    );

    const nonce = await provider.getTransactionCount(wallet.address, 'latest');
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice ?? BigInt(0);
    const adjustedGasPrice = (gasPrice * BigInt(150)) / BigInt(100);

    const tx = await proofRecorder.setRewardsMerkleRoot(root, {
      nonce,
      gasPrice: adjustedGasPrice,
      gasLimit: 100000,
    });
    await waitForTransaction(provider, tx.hash, 1, 60000);

    // Save the merkle snapshot so claim-proof API can use it
    // Use select + insert/update pattern for better compatibility
    const existingSnapshot = await db
      .select({ id: rewardsMerkleSnapshots.id })
      .from(rewardsMerkleSnapshots)
      .where(eq(rewardsMerkleSnapshots.merkleRoot, root))
      .limit(1);

    if (existingSnapshot.length > 0) {
      await db
        .update(rewardsMerkleSnapshots)
        .set({
          entries: entries,
          userCount: entries.length,
          txHash: tx.hash,
          createdAt: new Date(),
        })
        .where(eq(rewardsMerkleSnapshots.merkleRoot, root));
    } else {
      await db.insert(rewardsMerkleSnapshots).values({
        merkleRoot: root,
        entries: entries,
        userCount: entries.length,
        txHash: tx.hash,
      });
    }

    // console.log(`[Daily Cron] Updated rewards merkle root: ${root}, tx: ${tx.hash}`);

    return {
      success: true,
      totalBurned: totalPendingBurn.toString(),
      merkleRoot: root,
      userCount: usersWithBalance.length,
      txHash: tx.hash,
      skipped: false,
    };
  } catch (error) {
    console.error('[Daily Cron] Burn and merkle error:', error);
    return {
      success: false,
      totalBurned: '0',
      userCount: 0,
      error: String(error),
      skipped: false,
    };
  }
}

// ============================================================
// Task 4: Process Quest Rewards
// ============================================================
async function runQuestRewards(): Promise<{
  success: boolean;
  processedCount: number;
  usersUpdated: number;
  totalAmount: string;
  error?: string;
}> {
  // console.log('[Daily Cron] Running quest rewards task...');

  try {
    // Auto-approve all PENDING quest rewards and process them
    const pendingRewards = await db
      .select({
        userId: questRewards.userId,
        totalAmount: sql<string>`SUM(${questRewards.amount}::numeric)`,
        rewardIds: sql<string[]>`array_agg(${questRewards.id})`,
      })
      .from(questRewards)
      .where(eq(questRewards.status, 'PENDING'))
      .groupBy(questRewards.userId);

    if (pendingRewards.length === 0) {
      return {
        success: true,
        processedCount: 0,
        usersUpdated: 0,
        totalAmount: '0',
      };
    }

    let processedCount = 0;
    let totalAmount = BigInt(0);
    const now = new Date();

    for (const userRewards of pendingRewards) {
      const rewardAmount = BigInt(userRewards.totalAmount);
      totalAmount += rewardAmount;

      // Get current balance for transaction log
      const [currentUser] = await db
        .select({ time26Balance: users.time26Balance })
        .from(users)
        .where(eq(users.id, userRewards.userId))
        .limit(1);

      const balanceBefore = BigInt(currentUser?.time26Balance || '0');
      const balanceAfter = balanceBefore + rewardAmount;

      // Add to user's TIME26 balance
      await db
        .update(users)
        .set({
          time26Balance: sql`${users.time26Balance}::numeric + ${userRewards.totalAmount}::numeric`,
        })
        .where(eq(users.id, userRewards.userId));

      // Mark rewards as SENT (skip APPROVED state for auto-processing)
      await db
        .update(questRewards)
        .set({
          status: 'SENT',
          sentAt: now,
        })
        .where(inArray(questRewards.id, userRewards.rewardIds));

      // Log transaction
      await db.insert(time26Transactions).values({
        userId: userRewards.userId,
        type: 'quest_reward',
        amount: userRewards.totalAmount,
        direction: 'credit',
        balanceBefore: balanceBefore.toString(),
        balanceAfter: balanceAfter.toString(),
        referenceId: now.toISOString().split('T')[0],
        referenceType: 'quest_reward',
        description: `Quest rewards: ${userRewards.rewardIds.length} tasks completed`,
        metadata: {
          rewardIds: userRewards.rewardIds,
          rewardCount: userRewards.rewardIds.length,
        },
      });

      processedCount += userRewards.rewardIds.length;
    }

    return {
      success: true,
      processedCount,
      usersUpdated: pendingRewards.length,
      totalAmount: totalAmount.toString(),
    };
  } catch (error) {
    console.error('[Daily Cron] Quest rewards error:', error);
    return {
      success: false,
      processedCount: 0,
      usersUpdated: 0,
      totalAmount: '0',
      error: String(error),
    };
  }
}

// ============================================================
// Task 5: Settle Expired Genesis Auctions
// ============================================================
async function settleExpiredAuctions(): Promise<{
  success: boolean;
  settledCount: number;
  error?: string;
}> {
  try {
    console.log('[Daisy] Checking for expired auctions to settle...');

    const isTestnet = process.env.NEXT_PUBLIC_IS_TESTNET === 'true';
    const provider = isTestnet ? createAmoyProvider() : createPolygonProvider();
    const operatorKey = process.env.PRIVATE_KEY;

    if (!operatorKey) {
      console.log(
        '[Daisy] PRIVATE_KEY not configured, skipping auction settlement'
      );
      return { success: true, settledCount: 0 };
    }

    const signer = new ethers.Wallet(operatorKey, provider);
    const genesisContract = new ethers.Contract(
      DAISY_GENESIS_ADDRESS,
      DAISY_GENESIS_ABI,
      signer
    );

    // Find all active auctions that have ended but not settled
    const expiredAuctions = await db
      .select()
      .from(daisyMints)
      .where(
        and(
          eq(daisyMints.status, 'active'),
          eq(daisyMints.auctionSettled, false),
          lte(daisyMints.auctionEndTime, new Date())
        )
      );

    console.log(`[Daisy] Found ${expiredAuctions.length} expired auctions`);

    let settledCount = 0;
    for (const auction of expiredAuctions) {
      try {
        const dateNumber = parseInt(auction.date.replace(/-/g, ''));
        console.log(`[Daisy] Settling auction for ${auction.date}...`);

        // Check on-chain if already settled
        const auctionInfo = await genesisContract.getAuctionInfo(dateNumber);
        if (auctionInfo[4]) {
          // settled = true
          console.log(
            `[Daisy] Auction ${auction.date} already settled on-chain`
          );
          // Update database
          await db
            .update(daisyMints)
            .set({
              auctionSettled: true,
              status: 'completed',
              updatedAt: new Date(),
            })
            .where(eq(daisyMints.id, auction.id));
          settledCount++;
          continue;
        }

        // Settle on-chain
        const tx = await genesisContract.settleAuction(dateNumber);
        await tx.wait();
        console.log(`[Daisy] Settled auction ${auction.date}, tx: ${tx.hash}`);

        // Get winner info from event or contract
        const updatedInfo = await genesisContract.getAuctionInfo(dateNumber);
        const winner = updatedInfo[2]; // highestBidder
        const finalBid = updatedInfo[1]; // currentBid

        // Update database
        await db
          .update(daisyMints)
          .set({
            auctionSettled: true,
            auctionCurrentBid: ethers.formatEther(finalBid),
            auctionHighestBidder: winner,
            genesisMintedTo: winner,
            genesisTxHash: tx.hash,
            genesisMintedAt: new Date(),
            status: 'completed',
            updatedAt: new Date(),
          })
          .where(eq(daisyMints.id, auction.id));

        settledCount++;
      } catch (error) {
        console.error(
          `[Daisy] Failed to settle auction ${auction.date}:`,
          error
        );
        // Continue with other auctions
      }
    }

    console.log(`[Daisy] Settled ${settledCount} auctions`);
    return { success: true, settledCount };
  } catch (error) {
    console.error('[Daisy] Auction settlement error:', error);
    return { success: false, settledCount: 0, error: String(error) };
  }
}

// ============================================================
// Task 6: Generate Daily Daisy NFT
// ============================================================
async function generateDaisyNFT(
  yesterday: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[Daisy] Starting generation for', yesterday);

    // Check if already generated
    const [existing] = await db
      .select()
      .from(daisyMints)
      .where(eq(daisyMints.date, yesterday))
      .limit(1);

    if (existing) {
      console.log('[Daisy] Already generated for', yesterday);
      return { success: true };
    }

    // Get yesterday's sessions
    const startOfDay = new Date(yesterday + 'T00:00:00Z');
    const endOfDay = new Date(yesterday + 'T23:59:59.999Z');

    const sessionsData = await db
      .select({
        id: sessions.id,
        trailData: sessions.trailData,
        color: sessions.color,
        duration: sessions.duration,
        createdAt: sessions.createdAt,
        userName: users.name,
        walletAddress: users.walletAddress,
      })
      .from(sessions)
      .leftJoin(users, eq(sessions.userId, users.id))
      .where(
        and(
          sql`${sessions.trailData} IS NOT NULL`,
          between(sessions.createdAt, startOfDay, endOfDay)
        )
      );

    // Even with no sessions, we generate a background-only Daisy
    if (sessionsData.length === 0) {
      console.log(
        '[Daisy] No sessions for',
        yesterday,
        '- generating background-only Daisy'
      );
    }

    // Get unique participants (empty array if no sessions)
    const uniqueParticipants = [
      ...new Set(
        sessionsData
          .map((s) => s.walletAddress)
          .filter((addr): addr is string => addr !== null)
      ),
    ];

    // Generate Merkle tree for participants
    const { root: participantsMerkleRoot } =
      generateParticipantsMerkleTree(uniqueParticipants);

    // Get special day info
    const specialDay = getSpecialDay(yesterday);
    const { multiplier: dateMultiplier } = getDateMultiplier(yesterday);

    // Get theme name (simple hash-based selection)
    const themeIndex = hashString(yesterday) % 12;
    const themeNames = [
      'Murakami Pop',
      'Morandi',
      'Cool Ocean',
      'Warm Sunset',
      'Spring Garden',
      'Autumn Harvest',
      'Cotton Candy',
      'Nordic',
      'Tropical',
      'Lavender Dreams',
      'Vintage Rose',
      'Mint Fresh',
    ];
    const themeName = themeNames[themeIndex];

    // Prepare session data for rendering
    const daisySessions = sessionsData.map((s) => ({
      id: s.id,
      trailData: s.trailData as { x: number; y: number }[],
      color: s.color || '#FFFFFF',
      duration: s.duration,
      createdAt: s.createdAt?.toISOString() || new Date().toISOString(),
      userName: s.userName || undefined,
    }));

    // Generate BOTH editions
    console.log('[Daisy] Rendering Standard edition...');
    const { staticImage: standardImage } = await renderDaisyVisualization(
      daisySessions,
      yesterday,
      { edition: 'standard' }
    );

    console.log('[Daisy] Rendering Genesis edition...');
    const { staticImage: genesisImage } = await renderDaisyVisualization(
      daisySessions,
      yesterday,
      { edition: 'genesis' }
    );

    // Upload images to R2 (for preview)
    const standardPreviewKey = `daisy/${yesterday}/standard.png`;
    const genesisPreviewKey = `daisy/${yesterday}/genesis.png`;
    const standardPreviewUrl = await uploadToR2(
      standardImage,
      standardPreviewKey,
      'image/png'
    );
    const genesisPreviewUrl = await uploadToR2(
      genesisImage,
      genesisPreviewKey,
      'image/png'
    );

    // Upload images to Arweave (permanent storage for NFT)
    console.log('[Daisy] Uploading images to Arweave...');
    const standardImageTxId = await uploadToArweave(standardImage, [
      { name: 'Content-Type', value: 'image/png' },
      { name: 'Type', value: 'daisy-image' },
      { name: 'Edition', value: 'standard' },
      { name: 'Date', value: yesterday },
    ]);

    const genesisImageTxId = await uploadToArweave(genesisImage, [
      { name: 'Content-Type', value: 'image/png' },
      { name: 'Type', value: 'daisy-image' },
      { name: 'Edition', value: 'genesis' },
      { name: 'Date', value: yesterday },
    ]);

    // Create NFT metadata (OpenSea standard)
    const baseMetadata = {
      external_url: `https://proofofexistence.com/poe/daisy?date=${yesterday}`,
      attributes: [
        { trait_type: 'Date', value: yesterday },
        { trait_type: 'Theme', value: themeName },
        { trait_type: 'Participants', value: uniqueParticipants.length },
        { trait_type: 'Sessions', value: sessionsData.length },
        ...(specialDay
          ? [{ trait_type: 'Special Day', value: specialDay.name }]
          : []),
      ],
      properties: {
        date: yesterday,
        theme: themeName,
        participantCount: uniqueParticipants.length,
        sessionCount: sessionsData.length,
        participantsMerkleRoot,
      },
    };

    // Description varies based on participation
    const hasParticipants = uniqueParticipants.length > 0;
    const standardDescription = hasParticipants
      ? `A collective artwork created by ${uniqueParticipants.length} participants on ${yesterday}. This Standard Edition captures the community's creative energy in a vibrant daisy garden.`
      : `A serene daisy garden from ${yesterday}. This quiet day features only background blooms, awaiting future creators to add their trails.`;
    const genesisDescription = hasParticipants
      ? `The unique Genesis Edition of ${yesterday}'s collective artwork. Created by ${uniqueParticipants.length} participants, this 1/1 piece features a dark background with golden glowing strokes, symbolizing the rarity and prestige of this collector's item.`
      : `The unique Genesis Edition from ${yesterday}. A tranquil garden of golden-stroked daisies on a dark canvas, marking a day of peaceful silence before the next wave of creativity.`;

    // Standard Edition metadata
    const standardMetadata = {
      ...baseMetadata,
      name: `Daisy ${yesterday} - Standard Edition`,
      description: standardDescription,
      image: `https://arweave.net/${standardImageTxId}`,
      attributes: [
        ...baseMetadata.attributes,
        { trait_type: 'Edition', value: 'Standard' },
      ],
    };

    // Genesis Edition metadata (1/1)
    const genesisMetadata = {
      ...baseMetadata,
      name: `Daisy ${yesterday} - Genesis Edition`,
      description: genesisDescription,
      image: `https://arweave.net/${genesisImageTxId}`,
      attributes: [
        ...baseMetadata.attributes,
        { trait_type: 'Edition', value: 'Genesis' },
        { trait_type: 'Rarity', value: '1/1' },
      ],
    };

    // Upload metadata to Arweave
    console.log('[Daisy] Uploading metadata to Arweave...');
    const standardMetadataTxId = await uploadToArweave(
      JSON.stringify(standardMetadata),
      [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'Type', value: 'daisy-metadata' },
        { name: 'Edition', value: 'standard' },
        { name: 'Date', value: yesterday },
      ]
    );

    const genesisMetadataTxId = await uploadToArweave(
      JSON.stringify(genesisMetadata),
      [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'Type', value: 'daisy-metadata' },
        { name: 'Edition', value: 'genesis' },
        { name: 'Date', value: yesterday },
      ]
    );

    // Calculate auction end time (24 hours from now)
    const auctionEndTime = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Store in database with Arweave hashes
    await db.insert(daisyMints).values({
      date: yesterday,
      participantCount: uniqueParticipants.length,
      sessionCount: sessionsData.length,
      participantsMerkleRoot,
      isSpecialDay: !!specialDay,
      specialDayName: specialDay?.name || null,
      specialDayMultiplier: dateMultiplier.toString(),
      theme: themeName,
      dominantColor: '#FF69B4',
      previewUrl: standardPreviewUrl,
      // Standard Edition
      standardArweaveHash: standardMetadataTxId,
      // Genesis Edition
      genesisArweaveHash: genesisMetadataTxId,
      auctionStartPrice: GENESIS_AUCTION.START_PRICE.toString(),
      auctionEndTime,
      status: 'active',
    });

    console.log('[Daisy] Successfully generated for', yesterday, {
      participants: uniqueParticipants.length,
      sessions: sessionsData.length,
      standardArweave: standardMetadataTxId,
      genesisArweave: genesisMetadataTxId,
      standardPreview: standardPreviewUrl,
      genesisPreview: genesisPreviewUrl,
    });

    // ============================================
    // Set up on-chain configurations
    // ============================================
    console.log('[Daisy] Setting up on-chain configurations...');

    const isTestnet = process.env.NEXT_PUBLIC_IS_TESTNET === 'true';
    const provider = isTestnet ? createAmoyProvider() : createPolygonProvider();
    const operatorKey = process.env.PRIVATE_KEY;

    if (!operatorKey) {
      console.error(
        '[Daisy] PRIVATE_KEY not configured, skipping on-chain setup'
      );
      return { success: true };
    }

    const signer = new ethers.Wallet(operatorKey, provider);
    const dateNumber = parseInt(yesterday.replace(/-/g, '')); // YYYYMMDD as number

    // 1. Set up Standard contract daily config
    try {
      console.log('[Daisy] Setting Standard daily config...');
      const standardContract = new ethers.Contract(
        DAISY_STANDARD_ADDRESS,
        DAISY_STANDARD_ABI,
        signer
      );

      const quarter = getQuarter(yesterday);
      const dateMultiplierBps = Math.round(dateMultiplier * 10000); // Convert to basis points

      const standardTx = await standardContract.setDailyConfig(
        dateNumber,
        `https://arweave.net/${standardMetadataTxId}`,
        participantsMerkleRoot,
        uniqueParticipants.length,
        quarter,
        dateMultiplierBps,
        0, // startTime (Phase 1: no limit)
        0 // endTime (Phase 1: no limit)
      );
      await standardTx.wait();
      console.log('[Daisy] Standard config set, tx:', standardTx.hash);
    } catch (error) {
      console.error('[Daisy] Failed to set Standard config:', error);
      // Continue - don't fail the whole process
    }

    // 2. Create Genesis auction
    try {
      console.log('[Daisy] Creating Genesis auction...');
      const genesisContract = new ethers.Contract(
        DAISY_GENESIS_ADDRESS,
        DAISY_GENESIS_ABI,
        signer
      );

      const startPriceWei = ethers.parseEther(
        GENESIS_AUCTION.START_PRICE.toString()
      );

      const genesisTx = await genesisContract.createAuction(
        dateNumber,
        startPriceWei,
        `https://arweave.net/${genesisMetadataTxId}`,
        uniqueParticipants.length,
        sessionsData.length
      );
      await genesisTx.wait();
      console.log('[Daisy] Genesis auction created, tx:', genesisTx.hash);
    } catch (error) {
      console.error('[Daisy] Failed to create Genesis auction:', error);
      // Continue - don't fail the whole process
    }

    console.log('[Daisy] On-chain setup complete!');

    return { success: true };
  } catch (error) {
    console.error('[Daisy] Generation error:', error);
    return { success: false, error: String(error) };
  }
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// ============================================================
// Main Handler
// ============================================================
export async function GET(req: NextRequest) {
  // console.log('[Daily Cron] Starting combined daily tasks...');

  // Security Check - Allow CRON_SECRET or Admin users
  const authHeader = req.headers.get('authorization');
  const isCronAuth = authHeader === `Bearer ${process.env.CRON_SECRET}`;

  let isAdminAuth = false;
  if (!isCronAuth) {
    // Check if request is from an admin user
    const walletAddress = req.headers.get('x-wallet-address');
    if (walletAddress) {
      const adminUser = await db
        .select({ isAdmin: users.isAdmin })
        .from(users)
        .where(eq(users.walletAddress, walletAddress))
        .limit(1);
      isAdminAuth = adminUser[0]?.isAdmin === true;
    }
  }

  if (!isCronAuth && !isAdminAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Task 1: Settle pending sessions
  const settleResult = await runSettle();

  // Task 2: Process rewards for all missing days (in chronological order)
  const missingDays = await getMissingDays();
  const rewardsResults: Array<{
    success: boolean;
    dayId: string;
    participantCount: number;
    totalDistributed: string;
    skipped?: boolean;
    error?: string;
  }> = [];

  for (const dayId of missingDays) {
    const result = await runRewardsForDay(dayId);
    rewardsResults.push(result);
    // Stop if a day fails (to maintain order integrity)
    if (!result.success) {
      console.error(
        `[Daily Cron] Failed to process rewards for ${dayId}, stopping`
      );
      break;
    }
  }

  // Task 3: Process quest rewards
  const questRewardsResult = await runQuestRewards();

  // Task 4: Burn and update merkle root (only if all rewards succeeded)
  const allRewardsSucceeded = rewardsResults.every(
    (r) => r.success || r.skipped
  );
  let burnMerkleResult = {
    success: true,
    totalBurned: '0',
    userCount: 0,
    skipped: true,
  };

  if (allRewardsSucceeded && questRewardsResult.success) {
    burnMerkleResult = await runBurnAndMerkle();
  }

  // Task 5: Settle expired Genesis auctions
  const auctionSettleResult = await settleExpiredAuctions();
  if (!auctionSettleResult.success) {
    console.error(
      '[Cron] Auction settlement failed:',
      auctionSettleResult.error
    );
  }

  // Task 6: Generate Daisy NFT for yesterday
  const yesterday = getYesterdayDayId();
  const daisyResult = await generateDaisyNFT(yesterday);
  if (!daisyResult.success) {
    console.error('[Cron] Daisy generation failed:', daisyResult.error);
    // Continue - don't fail the whole cron job
  }

  const success =
    settleResult.success &&
    allRewardsSucceeded &&
    questRewardsResult.success &&
    burnMerkleResult.success &&
    auctionSettleResult.success &&
    daisyResult.success;

  return NextResponse.json({
    success,
    settle: settleResult,
    auctionSettle: auctionSettleResult,
    daisy: daisyResult,
    rewards: {
      processedDays: missingDays,
      results: rewardsResults,
    },
    questRewards: questRewardsResult,
    burnMerkle: burnMerkleResult,
  });
}
