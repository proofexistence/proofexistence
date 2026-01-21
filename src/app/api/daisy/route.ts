import { NextRequest, NextResponse } from 'next/server';
import {
  getSessionsByDate,
  getAvailableDates,
} from '@/lib/db/queries/get-sessions-by-date';
import type { TrailPoint } from '@/components/daily-art/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date');

    // If no date provided, return available dates
    if (!dateStr) {
      const availableDates = await getAvailableDates();
      return NextResponse.json({ availableDates });
    }

    // Parse date (expecting YYYY-MM-DD format)
    const date = new Date(dateStr + 'T00:00:00Z');

    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    const sessions = await getSessionsByDate(date);

    // Process sessions for response
    const processedSessions = sessions
      .filter((s) => Array.isArray(s.trailData) && s.trailData.length > 0)
      .map((s) => ({
        id: s.id,
        trailData: s.trailData as TrailPoint[],
        color: s.color || '#ffffff',
        duration: s.duration,
        createdAt: s.createdAt.toISOString(),
        userName: s.userName || undefined,
        title: s.title || undefined,
      }));

    return NextResponse.json({
      sessions: processedSessions,
      date: dateStr,
      count: processedSessions.length,
    });
  } catch (error) {
    console.error('Error in daily-art API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
