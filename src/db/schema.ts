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

    // Referral System
    referralCode: varchar('referral_code', { length: 10 }).unique(), // Short hash of wallet
    referredBy: uuid('referred_by'), // ID of the user who referred this user

    // TIME26 Token Balance (off-chain tracking for rewards)
    time26Balance: decimal('time26_balance', { precision: 36, scale: 18 })
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
    precision: 36,
    scale: 18,
  }).notNull(),
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
  totalBudget: decimal('total_budget', { precision: 36, scale: 18 }).notNull(), // Total TIME26 available for the day
  totalSeconds: integer('total_seconds').notNull(), // Total drawing seconds across all users
  totalDistributed: decimal('total_distributed', {
    precision: 36,
    scale: 18,
  }).notNull(), // Actually distributed
  participantCount: integer('participant_count').notNull(),
  contractBalanceBefore: decimal('contract_balance_before', {
    precision: 36,
    scale: 18,
  }), // For auditing
  contractBalanceAfter: decimal('contract_balance_after', {
    precision: 36,
    scale: 18,
  }), // For auditing
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
    baseReward: decimal('base_reward', { precision: 36, scale: 18 }).notNull(), // From time-weighted distribution
    bonusReward: decimal('bonus_reward', {
      precision: 36,
      scale: 18,
    }).notNull(), // From leftover pool
    totalReward: decimal('total_reward', {
      precision: 36,
      scale: 18,
    }).notNull(),
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
    amount: decimal('amount', { precision: 36, scale: 18 }).notNull(),
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

// Session status enum for type safety
export const SESSION_STATUS = {
  PENDING: 'PENDING',
  SETTLED: 'SETTLED',
  MINTED: 'MINTED',
} as const;

export type SessionStatus =
  (typeof SESSION_STATUS)[keyof typeof SESSION_STATUS];
