import { db } from '@/db';
import { sessions, users } from '@/db/schema';
import { desc, isNotNull, sql } from 'drizzle-orm';

export async function getActiveTrails(limit = 100) {
  try {
    // Determine the "Universe Start Time" or just relative?
    // We just need the raw data, visualization handles the relativity.

    const activeTrails = await db
      .select({
        id: sessions.id,
        trailData: sessions.trailData,
        color: sessions.color,
        createdAt: sessions.createdAt,
        startTime: sessions.startTime,
        duration: sessions.duration,
        userId: sessions.userId,
        userName: users.name,
        walletAddress: users.walletAddress,
        title: sessions.title,
        message: sessions.message,
      })
      .from(sessions)
      .leftJoin(users, sql`${sessions.userId} = ${users.id}`)
      .where(isNotNull(sessions.trailData))
      .orderBy(desc(sessions.createdAt))
      .limit(limit);

    return activeTrails;
  } catch (error) {
    console.error('Error fetching active trails:', error);
    return [];
  }
}
