// src/services/battlepassEngine.ts

import { db } from '../db/client.js';
import { battlepassSeasons, battlepassProgress, players } from '../db/schema.js';
import { and, eq, sql } from 'drizzle-orm';
import { ulid } from '../util/ulid.js';

interface Reward { kind: string; amount: number; catalogId?: string }

export async function applyBattlePassXP(playerId: string, score: number): Promise<Reward[]> {
  const xp = Math.max(0, Math.floor(score / 80));
  if (xp === 0) return [];
  const now = new Date();
  const [season] = await db.select().from(battlepassSeasons)
    .where(and(sql`starts_at <= ${now}`, sql`ends_at >= ${now}`)).limit(1);
  if (!season) return [];

  await db.transaction(async (tx) => {
    const [progress] = await tx.select().from(battlepassProgress)
      .where(and(eq(battlepassProgress.playerId, playerId), eq(battlepassProgress.seasonId, season.id)));
    if (!progress) {
      await tx.insert(battlepassProgress).values({
        id: ulid(),
        playerId,
        seasonId: season.id,
        bpXp: xp,
        tier: Math.floor(xp / season.xpPerTier),
      });
    } else {
      const newXp = progress.bpXp + xp;
      await tx.update(battlepassProgress).set({
        bpXp: newXp,
        tier: Math.floor(newXp / season.xpPerTier),
      }).where(eq(battlepassProgress.id, progress.id));
    }
    // Bump player XP (which feeds Player Level).
    await tx.update(players).set({ xp: sql`${players.xp} + ${xp}` }).where(eq(players.id, playerId));
  });

  return [{ kind: 'bp_xp', amount: xp }];
}
