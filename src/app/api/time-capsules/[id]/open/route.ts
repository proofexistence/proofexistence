import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { db } from '@/db';
import { timeCapsules, sessions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// POST /api/time-capsules/[id]/open - Open a time capsule
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get the time capsule
    const [capsule] = await db
      .select()
      .from(timeCapsules)
      .where(and(eq(timeCapsules.id, id), eq(timeCapsules.userId, user.id)))
      .limit(1);

    if (!capsule) {
      return NextResponse.json(
        { error: 'Time capsule not found' },
        { status: 404 }
      );
    }

    if (capsule.isOpened) {
      return NextResponse.json(
        { error: 'Time capsule already opened' },
        { status: 400 }
      );
    }

    // Check if unlock date has passed
    const now = new Date();
    if (capsule.unlockDate > now) {
      const remainingMs = capsule.unlockDate.getTime() - now.getTime();
      const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
      return NextResponse.json(
        {
          error: 'Time capsule not yet unlockable',
          unlockDate: capsule.unlockDate.toISOString(),
          remainingDays,
        },
        { status: 400 }
      );
    }

    // Open the capsule
    const [updated] = await db
      .update(timeCapsules)
      .set({
        isOpened: true,
        openedAt: now,
      })
      .where(eq(timeCapsules.id, id))
      .returning();

    // Get the associated session
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, capsule.sessionId))
      .limit(1);

    return NextResponse.json({
      timeCapsule: updated,
      session: session || null,
    });
  } catch (error) {
    console.error('Open time capsule error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
