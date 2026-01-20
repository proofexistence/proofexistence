import { db } from '@/db';
import { sessions, users } from '@/db/schema';
import { and, asc, eq, gte, isNotNull, lte, sql } from 'drizzle-orm';

export interface ColTrailOptions {
  startDate: Date;
  endDate: Date;
  limit?: number;
}

export async function getTrailsForCol(options: ColTrailOptions) {
  const { startDate, endDate, limit = 1000 } = options;

  try {
    const trails = await db
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
      .where(
        and(
          isNotNull(sessions.trailData),
          gte(sessions.createdAt, startDate),
          lte(sessions.createdAt, endDate),
          eq(sessions.hidden, 0)
        )
      )
      .orderBy(asc(sessions.createdAt))
      .limit(limit);

    return trails;
  } catch (error) {
    console.error('Error fetching trails for col:', error);
    return [];
  }
}

// Helper to calculate start date based on time range
export function calculateStartDate(
  endDate: Date,
  range: string
): Date {
  const end = new Date(endDate);

  switch (range) {
    case '1h':
      return new Date(end.getTime() - 60 * 60 * 1000);
    case '1d':
      return new Date(end.getTime() - 24 * 60 * 60 * 1000);
    case '1w':
      return new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '1m':
      return new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '3m':
      return new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
    case '6m':
      return new Date(end.getTime() - 180 * 24 * 60 * 60 * 1000);
    case '1y':
      return new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);
    default:
      return new Date(end.getTime() - 24 * 60 * 60 * 1000);
  }
}
