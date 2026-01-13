import { Metadata } from 'next';
import { RewardsManagementClient } from './rewards-management-client';
import { db } from '@/db';
import { questRewards, users } from '@/db/schema';
import { eq, desc, sql, inArray } from 'drizzle-orm';

export const metadata: Metadata = {
  title: 'Reward Management | Admin',
};

export default async function RewardsPage() {
  // Get pending rewards with user info
  const pendingRewards = await db
    .select({
      id: questRewards.id,
      userId: questRewards.userId,
      date: questRewards.date,
      rewardType: questRewards.rewardType,
      amount: questRewards.amount,
      status: questRewards.status,
      milestoneDay: questRewards.milestoneDay,
      createdAt: questRewards.createdAt,
      userName: users.name,
      walletAddress: users.walletAddress,
    })
    .from(questRewards)
    .leftJoin(users, eq(questRewards.userId, users.id))
    .where(inArray(questRewards.status, ['PENDING', 'APPROVED']))
    .orderBy(desc(questRewards.createdAt))
    .limit(200);

  // Get summary stats
  const [stats] = await db
    .select({
      pendingCount: sql<number>`COUNT(*) FILTER (WHERE ${questRewards.status} = 'PENDING')`,
      approvedCount: sql<number>`COUNT(*) FILTER (WHERE ${questRewards.status} = 'APPROVED')`,
      pendingAmount: sql<string>`COALESCE(SUM(${questRewards.amount}::numeric) FILTER (WHERE ${questRewards.status} = 'PENDING'), 0)`,
      approvedAmount: sql<string>`COALESCE(SUM(${questRewards.amount}::numeric) FILTER (WHERE ${questRewards.status} = 'APPROVED'), 0)`,
    })
    .from(questRewards);

  return (
    <RewardsManagementClient
      rewards={pendingRewards}
      stats={{
        pendingCount: stats?.pendingCount || 0,
        approvedCount: stats?.approvedCount || 0,
        pendingAmount: stats?.pendingAmount || '0',
        approvedAmount: stats?.approvedAmount || '0',
      }}
    />
  );
}
