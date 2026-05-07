// src/services/leaderboard.ts
//
// Multi-scope ZADD using GT semantics (only update if greater than current).

import { redis, isoWeekKey } from './redis.js';

export interface LeaderboardUpdateInput {
  playerId: string;
  country: string;
  score: number;
  runId: string;
}

export interface LeaderboardRanks {
  global: number | null;
  country: number | null;
  weekly: number | null;
}

export async function applyLeaderboardUpdate(input: LeaderboardUpdateInput): Promise<LeaderboardRanks> {
  const week = isoWeekKey();
  const tx = redis.multi();
  tx.zadd('lb:global:all', 'GT', input.score, input.playerId);
  tx.zadd(`lb:weekly:${week}`, 'GT', input.score, input.playerId);
  tx.zadd(`lb:country:${input.country}:${week}`, 'GT', input.score, input.playerId);
  await tx.exec();

  const [global, country, weekly] = await Promise.all([
    redis.zrevrank('lb:global:all', input.playerId),
    redis.zrevrank(`lb:country:${input.country}:${week}`, input.playerId),
    redis.zrevrank(`lb:weekly:${week}`, input.playerId),
  ]);

  return {
    global: global === null ? null : global + 1,
    country: country === null ? null : country + 1,
    weekly: weekly === null ? null : weekly + 1,
  };
}
