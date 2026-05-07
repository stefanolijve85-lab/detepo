// src/routes/battlepass.ts

import { Router } from 'express';
import { db } from '../db/client.js';
import { battlepassSeasons, battlepassProgress, players } from '../db/schema.js';
import { and, eq, sql } from 'drizzle-orm';

export const battlepassRouter: Router = Router();

battlepassRouter.get('/season/current', async (req, res, next) => {
  try {
    const now = new Date();
    const [season] = await db.select().from(battlepassSeasons)
      .where(and(sql`starts_at <= ${now}`, sql`ends_at >= ${now}`))
      .limit(1);
    if (!season) { res.json({ season: null }); return; }
    const [progress] = await db.select().from(battlepassProgress)
      .where(and(eq(battlepassProgress.playerId, req.playerId!), eq(battlepassProgress.seasonId, season.id)));
    res.json({ season, progress: progress ?? null });
  } catch (e) { next(e); }
});

battlepassRouter.post('/claim/:tier', async (req, res, next) => {
  try {
    const tier = Number(req.params.tier);
    if (!Number.isInteger(tier)) { res.status(400).json({ code: 'bad_tier' }); return; }
    const playerId = req.playerId!;
    const result = await db.transaction(async (tx) => {
      const now = new Date();
      const [season] = await tx.select().from(battlepassSeasons)
        .where(and(sql`starts_at <= ${now}`, sql`ends_at >= ${now}`)).limit(1);
      if (!season) return { ok: false, code: 'no_season' as const };
      const [progress] = await tx.select().from(battlepassProgress)
        .where(and(eq(battlepassProgress.playerId, playerId), eq(battlepassProgress.seasonId, season.id)));
      if (!progress || progress.tier < tier) return { ok: false, code: 'tier_locked' as const };
      const claimed = (progress.isPremium ? progress.claimedTiersPremium : progress.claimedTiersFree) as unknown as number[];
      if (claimed.includes(tier)) return { ok: false, code: 'already_claimed' as const };
      const tiers = season.tiersJson as Array<{ tier: number; freeReward?: { bytes?: number; chips?: number; itemCatalogId?: string }; premiumReward?: { bytes?: number; chips?: number; itemCatalogId?: string } }>;
      const meta = tiers.find((t) => t.tier === tier);
      const reward = progress.isPremium ? (meta?.premiumReward ?? meta?.freeReward) : meta?.freeReward;
      if (!reward) return { ok: false, code: 'no_reward' as const };
      await tx.update(players).set({
        bytes: sql`${players.bytes} + ${reward.bytes ?? 0}`,
        chips: sql`${players.chips} + ${reward.chips ?? 0}`,
      }).where(eq(players.id, playerId));
      const next = [...claimed, tier];
      await tx.update(battlepassProgress).set({
        claimedTiersFree: progress.isPremium ? progress.claimedTiersFree as unknown as number[] : next,
        claimedTiersPremium: progress.isPremium ? next : progress.claimedTiersPremium as unknown as number[],
      }).where(eq(battlepassProgress.id, progress.id));
      return { ok: true, granted: reward };
    });
    res.json(result);
  } catch (e) { next(e); }
});
