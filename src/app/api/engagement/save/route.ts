import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { savedSessions, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    // 1. Auth Check (Clerk)
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get DB User
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1);

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 3. Parse Body
    const { sessionId, action } = await req.json(); // action: 'save' | 'unsave'

    // 4. Execute Action
    if (action === 'save') {
      await db
        .insert(savedSessions)
        .values({
          userId: dbUser.id,
          sessionId: sessionId,
        })
        .onConflictDoNothing();
    } else if (action === 'unsave') {
      await db
        .delete(savedSessions)
        .where(
          and(
            eq(savedSessions.userId, dbUser.id),
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
