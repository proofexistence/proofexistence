import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { db } from '@/db';
import { sessions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    // 1. Auth Check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Process Submission
    const body = await req.json();
    const { sessionId, type, txHash } = body;

    if (!sessionId || !type) {
      return NextResponse.json(
        { error: 'Missing sessionId or type' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existingSession = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, user.id)))
      .limit(1);

    if (existingSession.length === 0) {
      return NextResponse.json(
        { error: 'Session not found or unauthorized' },
        { status: 404 }
      );
    }

    // Update based on Type
    if (type === 'INSTANT') {
      if (!txHash) {
        return NextResponse.json(
          { error: 'Missing txHash for Instant Proof' },
          { status: 400 }
        );
      }

      await db
        .update(sessions)
        .set({
          status: 'MINTED',
          txHash: txHash,
        })
        .where(eq(sessions.id, sessionId));

      return NextResponse.json({ success: true, status: 'MINTED' });
    } else if (type === 'STANDARD') {
      return NextResponse.json({ success: true, status: 'PENDING' });
    }

    return NextResponse.json(
      { error: 'Invalid submission type' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Submission error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
