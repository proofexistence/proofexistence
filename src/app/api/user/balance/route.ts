/**
 * User TIME26 Balance API
 *
 * GET - Returns the user's off-chain TIME26 balance and reward history
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { db } from '@/db';
import { users, userDailyRewards } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { formatTime26 } from '@/lib/rewards/calculate';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with balance
    const [dbUser] = await db
      .select({
        id: users.id,
        time26Balance: users.time26Balance,
        walletAddress: users.walletAddress,
      })
      .from(users)
      .where(eq(users.walletAddress, user.walletAddress))
      .limit(1);

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get recent reward history (last 30 days)
    const recentRewards = await db
      .select({
        dayId: userDailyRewards.dayId,
        totalSeconds: userDailyRewards.totalSeconds,
        exclusiveSeconds: userDailyRewards.exclusiveSeconds,
        sharedSeconds: userDailyRewards.sharedSeconds,
        totalReward: userDailyRewards.totalReward,
        createdAt: userDailyRewards.createdAt,
      })
      .from(userDailyRewards)
      .where(eq(userDailyRewards.userId, dbUser.id))
      .orderBy(desc(userDailyRewards.dayId))
      .limit(30);

    // Calculate totals
    const totalEarned = recentRewards.reduce((sum, r) => {
      return sum + BigInt(r.totalReward);
    }, BigInt(0));

    const totalSeconds = recentRewards.reduce(
      (sum, r) => sum + r.totalSeconds,
      0
    );

    return NextResponse.json({
      balance: {
        raw: dbUser.time26Balance, // Raw decimal value (wei)
        formatted: formatTime26(dbUser.time26Balance), // Human-readable
      },
      walletAddress: dbUser.walletAddress,
      stats: {
        totalEarned: formatTime26(totalEarned.toString()),
        totalDrawingSeconds: totalSeconds,
        daysActive: recentRewards.length,
      },
      recentRewards: recentRewards.map((r) => ({
        date: r.dayId,
        drawingSeconds: r.totalSeconds,
        exclusiveSeconds: r.exclusiveSeconds,
        sharedSeconds: r.sharedSeconds,
        earned: formatTime26(r.totalReward),
      })),
    });
  } catch (error) {
    console.error('[Balance API] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
