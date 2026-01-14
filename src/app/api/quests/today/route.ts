import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import {
  getTodayTheme,
  getUserDailyQuest,
  getUserStreak,
  hasClaimedStreakToday,
} from '@/lib/db/queries/quests';
import { QUEST_CONFIG, getTodayDateString } from '@/lib/quests/config';
import { formatEther } from 'ethers';

export async function GET() {
  try {
    const user = await getCurrentUser();
    const today = getTodayDateString();

    // Always fetch theme (public info)
    const theme = await getTodayTheme();

    // If not logged in, return only theme info (public access)
    if (!user) {
      return NextResponse.json({
        date: today,
        theme: theme
          ? { name: theme.theme, description: theme.description }
          : null,
        tasks: null,
        streak: null,
        totalEarned: '0',
      });
    }

    // Fetch user-specific data in parallel
    const [quest, streak, streakClaimed] = await Promise.all([
      getUserDailyQuest(user.id, today),
      getUserStreak(user.id),
      hasClaimedStreakToday(user.id),
    ]);

    const createCount = quest?.createCount ?? 0;
    const likeCount = quest?.likeCount ?? 0;
    const themeCompleted = quest?.themeCompleted ?? false;
    const currentStreak = streak?.currentStreak ?? 0;

    // Calculate task completion
    const tasks = {
      dailyCreate: {
        target: QUEST_CONFIG.targets.dailyCreate,
        current: createCount,
        reward: formatEther(QUEST_CONFIG.rewards.dailyCreate),
        completed: createCount >= QUEST_CONFIG.targets.dailyCreate,
      },
      dailyLike: {
        target: QUEST_CONFIG.targets.dailyLike,
        current: likeCount,
        reward: formatEther(QUEST_CONFIG.rewards.dailyLike),
        completed: likeCount >= QUEST_CONFIG.targets.dailyLike,
      },
      dailyTheme: {
        reward: formatEther(QUEST_CONFIG.rewards.dailyTheme),
        completed: themeCompleted,
        sessionId: quest?.themeSessionId ?? null,
      },
    };

    // Calculate next milestone
    const nextMilestone = QUEST_CONFIG.milestones.find(
      (m) => m.day > currentStreak
    );

    // Calculate total earned today (completed tasks only)
    let totalEarned = 0;
    if (tasks.dailyCreate.completed) {
      totalEarned += parseFloat(tasks.dailyCreate.reward);
    }
    if (tasks.dailyLike.completed) {
      totalEarned += parseFloat(tasks.dailyLike.reward);
    }
    if (tasks.dailyTheme.completed) {
      totalEarned += parseFloat(tasks.dailyTheme.reward);
    }
    if (streakClaimed) {
      totalEarned += parseFloat(formatEther(QUEST_CONFIG.rewards.streakDaily));
    }

    return NextResponse.json({
      date: today,
      theme: theme
        ? { name: theme.theme, description: theme.description }
        : null,
      tasks,
      streak: {
        current: currentStreak,
        todayClaimed: streakClaimed,
        dailyReward: formatEther(QUEST_CONFIG.rewards.streakDaily),
        nextMilestone: nextMilestone
          ? {
              day: nextMilestone.day,
              reward: formatEther(nextMilestone.reward),
              badgeId: nextMilestone.badgeId,
            }
          : null,
      },
      totalEarned: totalEarned.toFixed(0),
    });
  } catch (error) {
    console.error('Quest Today API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
