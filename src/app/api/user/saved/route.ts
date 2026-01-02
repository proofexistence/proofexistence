import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { db } from '@/db';
import { savedSessions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const saved = await db
      .select({ sessionId: savedSessions.sessionId })
      .from(savedSessions)
      .where(eq(savedSessions.userId, user.id));

    return NextResponse.json({
      savedSessionIds: saved.map((s) => s.sessionId),
    });
  } catch (err) {
    console.error('Error fetching saved sessions:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
