import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users, sessions } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  try {
    // 1. Auth Check (Clerk)
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get DB User
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });

    if (!user) {
      return NextResponse.json({ sessions: [] });
    }

    // 3. Fetch Sessions
    const userSessions = await db.query.sessions.findMany({
      where: eq(sessions.userId, user.id),
      orderBy: [desc(sessions.createdAt)],
      columns: {
        id: true,
        startTime: true,
        duration: true,
        status: true,
        txHash: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ sessions: userSessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
