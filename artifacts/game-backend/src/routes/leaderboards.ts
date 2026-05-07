// src/routes/leaderboards.ts

import { Router } from 'express';
import { redis, isoWeekKey } from '../services/redis.js';
import { db } from '../db/client.js';
import { players } from '../db/schema.js';
import { inArray } from 'drizzle-orm';

export const leaderboardsRouter: Router = Router();

async function topAndMe(scopeKey: string, viewerId: string, limit = 100): Promise<{
  entries: Array<{ rank: number; playerId: string; displayName: string; score: number; country: string | null; equippedJetpackId: string | null }>;
  myRank: number | null;
}> {
  // Top-N
  const top = await redis.zrevrange(scopeKey, 0, limit - 1, 'WITHSCORES');
  const entries: { rank: number; playerId: string; score: number }[] = [];
  for (let i = 0; i < top.length; i += 2) {
    entries.push({ rank: i / 2 + 1, playerId: top[i]!, score: Number(top[i + 1]) });
  }
  // Hydrate display names + country.
  const ids = entries.map((e) => e.playerId);
  const playerRows = ids.length
    ? await db.select({ id: players.id, displayName: players.displayName, country: players.country }).from(players).where(inArray(players.id, ids))
    : [];
  const map = new Map(playerRows.map((p) => [p.id, p]));
  const hydrated = entries.map((e) => ({
    rank: e.rank,
    playerId: e.playerId,
    displayName: map.get(e.playerId)?.displayName ?? 'Runner',
    score: e.score,
    country: map.get(e.playerId)?.country ?? null,
    equippedJetpackId: null,
  }));
  // Viewer's rank (may be > top-N).
  const myRankRaw = await redis.zrevrank(scopeKey, viewerId);
  const myRank = myRankRaw === null ? null : myRankRaw + 1;
  return { entries: hydrated, myRank };
}

leaderboardsRouter.get('/global', async (req, res, next) => {
  try {
    const result = await topAndMe('lb:global:all', req.playerId!);
    res.json(result);
  } catch (e) { next(e); }
});

leaderboardsRouter.get('/weekly', async (req, res, next) => {
  try {
    const key = `lb:weekly:${isoWeekKey()}`;
    const result = await topAndMe(key, req.playerId!);
    res.json(result);
  } catch (e) { next(e); }
});

leaderboardsRouter.get('/country/:iso', async (req, res, next) => {
  try {
    const iso = req.params.iso.toUpperCase().slice(0, 2);
    const key = `lb:country:${iso}:${isoWeekKey()}`;
    const result = await topAndMe(key, req.playerId!);
    res.json(result);
  } catch (e) { next(e); }
});

leaderboardsRouter.get('/friends', async (req, res, next) => {
  try {
    // Viewer must POST /friends/sync from Game Center first; we read the cached
    // edges here and ZSCORE each. Stub returns empty list.
    res.json({ entries: [], myRank: null });
  } catch (e) { next(e); }
});
