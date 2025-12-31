import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sessions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    }

    // Public endpoint: Fetch session by ID
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, id),
      columns: {
        id: true,
        startTime: true,
        duration: true,
        status: true,
        txHash: true,
        trailData: true, // Crucial: Includes the compressed coordinates
        createdAt: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
