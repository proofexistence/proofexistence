import { db } from '@/db';
import {
  dailyThemes,
  defaultThemes,
  userDailyQuests,
  userStreaks,
  questRewards,
  sessions,
} from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import {
  getTodayDateString,
  getYesterdayDateString,
} from '@/lib/quests/config';

// ============================================================================
// DAILY THEME QUERIES
// ============================================================================

export async function getTodayTheme() {
  const today = getTodayDateString();

  // First check for explicit override
  const [override] = await db
    .select()
    .from(dailyThemes)
    .where(eq(dailyThemes.date, today))
    .limit(1);

  if (override) {
    return override;
  }

  // Fall back to random default theme
  const activeThemes = await db
    .select()
    .from(defaultThemes)
    .where(eq(defaultThemes.isActive, true));

  if (activeThemes.length === 0) {
    return null;
  }

  // Use date-based seed for consistent daily selection
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const selectedTheme = activeThemes[dayOfYear % activeThemes.length];

  return {
    id: `default-${selectedTheme.id}`,
    date: today,
    theme: selectedTheme.theme,
    description: selectedTheme.description,
    isDefault: true,
    createdBy: null,
    createdAt: new Date(),
  };
}

// ============================================================================
// USER DAILY QUEST QUERIES
// ============================================================================

export async function getUserDailyQuest(userId: string, date?: string) {
  const targetDate = date || getTodayDateString();

  const [quest] = await db
    .select()
    .from(userDailyQuests)
    .where(
      and(
        eq(userDailyQuests.userId, userId),
        eq(userDailyQuests.date, targetDate)
      )
    )
    .limit(1);

  return quest || null;
}

export async function getOrCreateUserDailyQuest(userId: string) {
  const today = getTodayDateString();

  let quest = await getUserDailyQuest(userId, today);

  if (!quest) {
    const [newQuest] = await db
      .insert(userDailyQuests)
      .values({
        userId,
        date: today,
      })
      .returning();
    quest = newQuest;
  }

  return quest;
}

export async function incrementCreateCount(userId: string) {
  const quest = await getOrCreateUserDailyQuest(userId);

  await db
    .update(userDailyQuests)
    .set({
      createCount: quest.createCount + 1,
      updatedAt: new Date(),
    })
    .where(eq(userDailyQuests.id, quest.id));

  return quest.createCount + 1;
}

export async function incrementLikeCount(userId: string) {
  const quest = await getOrCreateUserDailyQuest(userId);

  await db
    .update(userDailyQuests)
    .set({
      likeCount: quest.likeCount + 1,
      updatedAt: new Date(),
    })
    .where(eq(userDailyQuests.id, quest.id));

  return quest.likeCount + 1;
}

export async function markThemeCompleted(userId: string, sessionId: string) {
  const quest = await getOrCreateUserDailyQuest(userId);

  // Verify session belongs to user
  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
    .limit(1);

  if (!session) {
    throw new Error('Session not found or not owned by user');
  }

  await db
    .update(userDailyQuests)
    .set({
      themeCompleted: true,
      themeSessionId: sessionId,
      updatedAt: new Date(),
    })
    .where(eq(userDailyQuests.id, quest.id));

  return true;
}

// ============================================================================
// USER STREAK QUERIES
// ============================================================================

export async function getUserStreak(userId: string) {
  const [streak] = await db
    .select()
    .from(userStreaks)
    .where(eq(userStreaks.userId, userId))
    .limit(1);

  return streak || null;
}

export async function updateUserStreak(userId: string) {
  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();

  const streak = await getUserStreak(userId);

  if (!streak) {
    // Create new streak record
    const [newStreak] = await db
      .insert(userStreaks)
      .values({
        userId,
        currentStreak: 1,
        lastActiveDate: today,
        longestStreak: 1,
      })
      .returning();
    return { streak: newStreak, isNewDay: true, milestoneReached: null };
  }

  // Already active today
  if (streak.lastActiveDate === today) {
    return { streak, isNewDay: false, milestoneReached: null };
  }

  let newCurrentStreak: number;

  if (streak.lastActiveDate === yesterday) {
    // Consecutive day
    newCurrentStreak = streak.currentStreak + 1;
  } else {
    // Streak broken, reset to 1
    newCurrentStreak = 1;
  }

  const newLongestStreak = Math.max(streak.longestStreak, newCurrentStreak);

  const [updatedStreak] = await db
    .update(userStreaks)
    .set({
      currentStreak: newCurrentStreak,
      lastActiveDate: today,
      longestStreak: newLongestStreak,
      updatedAt: new Date(),
    })
    .where(eq(userStreaks.userId, userId))
    .returning();

  // Check for milestone
  const { QUEST_CONFIG } = await import('@/lib/quests/config');
  const milestone = QUEST_CONFIG.milestones.find(
    (m) => m.day === newCurrentStreak
  );

  return {
    streak: updatedStreak,
    isNewDay: true,
    milestoneReached: milestone || null,
  };
}

// ============================================================================
// QUEST REWARD QUERIES
// ============================================================================

export async function createQuestReward(
  userId: string,
  rewardType: string,
  amount: string,
  milestoneDay?: number
) {
  const today = getTodayDateString();

  // Check if reward already exists for today
  const [existing] = await db
    .select()
    .from(questRewards)
    .where(
      and(
        eq(questRewards.userId, userId),
        eq(questRewards.date, today),
        eq(questRewards.rewardType, rewardType),
        milestoneDay ? eq(questRewards.milestoneDay, milestoneDay) : undefined
      )
    )
    .limit(1);

  if (existing) {
    return { reward: existing, isNew: false };
  }

  const [reward] = await db
    .insert(questRewards)
    .values({
      userId,
      date: today,
      rewardType,
      amount,
      milestoneDay,
      status: 'PENDING',
    })
    .returning();

  return { reward, isNew: true };
}

export async function getUserQuestRewards(userId: string, limit = 30) {
  return db
    .select()
    .from(questRewards)
    .where(eq(questRewards.userId, userId))
    .orderBy(desc(questRewards.createdAt))
    .limit(limit);
}

export async function hasClaimedStreakToday(userId: string) {
  const today = getTodayDateString();

  const [existing] = await db
    .select()
    .from(questRewards)
    .where(
      and(
        eq(questRewards.userId, userId),
        eq(questRewards.date, today),
        eq(questRewards.rewardType, 'streak_daily')
      )
    )
    .limit(1);

  return !!existing;
}
