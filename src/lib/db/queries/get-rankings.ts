import { db } from '@/db';
import { sessions, users } from '@/db/schema';
import { desc, eq, inArray } from 'drizzle-orm';

export async function getRankings(limit = 10) {
  try {
    const settledStatus = ['MINTED', 'SETTLED'];

    // 1. Top Duration
    const topDuration = await db
      .select({
        id: sessions.id,
        duration: sessions.duration,
        userId: sessions.userId,
        userName: users.name,
        walletAddress: users.walletAddress,
        createdAt: sessions.createdAt,
        status: sessions.status,
        ipfsHash: sessions.ipfsHash,
        likes: sessions.likes,
        views: sessions.views,
        message: sessions.message,
      })
      .from(sessions)
      .leftJoin(users, eq(sessions.userId, users.id))
      .where(inArray(sessions.status, settledStatus))
      .orderBy(desc(sessions.duration))
      .limit(limit);

    // 2. Most Liked
    const mostLiked = await db
      .select({
        id: sessions.id,
        duration: sessions.duration,
        userId: sessions.userId,
        userName: users.name,
        walletAddress: users.walletAddress,
        createdAt: sessions.createdAt,
        status: sessions.status,
        ipfsHash: sessions.ipfsHash,
        likes: sessions.likes,
        views: sessions.views,
        message: sessions.message,
      })
      .from(sessions)
      .leftJoin(users, eq(sessions.userId, users.id))
      .where(inArray(sessions.status, settledStatus))
      .orderBy(desc(sessions.likes))
      .limit(limit);

    // 3. Most Viewed
    const mostViewed = await db
      .select({
        id: sessions.id,
        duration: sessions.duration,
        userId: sessions.userId,
        userName: users.name,
        walletAddress: users.walletAddress,
        createdAt: sessions.createdAt,
        status: sessions.status,
        ipfsHash: sessions.ipfsHash,
        likes: sessions.likes,
        views: sessions.views,
        message: sessions.message,
      })
      .from(sessions)
      .leftJoin(users, eq(sessions.userId, users.id))
      .where(inArray(sessions.status, settledStatus))
      .orderBy(desc(sessions.views))
      .limit(limit);

    return {
      topDuration,
      mostLiked,
      mostViewed,
    };
  } catch (error) {
    console.error('Error fetching rankings:', error);
    return {
      topDuration: [],
      mostLiked: [],
      mostViewed: [],
    };
  }
}
