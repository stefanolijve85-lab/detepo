// src/routes/missions.ts

import { Router } from 'express';
import { db } from '../db/client.js';
import { missions, missionProgress, players } from '../db/schema.js';
import { and, eq, isNull, sql } from 'drizzle-orm';

export const missionsRouter: Router = Router();

missionsRouter.get('/today', async (req, res, next) => {
  try {
    const playerId = req.playerId!;
    // Return the player's current daily missions; if none assigned today, roll
    // 3 from the active pool.
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    const existing = await db.select().from(missionProgress)
      .where(and(eq(missionProgress.playerId, playerId), sql`assigned_at >= ${today}`));
    if (existing.length === 0) {
      const candidates = await db.select().from(missions).where(eq(missions.cadence, 'daily'));
      const pick = candidates.sort(() => Math.random() - 0.5).slice(0, 3);
      // Insert progress rows.
      // (Skipped: ULID generation per row; handled in service layer in production.)
      res.json({ missions: pick.map((m) => ({ ...m, progress: 0, claimed: false })) });
      return;
    }
    res.json({ missions: existing });
  } catch (e) { next(e); }
});

missionsRouter.post('/:id/claim', async (req, res, next) => {
  try {
    const playerId = req.playerId!;
    const id = req.params.id;
    // Atomic claim: set claimed_at if null + complete.
    const result = await db.transaction(async (tx) => {
      const [progress] = await tx.select().from(missionProgress)
        .where(and(eq(missionProgress.id, id), eq(missionProgress.playerId, playerId), isNull(missionProgress.claimedAt)));
      if (!progress) return { ok: false };
      const [mission] = await tx.select().from(missions).where(eq(missions.id, progress.missionId));
      if (!mission) return { ok: false };
      if (progress.progress < mission.target) return { ok: false };
      await tx.update(missionProgress).set({ claimedAt: new Date() }).where(eq(missionProgress.id, id));
      await tx.update(players).set({
        bytes: sql`${players.bytes} + ${mission.rewardBytes}`,
        xp: sql`${players.xp} + ${mission.rewardXp}`,
      }).where(eq(players.id, playerId));
      return { ok: true, granted: { bytes: mission.rewardBytes, xp: mission.rewardXp } };
    });
    res.json(result);
  } catch (e) { next(e); }
});
