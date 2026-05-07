// src/services/runValidator.ts
//
// Replays the run from `seed + event_log` (or, for v0, from the structured
// summary) and recomputes the canonical score using the SAME formula as the
// iOS client (NeonRunner/Game/Score/ScoreSystem.swift).
//
// In v2 this becomes a Rust+WASM kernel shared with the client. For v1 it is
// hand-ported TypeScript with deterministic math.

import type { z } from 'zod/v4';
import type { runSubmissionSchema } from '../validation/runSubmission.js';

// Tolerance windows.
const SCORE_TOLERANCE = 0.03;
const DISTANCE_TOLERANCE = 0.01;

// Same constants as Swift's ScoreSystem. Keep these in lockstep with the client!
const K_DISTANCE = 6.0;
const K_COIN = 5.0;
const K_CHIP = 50.0;
const K_COMBO_TIER = 50.0;
const K_NEAR_MISS = 25.0;
const K_AIR = 12.0;
const K_JETPACK = 18.0;

export interface RunValidationResult {
  valid: boolean;
  canonicalScore: number;
  reason?: string;
}

export async function validateRun(submission: z.infer<typeof runSubmissionSchema>): Promise<RunValidationResult> {
  // 1. Recompute canonical score from accepted facts (distance, coins, combo,
  //    near misses, jetpack time). Power-up multipliers are not auditable from
  //    the summary alone — they will be in the event log replay (v2).
  const distanceM = submission.distanceCm / 100;
  const raw =
    K_DISTANCE * distanceM
  + K_COIN     * submission.coins
  + K_COMBO_TIER * submission.comboMax
  + K_NEAR_MISS  * submission.nearMisses
  + K_AIR        * 0
  + K_JETPACK    * (submission.jetpackTimeMs / 1000);

  const canonical = Math.floor(raw);

  // 2. Sanity heuristics.
  const durationS = (submission.endedAt - submission.startedAt) / 1000;
  const maxDistance = durationS * 28; // theoretical max if at v_max for whole run
  if (distanceM > maxDistance * 1.05) {
    return { valid: false, canonicalScore: canonical, reason: 'distance_exceeds_max' };
  }
  const maxCoins = distanceM / 0.8;
  if (submission.coins > maxCoins * 1.3) {
    return { valid: false, canonicalScore: canonical, reason: 'too_many_coins' };
  }

  // 3. Compare to client claim.
  const ratio = submission.score / Math.max(1, canonical);
  if (Math.abs(ratio - 1) > SCORE_TOLERANCE) {
    return { valid: false, canonicalScore: canonical, reason: 'score_mismatch' };
  }

  return { valid: true, canonicalScore: canonical };
}

export const _internalConstants = { SCORE_TOLERANCE, DISTANCE_TOLERANCE };
