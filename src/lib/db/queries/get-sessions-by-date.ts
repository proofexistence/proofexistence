import { db } from '@/db';
import { sessions, users } from '@/db/schema';
import { and, gte, lt, isNotNull, asc, sql } from 'drizzle-orm';

export interface SessionForDailyArt {
  id: string;
  trailData: unknown;
  color: string | null;
  duration: number;
  createdAt: Date;
  userName: string | null;
  title: string | null;
}

/**
 * Get all sessions for a specific date (UTC+0 00:00-23:59:59)
 */
export async function getSessionsByDate(
  date: Date
): Promise<SessionForDailyArt[]> {
  try {
    // Calculate UTC day boundaries
    const startOfDay = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    );
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const result = await db
      .select({
        id: sessions.id,
        trailData: sessions.trailData,
        color: sessions.color,
        duration: sessions.duration,
        createdAt: sessions.createdAt,
        userName: users.name,
        title: sessions.title,
      })
      .from(sessions)
      .leftJoin(users, sql`${sessions.userId} = ${users.id}`)
      .where(
        and(
          isNotNull(sessions.trailData),
          gte(sessions.createdAt, startOfDay),
          lt(sessions.createdAt, endOfDay)
        )
      )
      .orderBy(asc(sessions.createdAt));

    return result;
  } catch (error) {
    console.error('Error fetching sessions by date:', error);
    return [];
  }
}

/**
 * Get available dates that have sessions (for date picker)
 */
export async function getAvailableDates(): Promise<string[]> {
  try {
    const result = await db
      .selectDistinct({
        date: sql<string>`DATE(${sessions.createdAt})`,
      })
      .from(sessions)
      .where(isNotNull(sessions.trailData))
      .orderBy(sql`DATE(${sessions.createdAt}) DESC`)
      .limit(365); // Last year

    return result.map((r) => r.date);
  } catch (error) {
    console.error('Error fetching available dates:', error);
    return [];
  }
}
