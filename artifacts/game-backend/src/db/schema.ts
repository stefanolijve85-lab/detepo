// src/db/schema.ts
//
// Canonical Postgres schema for Neon Runner. See game-ios/docs/04-database.md
// for the long-form reference + indexing guidance.

import {
  pgTable, text, integer, bigint, boolean, char,
  timestamp, jsonb, primaryKey, index, uniqueIndex,
} from 'drizzle-orm/pg-core';

export const players = pgTable(
  'players',
  {
    id: text('id').primaryKey(),
    displayName: text('display_name').notNull(),
    country: char('country', { length: 2 }).notNull(),
    appleSub: text('apple_sub').unique(),
    gcPlayerId: text('gc_player_id').unique(),
    xp: bigint('xp', { mode: 'number' }).notNull().default(0),
    level: integer('level').notNull().default(1),
    bytes: bigint('bytes', { mode: 'number' }).notNull().default(0),
    chips: bigint('chips', { mode: 'number' }).notNull().default(0),
    prestige: integer('prestige').notNull().default(0),
    streakDays: integer('streak_days').notNull().default(0),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    cheatFlags: integer('cheat_flags').notNull().default(0),
    isBanned: boolean('is_banned').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    countryIdx: index('idx_players_country').on(t.country),
    xpIdx: index('idx_players_xp_desc').on(t.xp),
  })
);

export const inventoryItems = pgTable(
  'inventory_items',
  {
    id: text('id').primaryKey(),
    playerId: text('player_id').notNull().references(() => players.id, { onDelete: 'cascade' }),
    catalogId: text('catalog_id').notNull(),
    kind: text('kind').notNull(),                  // jetpack | glove | trail | taunt | consumable
    rarity: text('rarity').notNull(),              // common | rare | epic | legendary
    level: integer('level').notNull().default(1),
    equipped: boolean('equipped').notNull().default(false),
    acquiredAt: timestamp('acquired_at', { withTimezone: true }).notNull().defaultNow(),
    source: text('source').notNull(),
  },
  (t) => ({
    playerIdx: index('idx_inventory_player').on(t.playerId),
    uniq: uniqueIndex('uniq_player_catalog').on(t.playerId, t.catalogId),
  })
);

export const runs = pgTable(
  'runs',
  {
    id: text('id').primaryKey(),
    playerId: text('player_id').notNull().references(() => players.id, { onDelete: 'cascade' }),
    seed: text('seed').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }).notNull(),
    durationMs: integer('duration_ms').notNull(),
    distanceCm: integer('distance_cm').notNull(),
    coins: integer('coins').notNull(),
    score: integer('score').notNull(),
    scoreClient: integer('score_client').notNull(),
    comboMax: integer('combo_max').notNull(),
    nearMisses: integer('near_misses').notNull(),
    causeOfDeath: text('cause_of_death').notNull(),
    biomePath: text('biome_path').array().notNull(),
    clientVersion: text('client_version').notNull(),
    deviceModel: text('device_model').notNull(),
    eventLogUri: text('event_log_uri'),
    validated: boolean('validated').notNull().default(false),
    flagged: boolean('flagged').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    playerStartedIdx: index('idx_runs_player_started').on(t.playerId, t.startedAt),
    scoreIdx: index('idx_runs_score_desc').on(t.score),
  })
);

export const missions = pgTable('missions', {
  id: text('id').primaryKey(),
  cadence: text('cadence').notNull(),    // daily | weekly | event
  tier: integer('tier').notNull(),
  kind: text('kind').notNull(),
  target: integer('target').notNull(),
  rewardBytes: integer('reward_bytes').notNull(),
  rewardXp: integer('reward_xp').notNull(),
  rewardBpXp: integer('reward_bp_xp').notNull(),
  rewardItemCatalogId: text('reward_item_catalog_id'),
  activeFrom: timestamp('active_from', { withTimezone: true }),
  activeTo: timestamp('active_to', { withTimezone: true }),
});

export const missionProgress = pgTable(
  'mission_progress',
  {
    id: text('id').primaryKey(),
    playerId: text('player_id').notNull().references(() => players.id, { onDelete: 'cascade' }),
    missionId: text('mission_id').notNull().references(() => missions.id, { onDelete: 'cascade' }),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
    progress: integer('progress').notNull().default(0),
    claimedAt: timestamp('claimed_at', { withTimezone: true }),
  },
  (t) => ({
    uniq: uniqueIndex('uniq_player_mission_day').on(t.playerId, t.missionId, t.assignedAt),
  })
);

export const battlepassSeasons = pgTable('battlepass_seasons', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  tiersJson: jsonb('tiers_json').notNull(),
  xpPerTier: integer('xp_per_tier').notNull().default(1000),
});

export const battlepassProgress = pgTable(
  'battlepass_progress',
  {
    id: text('id').primaryKey(),
    playerId: text('player_id').notNull().references(() => players.id, { onDelete: 'cascade' }),
    seasonId: text('season_id').notNull().references(() => battlepassSeasons.id, { onDelete: 'cascade' }),
    bpXp: integer('bp_xp').notNull().default(0),
    tier: integer('tier').notNull().default(0),
    isPremium: boolean('is_premium').notNull().default(false),
    claimedTiersFree: integer('claimed_tiers_free').array().notNull().default([] as number[] as never),
    claimedTiersPremium: integer('claimed_tiers_premium').array().notNull().default([] as number[] as never),
  },
  (t) => ({
    uniq: uniqueIndex('uniq_player_season').on(t.playerId, t.seasonId),
  })
);

export const purchases = pgTable('purchases', {
  id: text('id').primaryKey(),
  playerId: text('player_id').notNull().references(() => players.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull(),
  transactionId: text('transaction_id').notNull().unique(),
  originalTransactionId: text('original_transaction_id'),
  appleSignedPayload: text('apple_signed_payload').notNull(),
  verified: boolean('verified').notNull().default(false),
  purchasedAt: timestamp('purchased_at', { withTimezone: true }).notNull(),
  grantedBytes: bigint('granted_bytes', { mode: 'number' }).notNull().default(0),
  grantedChips: bigint('granted_chips', { mode: 'number' }).notNull().default(0),
  grantedItems: text('granted_items').array().notNull().default([] as string[] as never),
});

export const friendLinks = pgTable(
  'friend_links',
  {
    playerId: text('player_id').notNull().references(() => players.id, { onDelete: 'cascade' }),
    friendPlayerId: text('friend_player_id').notNull().references(() => players.id, { onDelete: 'cascade' }),
    source: text('source').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.playerId, t.friendPlayerId] }) })
);

export const pushTokens = pgTable('push_tokens', {
  id: text('id').primaryKey(),
  playerId: text('player_id').notNull().references(() => players.id, { onDelete: 'cascade' }),
  platform: text('platform').notNull(),
  token: text('token').notNull().unique(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
});

export const leaderboardEntries = pgTable(
  'leaderboard_entries',
  {
    scopeKey: text('scope_key').notNull(),
    playerId: text('player_id').notNull().references(() => players.id, { onDelete: 'cascade' }),
    score: integer('score').notNull(),
    runId: text('run_id').notNull().references(() => runs.id, { onDelete: 'set null' }),
    country: char('country', { length: 2 }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.scopeKey, t.playerId] }),
    sortIdx: index('idx_lb_score_desc').on(t.scopeKey, t.score),
  })
);
