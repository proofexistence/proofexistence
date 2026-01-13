// POE 2026 Database Schema
// Drizzle ORM definitions for NeonDB (Serverless PostgreSQL)

import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  jsonb,
  decimal,
  index,
  check,
  primaryKey,
  boolean,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ============================================================================
// USERS TABLE
// Stores user accounts (via Clerk authentication + Openfort wallets)
// ============================================================================
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clerkId: varchar('clerk_id', { length: 50 }).unique(), // Link to Clerk (nullable for Web3Auth users)
    walletAddress: varchar('wallet_address', { length: 42 }).notNull().unique(), // Primary wallet (Web3Auth MPC or External)
    email: varchar('email', { length: 255 }),
    username: varchar('username', { length: 30 }).unique(),
    name: varchar('name', { length: 50 }), // Display Name (shown everywhere, "Anonymous" if empty)
    avatarUrl: varchar('avatar_url', { length: 500 }),
    isAdmin: boolean('is_admin').default(false).notNull(),

    // Referral System
    referralCode: varchar('referral_code', { length: 10 }).unique(), // Short hash of wallet
    referredBy: uuid('referred_by'), // ID of the user who referred this user

    // TIME26 Token Balance (off-chain, claimable amount in wei)
    // This is reduced when user spends on proofs
    time26Balance: decimal('time26_balance', { precision: 78, scale: 0 })
      .default('0')
      .notNull(),

    // TIME26 Pending Burn (spent amount waiting for cron to burn)
    // Reset to 0 after each cron burn
    time26PendingBurn: decimal('time26_pending_burn', {
      precision: 78,
      scale: 0,
    })
      .default('0')
      .notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at'),
  },
  (table) => [
    index('users_wallet_address_idx').on(table.walletAddress),
    index('users_clerk_id_idx').on(table.clerkId),
    index('users_referral_code_idx').on(table.referralCode),
  ]
);

// ============================================================================
// SESSIONS TABLE
// Stores each "Light Trail" interaction session
// Key Business Rules:
//   - duration >= 10 seconds (enforced by check constraint)
//   - status: PENDING → SETTLED (Standard Proof) or MINTED (Instant Proof)
// ============================================================================
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    startTime: timestamp('start_time').notNull(),
    duration: integer('duration').notNull(), // Must be >= 10 (see check constraint)
    sectorId: integer('sector_id').notNull(),
    trailData: jsonb('trail_data'), // Compressed coordinates [{x, y, z, t}, ...]
    message: varchar('message', { length: 280 }), // User message/thoughts
    title: varchar('title', { length: 100 }), // Art Title
    description: varchar('description', { length: 500 }), // Art Description
    color: varchar('color', { length: 7 }), // Hex color code (e.g. #FF0000)
    tokenId: varchar('token_id', { length: 78 }), // NFT Token ID (uint256 max chars)

    // Engagement Metrics
    views: integer('views').default(0).notNull(),
    likes: integer('likes').default(0).notNull(), // Denormalized count for performance

    // Visibility
    hidden: integer('hidden').default(0).notNull(), // 0 = visible, 1 = hidden from explore/public profile

    status: varchar('status', { length: 20 }).default('PENDING').notNull(), // PENDING | SETTLED | MINTED
    txHash: varchar('tx_hash', { length: 66 }), // Populated if Instant Proof (minted)
    ipfsHash: varchar('ipfs_hash', { length: 255 }), // IPFS CID for NFT metadata
    previewUrl: varchar('preview_url', { length: 500 }), // R2 Public URL for stored image
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('sessions_user_id_idx').on(table.userId),
    index('sessions_sector_id_idx').on(table.sectorId),
    index('sessions_status_idx').on(table.status),
    index('sessions_created_at_idx').on(table.createdAt),
    // Enforce minimum 10 second duration rule
    check('duration_min_10s', sql`${table.duration} >= 10`),
  ]
);

// ============================================================================
// LIKES TABLE
// Tracks unique likes to prevent abuse
// ============================================================================
export const likes = pgTable(
  'likes',
  {
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    sessionId: uuid('session_id')
      .references(() => sessions.id)
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.sessionId] }), // Composite Primary Key
    index('likes_session_id_idx').on(table.sessionId),
  ]
);

