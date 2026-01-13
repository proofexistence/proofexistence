import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { checkRateLimit } from '@/lib/ratelimit';
import {
  updateUserStreak,
  hasClaimedStreakToday,
  createQuestReward,
  getUserDailyQuest,
} from '@/lib/db/queries/quests';
import {
  QUEST_CONFIG,
  QUEST_REWARD_TYPES,
  getTodayDateString,
} from '@/lib/quests/config';
import { formatEther } from 'ethers';
import { db } from '@/db';
import { userBadges } from '@/db/schema';

export async function POST() {
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

    // Check if already claimed today
    const alreadyClaimed = await hasClaimedStreakToday(user.id);
    if (alreadyClaimed) {
      return NextResponse.json(
        { error: 'Streak already claimed today' },
        { status: 400 }
      );
    }

    // Check if user has completed any task today (required for streak)
    const today = getTodayDateString();
    const quest = await getUserDailyQuest(user.id, today);
    const hasActivity =
      quest &&
      (quest.createCount > 0 || quest.likeCount > 0 || quest.themeCompleted);

    if (!hasActivity) {
      return NextResponse.json(
        { error: 'Complete at least one task to claim streak' },
        { status: 400 }
      );
    }

    // Update streak
    const { streak, milestoneReached } = await updateUserStreak(user.id);

    // Create daily streak reward
    await createQuestReward(
      user.id,
      QUEST_REWARD_TYPES.STREAK_DAILY,
      QUEST_CONFIG.rewards.streakDaily
    );

    // Handle milestone reward and badge
    if (milestoneReached && milestoneReached.reward !== '0') {
      await createQuestReward(
        user.id,
        QUEST_REWARD_TYPES.STREAK_MILESTONE,
        milestoneReached.reward,
        milestoneReached.day
      );

      // Award badge if applicable
      if (milestoneReached.badgeId) {
        try {
          await db
            .insert(userBadges)
            .values({
              userId: user.id,
              badgeId: milestoneReached.badgeId,
            })
            .onConflictDoNothing();
        } catch {
          // Badge may not exist yet, ignore
        }
      }
    }

    // Calculate next milestone
    const nextMilestone = QUEST_CONFIG.milestones.find(
      (m) => m.day > streak.currentStreak
    );

    return NextResponse.json({
      success: true,
      reward: formatEther(QUEST_CONFIG.rewards.streakDaily),
      currentStreak: streak.currentStreak,
      milestoneReached: milestoneReached
        ? {
            day: milestoneReached.day,
            reward: formatEther(milestoneReached.reward),
            badgeId: milestoneReached.badgeId,
          }
        : null,
      nextMilestone: nextMilestone
        ? {
            day: nextMilestone.day,
            reward: formatEther(nextMilestone.reward),
          }
        : null,
    });
  } catch (error) {
    console.error('Claim Streak API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
