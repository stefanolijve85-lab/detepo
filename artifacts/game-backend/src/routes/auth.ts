// src/routes/auth.ts

import { Router } from 'express';
import { z } from 'zod/v4';
import { db } from '../db/client.js';
import { players } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { issueToken } from '../middleware/auth.js';
import { ulid } from '../util/ulid.js';

export const authRouter: Router = Router();

const guestBody = z.object({
  country: z.string().length(2).optional(),
  displayName: z.string().min(1).max(20).optional(),
});

authRouter.post('/guest', async (req, res, next) => {
  try {
    const body = guestBody.parse(req.body ?? {});
    const id = ulid();
    await db.insert(players).values({
      id,
      displayName: body.displayName ?? 'Runner',
      country: (body.country ?? 'US').toUpperCase().slice(0, 2),
    });
    const token = await issueToken(id);
    res.json({ playerId: id, token });
  } catch (e) { next(e); }
});

const appleBody = z.object({
  identityToken: z.string(),
  appleSub: z.string(),                    // verified server-side from JWS in production
  displayName: z.string().min(1).max(20).optional(),
});

authRouter.post('/apple', async (req, res, next) => {
  try {
    const body = appleBody.parse(req.body);
    // Look for an existing player by apple_sub.
    const existing = await db.select().from(players).where(eq(players.appleSub, body.appleSub)).limit(1);
    let id: string;
    if (existing[0]) {
      id = existing[0].id;
    } else {
      id = ulid();
      await db.insert(players).values({
        id,
        displayName: body.displayName ?? 'Runner',
        country: 'US',
        appleSub: body.appleSub,
      });
    }
    const token = await issueToken(id);
    res.json({ playerId: id, token });
  } catch (e) { next(e); }
});