// ============================================================================
// SAVED SESSIONS (BOOKMARKS)
// Users collecting/bookmarking other trails
// ============================================================================
export const savedSessions = pgTable(
  'saved_sessions',
  {
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    sessionId: uuid('session_id')
      .references(() => sessions.id)
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.sessionId] }),
    index('saved_sessions_user_id_idx').on(table.userId),
  ]
);

// ============================================================================
// BADGES TABLE
// Definitions of available badges
// ============================================================================
export const badges = pgTable('badges', {
  id: varchar('id', { length: 50 }).primaryKey(), // e.g., 'early-adopter', 'top-100-duration'
  name: varchar('name', { length: 100 }).notNull(),
  description: varchar('description', { length: 255 }).notNull(),
  imageUrl: varchar('image_url', { length: 255 }),
});

// ============================================================================
// USER BADGES
// Badges earned by users
// ============================================================================
export const userBadges = pgTable(
  'user_badges',
  {
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    badgeId: varchar('badge_id', { length: 50 })
      .references(() => badges.id)
      .notNull(),
    awardedAt: timestamp('awarded_at').defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.badgeId] })]
);

// ============================================================================
// DAILY SNAPSHOTS TABLE
// Stores aggregated Merkle Tree roots for Standard Proof (T+1 Settlement)
// ============================================================================
export const dailySnapshots = pgTable('daily_snapshots', {
  dayId: varchar('day_id', { length: 10 }).primaryKey(), // Format: "YYYY-MM-DD"
  merkleRoot: varchar('merkle_root', { length: 66 }).notNull(),
  totalRewards: decimal('total_rewards', {
    precision: 78,
    scale: 0,
  }).notNull(), // in wei
  participantCount: integer('participant_count').notNull(),
  txHash: varchar('tx_hash', { length: 66 }), // On-chain settlement tx
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// DAILY REWARDS TABLE
// Stores TIME26 reward settlement records per day
// ============================================================================
export const dailyRewards = pgTable('daily_rewards', {
  dayId: varchar('day_id', { length: 10 }).primaryKey(), // Format: "YYYY-MM-DD"
  totalBudget: decimal('total_budget', { precision: 78, scale: 0 }).notNull(), // Total TIME26 available (in wei)
  totalSeconds: integer('total_seconds').notNull(), // Total drawing seconds across all users
  totalDistributed: decimal('total_distributed', {
    precision: 78,
    scale: 0,
  }).notNull(), // Actually distributed (in wei)
  participantCount: integer('participant_count').notNull(),
  contractBalanceBefore: decimal('contract_balance_before', {
    precision: 78,
    scale: 0,
  }), // For auditing (in wei)
  contractBalanceAfter: decimal('contract_balance_after', {
    precision: 78,
    scale: 0,
  }), // For auditing (in wei)
  settledAt: timestamp('settled_at').defaultNow().notNull(),
});

// ============================================================================
// USER DAILY REWARDS TABLE
// Stores per-user reward breakdown for each day
// ============================================================================
export const userDailyRewards = pgTable(
  'user_daily_rewards',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    dayId: varchar('day_id', { length: 10 }).notNull(), // Format: "YYYY-MM-DD"
    totalSeconds: integer('total_seconds').notNull(), // User's drawing seconds
    exclusiveSeconds: integer('exclusive_seconds').notNull(), // Seconds drawing alone
    sharedSeconds: integer('shared_seconds').notNull(), // Seconds overlapping with others
    baseReward: decimal('base_reward', { precision: 78, scale: 0 }).notNull(), // From time-weighted distribution (in wei)
    bonusReward: decimal('bonus_reward', {
      precision: 78,
      scale: 0,
    }).notNull(), // From leftover pool (in wei)
    totalReward: decimal('total_reward', {
      precision: 78,
      scale: 0,
    }).notNull(), // Total reward (in wei)
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('user_daily_rewards_user_id_idx').on(table.userId),
    index('user_daily_rewards_day_id_idx').on(table.dayId),
  ]
);

// ============================================================================
// BONUS REWARDS RECORDS TABLE
// Tracks manual bonus distributions from Treasury (rankings, referrals, etc.)
// For audit trail - actual transfers happen via Gnosis Safe
// ============================================================================
export const bonusRewards = pgTable(
  'bonus_rewards',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    amount: decimal('amount', { precision: 78, scale: 0 }).notNull(), // in wei
    type: varchar('type', { length: 50 }).notNull(), // 'ranking' | 'referral' | 'airdrop' | 'contest' | 'kol'
    description: varchar('description', { length: 500 }),
    txHash: varchar('tx_hash', { length: 66 }), // Safe transaction hash
    status: varchar('status', { length: 20 }).default('PENDING').notNull(), // PENDING | APPROVED | SENT
    createdAt: timestamp('created_at').defaultNow().notNull(),
    approvedAt: timestamp('approved_at'),
  },
  (table) => [
    index('bonus_rewards_user_id_idx').on(table.userId),
    index('bonus_rewards_type_idx').on(table.type),
    index('bonus_rewards_status_idx').on(table.status),
  ]
);

