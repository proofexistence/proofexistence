import { db } from '@/db';
import { userBadges, badges } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Award a badge to a user
 * @param userId - User ID to award the badge to
 * @param badgeId - Badge ID to award
 * @returns true if awarded, false if already had the badge
 */
export async function awardBadge(
  userId: string,
  badgeId: string
): Promise<boolean> {
  try {
    // Check if user already has this badge
    const existing = await db.query.userBadges.findFirst({
      where: and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badgeId)),
    });

    if (existing) {
      return false; // Already has badge
    }

    // Award the badge
    await db.insert(userBadges).values({
      userId,
      badgeId,
      awardedAt: new Date(),
    });

    return true;
  } catch (error) {
    console.error(`Error awarding badge ${badgeId} to user ${userId}:`, error);
    throw error;
  }
}

/**
 * Check if a user has a specific badge
 */
export async function hasBadge(
  userId: string,
  badgeId: string
): Promise<boolean> {
  const existing = await db.query.userBadges.findFirst({
    where: and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badgeId)),
  });

  return !!existing;
}

/**
 * Get all badges for a user
 */
export async function getUserBadges(userId: string) {
  return await db
    .select({
      id: badges.id,
      name: badges.name,
      description: badges.description,
      imageUrl: badges.imageUrl,
      awardedAt: userBadges.awardedAt,
    })
    .from(userBadges)
    .leftJoin(badges, eq(userBadges.badgeId, badges.id))
    .where(eq(userBadges.userId, userId));
}
