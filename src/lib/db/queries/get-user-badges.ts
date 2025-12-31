import { db } from '@/db';
import { userBadges, badges } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function getUserBadges(userId: string) {
  try {
    const userBadgesList = await db
      .select({
        id: badges.id,
        name: badges.name,
        description: badges.description,
        imageUrl: badges.imageUrl,
        awardedAt: userBadges.awardedAt,
      })
      .from(userBadges)
      .leftJoin(badges, eq(userBadges.badgeId, badges.id))
      .where(eq(userBadges.userId, userId))
      .orderBy(desc(userBadges.awardedAt));

    return userBadgesList;
  } catch (error) {
    console.error('Error fetching user badges:', error);
    return [];
  }
}
