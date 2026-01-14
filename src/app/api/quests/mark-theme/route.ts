import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { checkRateLimit } from '@/lib/ratelimit';
import {
  markThemeCompleted,
  createQuestReward,
} from '@/lib/db/queries/quests';
import { QUEST_CONFIG, QUEST_REWARD_TYPES } from '@/lib/quests/config';
import { formatEther } from 'ethers';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit
    const { success } = await checkRateLimit(user.walletAddress);
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { sessionId } = await req.json();
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    // Mark as completed (allows changing to different session)
    await markThemeCompleted(user.id, sessionId);

    // Create reward record
    const { isNew } = await createQuestReward(
      user.id,
      QUEST_REWARD_TYPES.DAILY_THEME,
      QUEST_CONFIG.rewards.dailyTheme
    );

    return NextResponse.json({
      success: true,
      reward: formatEther(QUEST_CONFIG.rewards.dailyTheme),
      isNew,
    });
  } catch (error) {
    console.error('Mark Theme API Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal Server Error',
      },
      { status: 500 }
    );
  }
}
