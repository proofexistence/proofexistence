import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { db } from '@/db';
import { savedSessions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    // 1. Auth Check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse Body
    const { sessionId, action } = await req.json(); // action: 'save' | 'unsave'

    // 3. Execute Action
    if (action === 'save') {
      await db
        .insert(savedSessions)
        .values({
          userId: user.id,
          sessionId: sessionId,
        })
        .onConflictDoNothing();
    } else if (action === 'unsave') {
      await db
        .delete(savedSessions)
        .where(
          and(
            eq(savedSessions.userId, user.id),
            eq(savedSessions.sessionId, sessionId)
          )
        );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Save API Error', e);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
