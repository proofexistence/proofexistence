import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { likes, sessions, users } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

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
    const { sessionId, action } = await req.json();

    if (!sessionId || !action) {
      return NextResponse.json(
        { error: 'Missing parameters' },
        { status: 400 }
      );
    }

    // 4. Execute Action
    if (action === 'like') {
      // Upsert like (ignore if exists)
      await db
        .insert(likes)
        .values({
          userId: dbUser.id,
          sessionId: sessionId,
        })
        .onConflictDoNothing();

      // Increment session counter
      await db
        .update(sessions)
        .set({ likes: sql`${sessions.likes} + 1` })
        .where(eq(sessions.id, sessionId));
    } else if (action === 'unlike') {
      const deleted = await db
        .delete(likes)
        .where(and(eq(likes.userId, dbUser.id), eq(likes.sessionId, sessionId)))
        .returning();

      if (deleted.length > 0) {
        // Decrement session counter (ensure not negative)
        await db
          .update(sessions)
          .set({ likes: sql`GREATEST(${sessions.likes} - 1, 0)` })
          .where(eq(sessions.id, sessionId));
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Like API Error', e);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
