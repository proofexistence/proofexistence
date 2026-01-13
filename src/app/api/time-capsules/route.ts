import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { db } from '@/db';
import { timeCapsules, sessions } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';

// GET /api/time-capsules - Get user's time capsules
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const capsules = await db
      .select({
        id: timeCapsules.id,
        sessionId: timeCapsules.sessionId,
        unlockDate: timeCapsules.unlockDate,
        message: timeCapsules.message,
        isOpened: timeCapsules.isOpened,
        openedAt: timeCapsules.openedAt,
        createdAt: timeCapsules.createdAt,
        // Include session preview data
        sessionTitle: sessions.title,
        sessionPreviewUrl: sessions.previewUrl,
      })
      .from(timeCapsules)
      .leftJoin(sessions, eq(timeCapsules.sessionId, sessions.id))
      .where(eq(timeCapsules.userId, user.id))
      .orderBy(desc(timeCapsules.createdAt))
      .limit(50);

    // Mask message for unopened capsules that haven't reached unlock date
    const now = new Date();
    const maskedCapsules = capsules.map((c) => ({
      ...c,
      message:
        !c.isOpened && c.unlockDate > now
          ? null // Hide message until opened
          : c.message,
      canOpen: !c.isOpened && c.unlockDate <= now,
    }));

    return NextResponse.json({ timeCapsules: maskedCapsules });
  } catch (error) {
    console.error('GET time-capsules error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST /api/time-capsules - Create a time capsule
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, unlockDate, message, notifyOnUnlock } = await req.json();

    if (!sessionId || !unlockDate) {
      return NextResponse.json(
        { error: 'sessionId and unlockDate are required' },
        { status: 400 }
      );
    }

    // Validate unlock date is in the future
    const unlockDateObj = new Date(unlockDate);
    if (unlockDateObj <= new Date()) {
      return NextResponse.json(
        { error: 'unlockDate must be in the future' },
        { status: 400 }
      );
    }

    // Verify session belongs to user
    const [session] = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, user.id)))
      .limit(1);

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found or not owned by user' },
        { status: 404 }
      );
    }

    // Check if time capsule already exists for this session
    const [existing] = await db
      .select({ id: timeCapsules.id })
      .from(timeCapsules)
      .where(eq(timeCapsules.sessionId, sessionId))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: 'Time capsule already exists for this session' },
        { status: 409 }
      );
    }

    // Create time capsule
    const [capsule] = await db
      .insert(timeCapsules)
      .values({
        userId: user.id,
        sessionId,
        unlockDate: unlockDateObj,
        message: message || null,
        notifyOnUnlock: notifyOnUnlock ?? true,
      })
      .returning();

    return NextResponse.json({ timeCapsule: capsule });
  } catch (error) {
    console.error('POST time-capsule error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
