// Quest system configuration
// All TIME26 amounts are in wei (1 TIME26 = 10^18 wei)

import { parseEther } from 'ethers';

export const QUEST_CONFIG = {
  // Daily Task Rewards
  rewards: {
    dailyCreate: parseEther('20').toString(), // 20 TIME26
    dailyLike: parseEther('15').toString(), // 15 TIME26
    dailyTheme: parseEther('50').toString(), // 50 TIME26
    streakDaily: parseEther('10').toString(), // 10 TIME26
  },

  // Streak Milestones
  milestones: [
    { day: 7, reward: parseEther('100').toString(), badgeId: 'streak-7' },
    { day: 14, reward: parseEther('200').toString(), badgeId: null },
    { day: 30, reward: parseEther('500').toString(), badgeId: 'streak-30' },
    { day: 100, reward: parseEther('0').toString(), badgeId: 'streak-100' },
  ],

  // Task Targets
  targets: {
    dailyCreate: 1, // Create 1 session
    dailyLike: 3, // Like 3 sessions
    dailyTheme: 1, // Mark 1 session as theme
  },

  // Budget Control (initially disabled)
  budget: {
    enabled: false,
    dailyLimit: null as string | null, // in wei
    mode: 'unlimited' as 'unlimited' | 'fixed' | 'percentage',
    lowBalanceAlert: parseEther('100000').toString(),
  },
} as const;

// Reward types enum
export const QUEST_REWARD_TYPES = {
  DAILY_CREATE: 'daily_create',
  DAILY_LIKE: 'daily_like',
  DAILY_THEME: 'daily_theme',
  STREAK_DAILY: 'streak_daily',
  STREAK_MILESTONE: 'streak_milestone',
} as const;

export type QuestRewardType =
  (typeof QUEST_REWARD_TYPES)[keyof typeof QUEST_REWARD_TYPES];

// Quest status enum
export const QUEST_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  SENT: 'SENT',
} as const;

export type QuestStatus = (typeof QUEST_STATUS)[keyof typeof QUEST_STATUS];

// Helper to get today's date string in YYYY-MM-DD format (UTC)
export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

// Helper to get yesterday's date string
export function getYesterdayDateString(): string {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return yesterday.toISOString().split('T')[0];
}
