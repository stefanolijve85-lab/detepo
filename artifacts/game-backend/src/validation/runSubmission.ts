// src/validation/runSubmission.ts

import { z } from 'zod/v4';

export const runSubmissionSchema = z.object({
  id: z.string().min(8).optional(),
  seed: z.string().regex(/^[0-9a-fA-F]{1,16}$/),
  startedAt: z.coerce.number().int().nonnegative(),
  endedAt: z.coerce.number().int().nonnegative(),
  distanceCm: z.number().int().nonnegative().max(50_000_00),    // 50 km hard cap
  coins: z.number().int().nonnegative().max(100_000),
  score: z.number().int().nonnegative().max(50_000_000),
  comboMax: z.number().int().nonnegative().max(100),
  nearMisses: z.number().int().nonnegative().max(50_000),
  causeOfDeath: z.enum(['crash', 'fall', 'quit', 'revive_failed']),
  biomePath: z.array(z.string()).max(50),
  jetpackTimeMs: z.number().int().nonnegative().max(60 * 60 * 1000),
  clientVersion: z.string().min(1).max(40),
  device: z.string().min(1).max(40),
  powerUpsUsed: z.record(z.string(), z.number().int().nonnegative()).default({}),
  events: z.string().optional(), // base64 CBOR; validated by replayer in v2
}).refine((v) => v.endedAt > v.startedAt, { message: 'endedAt must be after startedAt' });
