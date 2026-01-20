import {
  calculateStartDate,
  getTrailsForCol,
} from '@/lib/db/queries/get-trails-for-col';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const range = searchParams.get('range') || '1d';

    // Calculate date range based on parameters
    let startDate: Date;
    let endDate: Date;

    if (start && end) {
      startDate = new Date(start);
      endDate = new Date(end);
    } else {
      endDate = new Date();
      startDate = calculateStartDate(endDate, range);
    }

    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date parameters' },
        { status: 400 }
      );
    }

    const trails = await getTrailsForCol({ startDate, endDate });

    // Process trails for response
    const processedTrails = trails
      .filter((t) => Array.isArray(t.trailData) && t.trailData.length > 0)
      .map((t) => ({
        id: t.id,
        trailData: t.trailData,
        color: t.color || '#ffffff',
        createdAt: t.createdAt.toISOString(),
        duration: t.duration,
        userName: t.userName || undefined,
        title: t.title || undefined,
      }));

    return NextResponse.json({
      trails: processedTrails,
      timeRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      count: processedTrails.length,
    });
  } catch (error) {
    console.error('Error in col trails API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trails' },
      { status: 500 }
    );
  }
}
