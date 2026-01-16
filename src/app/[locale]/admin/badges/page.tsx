import { Metadata } from 'next';
import { BadgeManagementClient } from './badge-management-client';
import { db } from '@/db';
import { userBadges, badges, users, sessions } from '@/db/schema';
import { eq, sql, inArray, desc } from 'drizzle-orm';

export const metadata: Metadata = {
  title: 'Badge Management | Admin',
};

export default async function BadgesPage() {
  // Get all badges with award counts
  const allBadges = await db
    .select({
      id: badges.id,
      name: badges.name,
      description: badges.description,
      imageUrl: badges.imageUrl,
      awardCount: sql<number>`COUNT(DISTINCT ${userBadges.userId})`,
    })
    .from(badges)
    .leftJoin(userBadges, eq(badges.id, userBadges.badgeId))
    .groupBy(badges.id, badges.name, badges.description, badges.imageUrl);

  // Get Early Adopter eligibility stats
  const earlyAdopterStats = await db.execute<{
    totalEligible: number;
    currentlyAwarded: number;
  }>(sql`
    WITH ranked_users AS (
      SELECT
        u.id,
        MIN(s.created_at) as first_proof_at,
        ROW_NUMBER() OVER (ORDER BY MIN(s.created_at) ASC) as rank
      FROM users u
      INNER JOIN sessions s ON s.user_id = u.id
      WHERE s.status IN ('MINTED', 'SETTLED', 'PENDING')
      GROUP BY u.id
    ),
    eligible_users AS (
      SELECT id, first_proof_at, rank
      FROM ranked_users
      WHERE rank <= 100
    ),
    awarded AS (
      SELECT COUNT(*) as count
      FROM user_badges
      WHERE badge_id = 'early-adopter-top-100'
    )
    SELECT
      (SELECT COUNT(*) FROM eligible_users) as "totalEligible",
      (SELECT count FROM awarded) as "currentlyAwarded"
  `);

  const earlyAdopterInfo = earlyAdopterStats.rows[0] || {
    totalEligible: 0,
    currentlyAwarded: 0,
  };

  // Get recent badge awards
  const recentAwards = await db
    .select({
      badgeId: userBadges.badgeId,
      badgeName: badges.name,
      userName: users.name,
      walletAddress: users.walletAddress,
      awardedAt: userBadges.awardedAt,
    })
    .from(userBadges)
    .leftJoin(badges, eq(userBadges.badgeId, badges.id))
    .leftJoin(users, eq(userBadges.userId, users.id))
    .orderBy(desc(userBadges.awardedAt))
    .limit(50);

  return (
    <BadgeManagementClient
      badges={allBadges}
      earlyAdopterStats={earlyAdopterInfo}
      recentAwards={recentAwards}
    />
  );
}
