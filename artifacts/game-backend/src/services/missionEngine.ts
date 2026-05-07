// src/services/missionEngine.ts

import { db } from '../db/client.js';
import { missionProgress, missions } from '../db/schema.js';
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { z } from 'zod/v4';
import type { runSubmissionSchema } from '../validation/runSubmission.js';

interface Reward { kind: string; amount: number; catalogId?: string }

export async function applyMissionProgress(playerId: string, run: z.infer<typeof runSubmissionSchema>): Promise<Reward[]> {
  // Walk active mission rows for this player and bump progress based on the
  // `kind` field. Only daily missions are scored against per-run metrics.
  const rows = await db.select().from(missionProgress).where(
    and(eq(missionProgress.playerId, playerId), isNull(missionProgress.claimedAt))
  );
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.missionId);
  const tmpls = await db.select().from(missions).where(
    sql`${missions.id} = ANY(${ids})`
  );
  const tmplById = new Map(tmpls.map((t) => [t.id, t]));
  const rewards: Reward[] = [];
  for (const row of rows) {
    const tmpl = tmplById.get(row.missionId);
    if (!tmpl) continue;
    const delta = metricFor(tmpl.kind, run);
    if (delta <= 0) continue;
    const newProgress = Math.min(tmpl.target, row.progress + delta);
    if (newProgress === row.progress) continue;
    await db.update(missionProgress).set({ progress: newProgress }).where(eq(missionProgress.id, row.id));
  }
  return rewards;
}

function metricFor(kind: string, run: z.infer<typeof runSubmissionSchema>): number {
  switch (kind) {
    case 'distance': return Math.floor(run.distanceCm / 100);
    case 'coins': return run.coins;
    case 'combo': return run.comboMax;
    case 'near_miss': return run.nearMisses;
    case 'jetpack_time': return Math.floor(run.jetpackTimeMs / 1000);
    case 'slide_distance': return 0; // requires event log; v2
    default: return 0;
  }
}
