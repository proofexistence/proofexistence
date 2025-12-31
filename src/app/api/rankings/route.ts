import { NextResponse } from 'next/server';
import { getRankings } from '@/lib/db/queries/get-rankings';

// Cache revalidation time (seconds)
export const revalidate = 60;

export async function GET() {
  try {
    const data = await getRankings(10);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching rankings:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
