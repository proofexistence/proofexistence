import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { db } from '@/db';
import { questRewards, users } from '@/db/schema';
import { eq, sql, inArray } from 'drizzle-orm';

export async function POST() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin status
    const dbUser = await db.query.users.findFirst({
      where: eq(users.walletAddress, currentUser.walletAddress),
      columns: { isAdmin: true },
    });

    if (!dbUser?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all approved rewards grouped by user
    const approvedRewards = await db
      .select({
        userId: questRewards.userId,
        totalAmount: sql<string>`SUM(${questRewards.amount}::numeric)`,
        rewardIds: sql<string[]>`array_agg(${questRewards.id})`,
      })
      .from(questRewards)
      .where(eq(questRewards.status, 'APPROVED'))
      .groupBy(questRewards.userId);

    if (approvedRewards.length === 0) {
      return NextResponse.json({
        success: true,
        processedCount: 0,
        message: 'No approved rewards to process',
      });
    }

    let processedCount = 0;
    const now = new Date();

    // Process each user's rewards
    for (const userRewards of approvedRewards) {
      // Add to user's TIME26 balance
      await db
        .update(users)
        .set({
          time26Balance: sql`${users.time26Balance}::numeric + ${userRewards.totalAmount}::numeric`,
        })
        .where(eq(users.id, userRewards.userId));

      // Mark rewards as SENT
      await db
        .update(questRewards)
        .set({
          status: 'SENT',
          sentAt: now,
        })
        .where(inArray(questRewards.id, userRewards.rewardIds));

      processedCount += userRewards.rewardIds.length;
    }

    return NextResponse.json({
      success: true,
      processedCount,
      usersUpdated: approvedRewards.length,
    });
  } catch (error) {
    console.error('Process rewards error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
