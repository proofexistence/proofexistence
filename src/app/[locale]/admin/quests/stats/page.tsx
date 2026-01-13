import { Metadata } from 'next';
import { StatsClient } from './stats-client';
import { db } from '@/db';
import { questRewards, userStreaks, userDailyQuests } from '@/db/schema';
import { sql, gte, count } from 'drizzle-orm';

export const metadata: Metadata = {
  title: 'Quest Statistics | Admin',
};

export default async function StatsPage() {
  const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  // Get total rewards distributed
  const [totalRewards] = await db
    .select({ total: sql<string>`COALESCE(SUM(amount::numeric), 0)` })
    .from(questRewards);

  // Get rewards by type
  const rewardsByType = await db
    .select({
      type: questRewards.rewardType,
      count: count(),
      total: sql<string>`COALESCE(SUM(amount::numeric), 0)`,
    })
    .from(questRewards)
    .groupBy(questRewards.rewardType);

  // Get active users (completed at least one task) in last 7 days
  const [activeUsers7d] = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${userDailyQuests.userId})` })
    .from(userDailyQuests)
    .where(gte(userDailyQuests.date, last7Days));

  // Get streak distribution
  const streakDistribution = await db
    .select({
      bucket: sql<string>`
        CASE
          WHEN ${userStreaks.currentStreak} = 0 THEN '0'
          WHEN ${userStreaks.currentStreak} BETWEEN 1 AND 3 THEN '1-3'
          WHEN ${userStreaks.currentStreak} BETWEEN 4 AND 7 THEN '4-7'
          WHEN ${userStreaks.currentStreak} BETWEEN 8 AND 14 THEN '8-14'
          WHEN ${userStreaks.currentStreak} BETWEEN 15 AND 30 THEN '15-30'
          ELSE '30+'
        END
      `,
      count: count(),
    })
    .from(userStreaks)
    .groupBy(sql`1`);

  // Get daily completion rates for last 7 days
  const dailyRates = await db
    .select({
      date: userDailyQuests.date,
      totalUsers: count(),
      createdCount: sql<number>`COUNT(*) FILTER (WHERE ${userDailyQuests.createCount} >= 1)`,
      likedCount: sql<number>`COUNT(*) FILTER (WHERE ${userDailyQuests.likeCount} >= 3)`,
      themeCount: sql<number>`COUNT(*) FILTER (WHERE ${userDailyQuests.themeCompleted})`,
    })
    .from(userDailyQuests)
    .where(gte(userDailyQuests.date, last7Days))
    .groupBy(userDailyQuests.date)
    .orderBy(userDailyQuests.date);

  return (
    <StatsClient
      totalRewards={totalRewards?.total || '0'}
      rewardsByType={rewardsByType}
      activeUsers7d={activeUsers7d?.count || 0}
      streakDistribution={streakDistribution}
      dailyRates={dailyRates}
    />
  );
}
