import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { db } from '@/db';
import { likes } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const liked = await db
      .select({ sessionId: likes.sessionId })
      .from(likes)
      .where(eq(likes.userId, user.id));

    return NextResponse.json({
      likedSessionIds: liked.map((l) => l.sessionId),
    });
  } catch (err) {
    console.error('Error fetching liked sessions:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
