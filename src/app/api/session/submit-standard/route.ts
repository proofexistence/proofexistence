import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sessions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { checkRateLimit } from '@/lib/ratelimit';
import { getCurrentUser } from '@/lib/auth/get-user';

export async function POST(req: NextRequest) {
  try {
    // 1. Auth Check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1.5 Rate Limit Check
    const { success } = await checkRateLimit(user.walletAddress);
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // 2. Parse Body
    const { sessionId, message, title, description } = await req.json();
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session ID' },
        { status: 400 }
      );
    }

    // Update with strict userId check ensures ownership
    const [updatedSession] = await db
      .update(sessions)
      .set({
        status: 'PENDING', // Queued for merkle tree
        message: message || null,
        title: title || null,
        description: description || null,
      })
      .where(
        and(
          eq(sessions.id, sessionId),
          eq(sessions.userId, user.id) // <--- CRITICAL: Ownership check
        )
      )
      .returning();

    if (!updatedSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, status: 'SETTLED' });
  } catch (error) {
    console.error('Standard submission error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
