import { db } from '@/db';
import { sessions, users } from '@/db/schema';
import { asc, isNotNull, sql } from 'drizzle-orm';

export async function getAllTrailsForLab() {
  try {
    // Fetch all sessions with trail data, sorted by creation date (oldest first)
    const allTrails = await db
      .select({
        id: sessions.id,
        trailData: sessions.trailData,
        color: sessions.color,
        createdAt: sessions.createdAt,
        duration: sessions.duration,
        userName: users.name,
        title: sessions.title,
      })
      .from(sessions)
      .leftJoin(users, sql`${sessions.userId} = ${users.id}`)
      .where(isNotNull(sessions.trailData))
      .orderBy(asc(sessions.createdAt));

    return allTrails;
  } catch (error) {
    console.error('Error fetching trails for lab:', error);
    return [];
  }
}