// ============================================================================
// TIME26 TRANSACTIONS TABLE
// Complete audit trail for all TIME26 balance changes
// ============================================================================
export const time26Transactions = pgTable(
  'time26_transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    type: varchar('type', { length: 50 }).notNull(),
    // Types: 'daily_reward' | 'referral_bonus' | 'ranking_bonus' | 'airdrop' |
    //        'contest' | 'kol' | 'instant_proof_payment' | 'nft_mint_payment' |
    //        'burn' | 'historical_credit' | 'historical_debit'
    amount: decimal('amount', { precision: 78, scale: 0 }).notNull(), // Always positive
    direction: varchar('direction', { length: 10 }).notNull(), // 'credit' | 'debit'
    balanceBefore: decimal('balance_before', {
      precision: 78,
      scale: 0,
    }).notNull(),
    balanceAfter: decimal('balance_after', {
      precision: 78,
      scale: 0,
    }).notNull(),
    referenceId: varchar('reference_id', { length: 100 }), // sessionId, rewardId, dayId, etc.
    referenceType: varchar('reference_type', { length: 50 }), // 'session' | 'daily_reward' | 'bonus_reward'
    description: varchar('description', { length: 500 }),
    metadata: jsonb('metadata'), // Additional context (e.g., tx hash, original timestamp)
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('time26_transactions_user_id_idx').on(table.userId),
    index('time26_transactions_type_idx').on(table.type),
    index('time26_transactions_created_at_idx').on(table.createdAt),
    index('time26_transactions_reference_idx').on(
      table.referenceId,
      table.referenceType
    ),
  ]
);

// ============================================================================
// BRAND LINES TABLE
// Sponsored or Artist-curated lines connecting specific points/timeframes
// ============================================================================
export const brandLines = pgTable('brand_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  color: varchar('color', { length: 7 }).notNull(), // e.g., #FF0000
  isVisible: integer('is_visible').default(1).notNull(),

  // Logic: either connect a time range OR explicit points
  criteria: jsonb('criteria'), // { "startTime": "...", "endTime": "..." }
  explicitPoints: jsonb('explicit_points'), // Array of {x, y, z} for static logos

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// DAILY THEMES TABLE
// Stores daily creation themes (can be from default pool or admin override)
// ============================================================================
export const dailyThemes = pgTable(
  'daily_themes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    date: varchar('date', { length: 10 }).unique().notNull(), // Format: "YYYY-MM-DD"
    theme: varchar('theme', { length: 100 }).notNull(),
    description: varchar('description', { length: 500 }),
    isDefault: boolean('is_default').default(true).notNull(),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('daily_themes_date_idx').on(table.date)]
);

// ============================================================================
// DEFAULT THEMES TABLE
// Pool of themes for automatic daily rotation
// ============================================================================
export const defaultThemes = pgTable('default_themes', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  theme: varchar('theme', { length: 100 }).notNull(),
  description: varchar('description', { length: 500 }),
  isActive: boolean('is_active').default(true).notNull(),
});

