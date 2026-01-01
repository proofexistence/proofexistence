/**
 * TIME26 Daily Reward Calculation
 *
 * Algorithm:
 * 1. Time-weighted distribution with overlap handling
 * 2. For each second in the day, divide reward among all active users
 * 3. Exclusive time gets full weight, shared time is split proportionally
 *
 * Budget: 31,500,000 TIME26 / 365 days = ~86,301.37 TIME26 per day
 */

import Decimal from 'decimal.js';

// Configure Decimal.js for high precision
Decimal.set({ precision: 36, rounding: Decimal.ROUND_DOWN });

// Daily budget: 31.5M TIME26 / 365 days (in wei - 18 decimals)
export const TOTAL_REWARD_POOL = new Decimal('31500000').times(
  new Decimal(10).pow(18)
);
export const DAYS_IN_YEAR = 365;
export const DAILY_BUDGET = TOTAL_REWARD_POOL.div(DAYS_IN_YEAR);
// ~86,301.369863013698630137 TIME26 per day

export interface DrawingPeriod {
  userId: string;
  sessionId: string;
  startTime: Date;
  duration: number; // seconds
}

export interface UserRewardResult {
  userId: string;
  totalSeconds: number;
  exclusiveSeconds: number;
  sharedSeconds: number;
  baseReward: string; // decimal string (wei)
  bonusReward: string; // decimal string (wei)
  totalReward: string; // decimal string (wei)
}

export interface DailyRewardResult {
  dayId: string;
  totalBudget: string;
  totalSeconds: number;
  totalDistributed: string;
  participantCount: number;
  userRewards: UserRewardResult[];
}

/**
 * Calculate rewards for a given day based on drawing sessions
 * Uses time-weighted distribution with overlap handling
 */
export function calculateDailyRewards(
  dayId: string,
  sessions: DrawingPeriod[]
): DailyRewardResult {
  if (sessions.length === 0) {
    return {
      dayId,
      totalBudget: DAILY_BUDGET.toFixed(0),
      totalSeconds: 0,
      totalDistributed: '0',
      participantCount: 0,
      userRewards: [],
    };
  }

  // Build timeline: map of second -> set of active users
  const timeline = new Map<number, Set<string>>();

  for (const session of sessions) {
    const startSecond = Math.floor(session.startTime.getTime() / 1000);
    for (let i = 0; i < session.duration; i++) {
      const second = startSecond + i;
      if (!timeline.has(second)) {
        timeline.set(second, new Set());
      }
      timeline.get(second)!.add(session.userId);
    }
  }

  // Calculate weighted seconds per user
  // If N users are active at a given second, each gets 1/N of that second
  const userWeightedSeconds = new Map<string, Decimal>();
  const userExclusiveSeconds = new Map<string, number>();
  const userSharedSeconds = new Map<string, number>();

  for (const [, users] of timeline) {
    const userCount = users.size;
    const sharePerUser = new Decimal(1).div(userCount);

    for (const userId of users) {
      // Track weighted seconds
      const current = userWeightedSeconds.get(userId) || new Decimal(0);
      userWeightedSeconds.set(userId, current.plus(sharePerUser));

      // Track exclusive vs shared for logging/auditing
      if (userCount === 1) {
        const exclusive = userExclusiveSeconds.get(userId) || 0;
        userExclusiveSeconds.set(userId, exclusive + 1);
      } else {
        const shared = userSharedSeconds.get(userId) || 0;
        userSharedSeconds.set(userId, shared + 1);
      }
    }
  }

  // Calculate total weighted seconds
  let totalWeightedSeconds = new Decimal(0);
  for (const weighted of userWeightedSeconds.values()) {
    totalWeightedSeconds = totalWeightedSeconds.plus(weighted);
  }

  // Distribute rewards proportionally
  const userRewards: UserRewardResult[] = [];
  let totalDistributed = new Decimal(0);

  // Get unique participants
  const participants = new Set(sessions.map((s) => s.userId));

  for (const userId of participants) {
    const weightedSeconds = userWeightedSeconds.get(userId) || new Decimal(0);
    const exclusiveSeconds = userExclusiveSeconds.get(userId) || 0;
    const sharedSeconds = userSharedSeconds.get(userId) || 0;

    // Base reward: (user's weighted seconds / total weighted seconds) * daily budget
    const baseReward =
      totalWeightedSeconds.gt(0)
        ? weightedSeconds.div(totalWeightedSeconds).times(DAILY_BUDGET)
        : new Decimal(0);

    // For now, no bonus distribution (could be implemented for streak rewards etc.)
    const bonusReward = new Decimal(0);
    const totalReward = baseReward.plus(bonusReward);

    totalDistributed = totalDistributed.plus(totalReward);

    userRewards.push({
      userId,
      totalSeconds: exclusiveSeconds + sharedSeconds,
      exclusiveSeconds,
      sharedSeconds,
      baseReward: baseReward.toFixed(0),
      bonusReward: bonusReward.toFixed(0),
      totalReward: totalReward.toFixed(0),
    });
  }

  return {
    dayId,
    totalBudget: DAILY_BUDGET.toFixed(0),
    totalSeconds: Math.floor(totalWeightedSeconds.toNumber()),
    totalDistributed: totalDistributed.toFixed(0),
    participantCount: participants.size,
    userRewards,
  };
}

/**
 * Format wei amount to human-readable TIME26 amount
 */
export function formatTime26(weiAmount: string): string {
  const decimal = new Decimal(weiAmount);
  return decimal.div(new Decimal(10).pow(18)).toFixed(4);
}

/**
 * Get yesterday's date ID in YYYY-MM-DD format
 */
export function getYesterdayDayId(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

/**
 * Get today's date ID in YYYY-MM-DD format
 */
export function getTodayDayId(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Check if a day has already been settled
 */
export function getDayStartEnd(dayId: string): { start: Date; end: Date } {
  const start = new Date(dayId + 'T00:00:00.000Z');
  const end = new Date(dayId + 'T23:59:59.999Z');
  return { start, end };
}
