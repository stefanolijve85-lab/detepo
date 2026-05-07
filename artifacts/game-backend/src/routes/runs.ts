// src/routes/runs.ts
//
// POST /runs receives a finished run, validates it, writes it to Postgres, and
// updates Redis leaderboards. Validation is deferred to the run validator
// service which deterministically replays the run from seed + event log.

import { Router } from 'express';
import { runSubmissionSchema } from '../validation/runSubmission.js';
import { db } from '../db/client.js';
import { runs, players, leaderboardEntries } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { validateRun } from '../services/runValidator.js';
import { applyLeaderboardUpdate } from '../services/leaderboard.js';
import { applyMissionProgress } from '../services/missionEngine.js';
import { applyBattlePassXP } from '../services/battlepassEngine.js';
import { ulid } from '../util/ulid.js';

export const runsRouter: Router = Router();

runsRouter.post('/', async (req, res, next) => {
  try {
    const playerId = req.playerId!;
    const submission = runSubmissionSchema.parse(req.body);

    // 1. Validate (replays the run; expensive enough that we may async-defer
    //    to a worker queue in production. For now, inline for clarity.)
    const validation = await validateRun(submission);
    const flagged = !validation.valid;

    // 2. Persist canonical run.
    const runId = submission.id ?? ulid();
    await db.insert(runs).values({
      id: runId,
      playerId,
      seed: submission.seed,
      startedAt: new Date(submission.startedAt),
      endedAt: new Date(submission.endedAt),
      durationMs: submission.endedAt - submission.startedAt,
      distanceCm: submission.distanceCm,
      coins: submission.coins,
      score: validation.canonicalScore,
      scoreClient: submission.score,
      comboMax: submission.comboMax,
      nearMisses: submission.nearMisses,
      causeOfDeath: submission.causeOfDeath,
      biomePath: submission.biomePath,
      clientVersion: submission.clientVersion,
      deviceModel: submission.device,
      validated: !flagged,
      flagged,
    });

    // 3. Update leaderboards if not flagged.
    let rankGlobal: number | null = null;
    let rankCountry: number | null = null;
    if (!flagged) {
      const [player] = await db.select().from(players).where(eq(players.id, playerId));
      if (player) {
        const ranks = await applyLeaderboardUpdate({
          playerId,
          country: player.country,
          score: validation.canonicalScore,
          runId,
        });
        rankGlobal = ranks.global;
        rankCountry = ranks.country;
        // Mirror to Postgres for cold reads.
        await db.insert(leaderboardEntries).values({
          scopeKey: 'global:all',
          playerId,
          score: validation.canonicalScore,
          runId,
          country: player.country,
        }).onConflictDoUpdate({
          target: [leaderboardEntries.scopeKey, leaderboardEntries.playerId],
          set: { score: validation.canonicalScore, runId, updatedAt: new Date() },
          setWhere: undefined,
        }).catch(() => {});
      }
    } else {
      // Soft-flag the player.
      await db.update(players)
        .set({ cheatFlags: (await db.select().from(players).where(eq(players.id, playerId)))[0].cheatFlags + 1 })
        .where(eq(players.id, playerId));
    }

    // 4. Mission + battle-pass progress (always credited, even on flagged runs?
    //    No — flagged runs do not credit progression. This is by design.)
    const rewards: Array<{ kind: string; amount: number; catalogId?: string }> = [];
    if (!flagged) {
      rewards.push(...(await applyMissionProgress(playerId, submission)));
      rewards.push(...(await applyBattlePassXP(playerId, validation.canonicalScore)));
    }

    res.status(202).json({
      runId,
      scoreCanonical: validation.canonicalScore,
      rankGlobal,
      rankCountry,
      rewards,
      flagged,
    });
  } catch (e) { next(e); }
});
