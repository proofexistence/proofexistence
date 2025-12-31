import { db } from '@/db';
import {
  users,
  sessions,
  userBadges,
  badges,
  savedSessions,
} from '@/db/schema';
import { eq, or, desc, sql, inArray, and, ilike } from 'drizzle-orm';

export async function getProfile(identifier: string) {
  try {
    // 1. Find User
    // Identifier could be username or wallet address

    const user = await db.query.users.findFirst({
      where: or(
        ilike(users.username, identifier),
        eq(users.name, identifier),
        ilike(users.walletAddress, identifier),
        eq(users.clerkId, identifier)
      ),
    });

    if (!user) return null;

    // 2. Fetch Created Proofs (Sessions)
    const createdProofs = await db
      .select({
        id: sessions.id,
        createdAt: sessions.createdAt,
        status: sessions.status,
        ipfsHash: sessions.ipfsHash,
        message: sessions.message,
        views: sessions.views,
        likes: sessions.likes,
        title: sessions.title,
        previewUrl: sessions.previewUrl,
        // Join user data for card standard props, though we know the user
        userName: sql<string>`${user.name}`,
        walletAddress: sql<string>`${user.walletAddress}`,
      })
      .from(sessions)
      .where(
        and(
          eq(sessions.userId, user.id),
          inArray(sessions.status, ['MINTED', 'SETTLED', 'PENDING'])
        )
      )
      .orderBy(desc(sessions.createdAt));

    // 3. Fetch Saved Proofs
    // Need to join saved_sessions -> sessions -> users (owner of session)
    const saved = await db
      .select({
        id: sessions.id,
        createdAt: sessions.createdAt,
        status: sessions.status,
        ipfsHash: sessions.ipfsHash,
        message: sessions.message,
        views: sessions.views,
        likes: sessions.likes,
        title: sessions.title,
        previewUrl: sessions.previewUrl,
        userName: users.name,
        walletAddress: users.walletAddress,
      })
      .from(savedSessions)
      .leftJoin(sessions, eq(savedSessions.sessionId, sessions.id))
      .leftJoin(users, eq(sessions.userId, users.id)) // Owner of the saved session
      .where(eq(savedSessions.userId, user.id));

    // 4. Fetch Badges
    const earnedBadges = await db
      .select({
        id: badges.id,
        name: badges.name,
        description: badges.description,
        imageUrl: badges.imageUrl,
        awardedAt: userBadges.awardedAt,
      })
      .from(userBadges)
      .leftJoin(badges, eq(userBadges.badgeId, badges.id))
      .where(eq(userBadges.userId, user.id));

    return {
      user,
      createdProofs,
      savedProofs: saved, // savedSessions might have null sessions if deleted? ensure non-null
      badges: earnedBadges,
    };
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
}
