import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { db } from '@/db';
import { likes, sessions } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { incrementLikeCount, createQuestReward } from '@/lib/db/queries/quests';
import { QUEST_CONFIG, QUEST_REWARD_TYPES } from '@/lib/quests/config';

export async function POST(req: NextRequest) {
  try {
    // 1. Auth Check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse Body
    const { sessionId, action } = await req.json();

    if (!sessionId || !action) {
      return NextResponse.json(
        { error: 'Missing parameters' },
        { status: 400 }
      );
    }

    // 3. Execute Action
    if (action === 'like') {
      // Prevent self-liking for quest progress
      const [targetSession] = await db
        .select({ userId: sessions.userId })
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .limit(1);

      const isSelfLike = targetSession?.userId === user.id;

      // Upsert like (ignore if exists)
      await db
        .insert(likes)
        .values({
          userId: user.id,
          sessionId: sessionId,
        })
        .onConflictDoNothing();

      // Increment session counter
      await db
        .update(sessions)
        .set({ likes: sql`${sessions.likes} + 1` })
        .where(eq(sessions.id, sessionId));

      // Track quest progress (only for non-self likes)
      if (!isSelfLike) {
        try {
          const newCount = await incrementLikeCount(user.id);

          // Check if daily like task just completed
          if (newCount === QUEST_CONFIG.targets.dailyLike) {
            await createQuestReward(
              user.id,
              QUEST_REWARD_TYPES.DAILY_LIKE,
              QUEST_CONFIG.rewards.dailyLike
            );
          }
        } catch (questError) {
          console.error('Quest tracking error:', questError);
        }
      }
    } else if (action === 'unlike') {
      const deleted = await db
        .delete(likes)
        .where(and(eq(likes.userId, user.id), eq(likes.sessionId, sessionId)))
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