// ============================================================================
// USER DAILY QUESTS TABLE
// Tracks user's daily quest progress
// ============================================================================
export const userDailyQuests = pgTable(
  'user_daily_quests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    date: varchar('date', { length: 10 }).notNull(), // Format: "YYYY-MM-DD"
    createCount: integer('create_count').default(0).notNull(),
    likeCount: integer('like_count').default(0).notNull(),
    themeCompleted: boolean('theme_completed').default(false).notNull(),
    themeSessionId: uuid('theme_session_id').references(() => sessions.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('user_daily_quests_user_date_idx').on(table.userId, table.date),
  ]
);

// ============================================================================
// USER STREAKS TABLE
// Tracks consecutive daily activity
// ============================================================================
export const userStreaks = pgTable('user_streaks', {
  userId: uuid('user_id')
    .references(() => users.id)
    .primaryKey(),
  currentStreak: integer('current_streak').default(0).notNull(),
  lastActiveDate: varchar('last_active_date', { length: 10 }), // Format: "YYYY-MM-DD"
  longestStreak: integer('longest_streak').default(0).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================================
// QUEST REWARDS TABLE
// Tracks quest bonus rewards (separate from daily TIME26 rewards)
// ============================================================================
export const questRewards = pgTable(
  'quest_rewards',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    date: varchar('date', { length: 10 }).notNull(),
    rewardType: varchar('reward_type', { length: 50 }).notNull(),
    // Types: 'daily_create' | 'daily_like' | 'daily_theme' | 'streak_daily' | 'streak_milestone'
    amount: decimal('amount', { precision: 78, scale: 0 }).notNull(), // in wei
    status: varchar('status', { length: 20 }).default('PENDING').notNull(),
    // Status: 'PENDING' | 'APPROVED' | 'SENT'
    milestoneDay: integer('milestone_day'), // For streak_milestone only (7, 14, 30, 100)
    createdAt: timestamp('created_at').defaultNow().notNull(),
    sentAt: timestamp('sent_at'),
  },
  (table) => [
    index('quest_rewards_user_id_idx').on(table.userId),
    index('quest_rewards_status_idx').on(table.status),
    index('quest_rewards_date_idx').on(table.date),
  ]
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type Like = typeof likes.$inferSelect;
export type SavedSession = typeof savedSessions.$inferSelect;

export type Badge = typeof badges.$inferSelect;
export type UserBadge = typeof userBadges.$inferSelect;

export type DailySnapshot = typeof dailySnapshots.$inferSelect;
export type NewDailySnapshot = typeof dailySnapshots.$inferInsert;

export type DailyReward = typeof dailyRewards.$inferSelect;
export type NewDailyReward = typeof dailyRewards.$inferInsert;

export type UserDailyReward = typeof userDailyRewards.$inferSelect;
export type NewUserDailyReward = typeof userDailyRewards.$inferInsert;

export type BonusReward = typeof bonusRewards.$inferSelect;
export type NewBonusReward = typeof bonusRewards.$inferInsert;

export type DailyTheme = typeof dailyThemes.$inferSelect;
export type NewDailyTheme = typeof dailyThemes.$inferInsert;

export type DefaultTheme = typeof defaultThemes.$inferSelect;
export type NewDefaultTheme = typeof defaultThemes.$inferInsert;

export type UserDailyQuest = typeof userDailyQuests.$inferSelect;
export type NewUserDailyQuest = typeof userDailyQuests.$inferInsert;

export type UserStreak = typeof userStreaks.$inferSelect;
export type NewUserStreak = typeof userStreaks.$inferInsert;

export type QuestReward = typeof questRewards.$inferSelect;
export type NewQuestReward = typeof questRewards.$inferInsert;

// Session status enum for type safety
export const SESSION_STATUS = {
  PENDING: 'PENDING',
  SETTLED: 'SETTLED',
  MINTED: 'MINTED',
} as const;

export type SessionStatus =
  (typeof SESSION_STATUS)[keyof typeof SESSION_STATUS];
