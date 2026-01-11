/**
 * Admin Rewards Status API
 *
 * Returns comprehensive rewards status including:
 * - Contract TIME26 balance
 * - Total burned
 * - Total distributed (in DB)
 * - Total claimed (on-chain)
 * - Per-user breakdown
 *
 * Protected by ADMIN_WALLETS environment variable
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, dailyRewards, userDailyRewards } from '@/db/schema';
import { gt, desc, sql, eq } from 'drizzle-orm';
import { ethers } from 'ethers';
import { PROOF_RECORDER_ADDRESS, TIME26_ADDRESS } from '@/lib/contracts';
import { createPolygonProvider } from '@/lib/provider';

export const dynamic = 'force-dynamic';

import { verifyWeb3AuthToken } from '@/lib/web3auth/verify';

// Get admin wallets from env (comma-separated)
function getAdminWallets(): string[] {
  const admins = process.env.ADMIN_WALLETS || '';
  return admins
    .split(',')
    .map((addr) => addr.trim().toLowerCase())
    .filter((addr) => addr.length > 0);
}

// Check via Env Var (Fallback/Bootstrap)
function isEnvAdmin(walletAddress: string): boolean {
  const admins = getAdminWallets();
  return admins.includes(walletAddress.toLowerCase());
}

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate User (Verify Signature)
    const authHeader = req.headers.get('authorization');
    let walletAddress: string | null = null;
    let authMethod = 'none';

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const verified = await verifyWeb3AuthToken(token);
      if (verified) {
        walletAddress = verified.walletAddress;
        authMethod = 'token';
      }
    }

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Missing or invalid token' },
        { status: 401 }
      );
    }

    // 2. Authorize (Check Admin Status)
    let isAdmin = false;

    // A. Check Database (Primary)
    const dbUser = await db.query.users.findFirst({
      where: eq(users.walletAddress, walletAddress),
      columns: {
        isAdmin: true,
      },
    });

    if (dbUser?.isAdmin) {
      isAdmin = true;
    }

    // B. Check Env Var (Fallback for bootstrapping)
    if (!isAdmin && isEnvAdmin(walletAddress)) {
      isAdmin = true;
    }

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Not an admin' },
        { status: 403 }
      );
    }

    // ... Proceed with API logic
    const provider = createPolygonProvider();

    // ============================================================
    // 1. Contract Balances
    // ============================================================
    const time26Contract = new ethers.Contract(
      TIME26_ADDRESS,
      [
        'function balanceOf(address) view returns (uint256)',
        'function totalSupply() view returns (uint256)',
      ],
      provider
    );

    const proofRecorder = new ethers.Contract(
      PROOF_RECORDER_ADDRESS,
      [
        'function totalClaimed(address) view returns (uint256)',
        'function rewardsMerkleRoot() view returns (bytes32)',
        'event RewardsBurned(uint256 amount, string reason)',
      ],
      provider
    );

    const [contractBalance, totalSupply, merkleRoot] = await Promise.all([
      time26Contract.balanceOf(PROOF_RECORDER_ADDRESS),
      time26Contract.totalSupply(),
      proofRecorder.rewardsMerkleRoot(),
    ]);

    // ============================================================
    // 1b. Query Total Burned from blockchain events
    // ============================================================
    let totalBurned = BigInt(0);
    try {
      const burnFilter = proofRecorder.filters.RewardsBurned();
      const burnEvents = await proofRecorder.queryFilter(
        burnFilter,
        0,
        'latest'
      );
      for (const event of burnEvents) {
        const args = (event as ethers.EventLog).args;
        if (args && args[0]) {
          totalBurned += BigInt(args[0].toString());
        }
      }
    } catch (err) {
      console.warn('[Admin] Could not fetch burn events:', err);
    }

    // Get operator wallet balance
    let operatorBalance = '0';
    let operatorAddress = '';
    const operatorPrivateKey =
      process.env.OPERATOR_PRIVATE_KEY || process.env.PRIVATE_KEY;
    if (operatorPrivateKey) {
      const operatorWallet = new ethers.Wallet(operatorPrivateKey);
      operatorAddress = operatorWallet.address;
      const balance = await provider.getBalance(operatorAddress);
      operatorBalance = balance.toString();
    }

    // Get ArDrive Turbo balance (Credits in AR equivalent)
    let arweaveBalance = '0';
    try {
      const { getArweaveBalance } = await import('@/lib/arweave-upload');
      arweaveBalance = await getArweaveBalance();
    } catch {
      // Turbo balance fetch failed
    }

    // ============================================================
    // 2. Database User Balances
    // ============================================================
    const usersWithBalance = await db
      .select({
        id: users.id,
        walletAddress: users.walletAddress,
        username: users.username,
        time26Balance: users.time26Balance,
        time26PendingBurn: users.time26PendingBurn,
      })
      .from(users)
      .where(gt(users.time26Balance, '0'))
      .orderBy(desc(sql`${users.time26Balance}::numeric`));

    // Get on-chain claimed amounts for each user
    const userDetails = await Promise.all(
      usersWithBalance.map(async (u) => {
        const claimed = await proofRecorder.totalClaimed(u.walletAddress);
        const dbBalance = BigInt(u.time26Balance || '0');
        const pendingBurn = u.time26PendingBurn || '0';
        const claimedBigInt = BigInt(claimed.toString());
        const claimable =
          dbBalance > claimedBigInt ? dbBalance - claimedBigInt : BigInt(0);

        return {
          id: u.id,
          walletAddress: u.walletAddress,
          username: u.username,
          dbBalance: u.time26Balance || '0',
          dbBalanceFormatted: ethers.formatEther(dbBalance),
          pendingBurn: pendingBurn,
          pendingBurnFormatted: ethers.formatEther(pendingBurn),
          claimed: claimed.toString(),
          claimedFormatted: ethers.formatEther(claimed),
          claimable: claimable.toString(),
          claimableFormatted: ethers.formatEther(claimable),
        };
      })
    );

    // Calculate totals
    let totalDbBalance = BigInt(0);
    let totalPendingBurn = BigInt(0);
    let totalOnChainClaimed = BigInt(0);

    for (const u of userDetails) {
      totalDbBalance += BigInt(u.dbBalance || '0');
      totalPendingBurn += BigInt(u.pendingBurn || '0');
      totalOnChainClaimed += BigInt(u.claimed || '0');
    }

    const totalClaimable = totalDbBalance - totalOnChainClaimed;

    // ============================================================
    // 3. Daily Rewards History
    // ============================================================
    const dailyRewardsData = await db
      .select({
        dayId: dailyRewards.dayId,
        totalBudget: dailyRewards.totalBudget,
        totalSeconds: dailyRewards.totalSeconds,
        totalDistributed: dailyRewards.totalDistributed,
        participantCount: dailyRewards.participantCount,
        settledAt: dailyRewards.settledAt,
      })
      .from(dailyRewards)
      .orderBy(desc(dailyRewards.dayId))
      .limit(30);

    // Calculate total distributed
    let totalDistributed = BigInt(0);
    for (const d of dailyRewardsData) {
      totalDistributed += BigInt(d.totalDistributed || '0');
    }

    const dailyRewardsFormatted = dailyRewardsData.map((d) => ({
      dayId: d.dayId,
      totalBudget: d.totalBudget || '0',
      totalBudgetFormatted: ethers.formatEther(d.totalBudget || '0'),
      totalSeconds: d.totalSeconds || 0,
      totalDistributed: d.totalDistributed || '0',
      totalDistributedFormatted: ethers.formatEther(d.totalDistributed || '0'),
      participantCount: d.participantCount || 0,
      settledAt: d.settledAt?.toISOString(),
    }));

    // ============================================================
    // 4. Recent Per-User Rewards
    // ============================================================
    const recentUserRewards = await db
      .select({
        dayId: userDailyRewards.dayId,
        userId: userDailyRewards.userId,
        totalSeconds: userDailyRewards.totalSeconds,
        exclusiveSeconds: userDailyRewards.exclusiveSeconds,
        sharedSeconds: userDailyRewards.sharedSeconds,
        baseReward: userDailyRewards.baseReward,
        bonusReward: userDailyRewards.bonusReward,
        totalReward: userDailyRewards.totalReward,
        walletAddress: users.walletAddress,
        username: users.username,
      })
      .from(userDailyRewards)
      .innerJoin(users, eq(users.id, userDailyRewards.userId))
      .orderBy(desc(userDailyRewards.dayId))
      .limit(50);

    const recentUserRewardsFormatted = recentUserRewards.map((r) => ({
      dayId: r.dayId,
      walletAddress: r.walletAddress,
      username: r.username,
      totalSeconds: r.totalSeconds || 0,
      exclusiveSeconds: r.exclusiveSeconds || 0,
      sharedSeconds: r.sharedSeconds || 0,
      baseReward: r.baseReward || '0',
      baseRewardFormatted: ethers.formatEther(r.baseReward || '0'),
      bonusReward: r.bonusReward || '0',
      bonusRewardFormatted: ethers.formatEther(r.bonusReward || '0'),
      totalReward: r.totalReward || '0',
      totalRewardFormatted: ethers.formatEther(r.totalReward || '0'),
    }));

    // ============================================================
    // 5. Summary Calculations
    // ============================================================
    const contractBalanceBigInt = BigInt(contractBalance.toString());

    // Initial deposit: 365 * 24 * 60 * 60 = 31,536,000 TIME26
    const initialDeposit = BigInt('31536000') * BigInt(10 ** 18);

    // Verification: Initial = Contract Balance + Burned + Claimed
    const verificationSum =
      contractBalanceBigInt + totalBurned + totalOnChainClaimed;
    const verificationDiff = initialDeposit - verificationSum;
    const isVerified =
      verificationDiff >= BigInt(0) && verificationDiff < BigInt(10 ** 18); // Allow < 1 token diff

    // Surplus = Contract Balance - Still Claimable
    // This is how much "extra" is available beyond what users can claim
    const surplus = contractBalanceBigInt - totalClaimable;
    const hasSufficientFunds = surplus >= BigInt(0);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      network:
        process.env.NEXT_PUBLIC_IS_TESTNET === 'true'
          ? 'Amoy Testnet'
          : 'Polygon Mainnet',
      contracts: {
        proofRecorder: PROOF_RECORDER_ADDRESS,
        time26: TIME26_ADDRESS,
        merkleRoot,
      },
      operator: {
        address: operatorAddress,
        balance: operatorBalance,
        balanceFormatted: ethers.formatEther(operatorBalance),
        hasEnoughGas: BigInt(operatorBalance) >= ethers.parseEther('0.1'),
      },
      arweave: {
        balance: arweaveBalance,
        balanceFormatted: arweaveBalance, // Already formatted as AR string
        network: 'ArDrive Turbo',
        hasEnoughBalance: parseFloat(arweaveBalance) >= 0.1, // Threshold 0.1 AR
      },
      contractBalance: {
        raw: contractBalance.toString(),
        formatted: ethers.formatEther(contractBalance),
      },
      totalSupply: {
        raw: totalSupply.toString(),
        formatted: ethers.formatEther(totalSupply),
      },
      summary: {
        initialDeposit: {
          raw: initialDeposit.toString(),
          formatted: ethers.formatEther(initialDeposit),
          description: 'Initial TIME26 deposited (31,536,000)',
        },
        totalBurned: {
          raw: totalBurned.toString(),
          formatted: ethers.formatEther(totalBurned),
          description: 'Total burned from contract (from events)',
        },
        totalOnChainClaimed: {
          raw: totalOnChainClaimed.toString(),
          formatted: ethers.formatEther(totalOnChainClaimed),
          description: 'Total claimed on-chain by users',
        },
        totalDbBalance: {
          raw: totalDbBalance.toString(),
          formatted: ethers.formatEther(totalDbBalance),
          description: 'Total rewards recorded in database',
        },
        totalClaimable: {
          raw: totalClaimable.toString(),
          formatted: ethers.formatEther(totalClaimable),
          description: 'Still claimable (DB Balance - Claimed)',
        },
        totalPendingBurn: {
          raw: totalPendingBurn.toString(),
          formatted: ethers.formatEther(totalPendingBurn),
          description: 'Pending burn in next cron',
        },
        totalDistributed: {
          raw: totalDistributed.toString(),
          formatted: ethers.formatEther(totalDistributed),
          description: 'Total distributed (last 30 days)',
        },
        surplus: {
          raw: surplus.toString(),
          formatted: ethers.formatEther(surplus),
          description: 'Contract Balance - Claimable (positive = healthy)',
        },
        hasSufficientFunds,
        verification: {
          formula: 'Initial Deposit = Contract Balance + Burned + Claimed',
          initialDeposit: ethers.formatEther(initialDeposit),
          sum: ethers.formatEther(verificationSum),
          difference: ethers.formatEther(verificationDiff),
          isValid: isVerified,
        },
      },
      users: userDetails,
      dailyRewards: dailyRewardsFormatted,
      recentUserRewards: recentUserRewardsFormatted,
    });
  } catch (error) {
    console.error('[Admin Rewards Status] Error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch rewards status', details: errorMessage },
      { status: 500 }
    );
  }
}
