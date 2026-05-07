// src/routes/profile.ts

import { Router } from 'express';
import { z } from 'zod/v4';
import { db } from '../db/client.js';
import { players, inventoryItems, missionProgress, missions } from '../db/schema.js';
import { and, eq } from 'drizzle-orm';

export const profileRouter: Router = Router();

profileRouter.get('/me', async (req, res, next) => {
  try {
    const playerId = req.playerId!;
    const [player] = await db.select().from(players).where(eq(players.id, playerId));
    if (!player) { res.status(404).json({ code: 'not_found' }); return; }
    const inventory = await db.select().from(inventoryItems).where(eq(inventoryItems.playerId, playerId));
    res.json({
      player,
      inventory,
    });
  } catch (e) { next(e); }
});

const patchBody = z.object({
  displayName: z.string().min(1).max(20).optional(),
  country: z.string().length(2).optional(),
  equipped: z.object({ catalogId: z.string(), kind: z.string() }).optional(),
});

profileRouter.patch('/me', async (req, res, next) => {
  try {
    const body = patchBody.parse(req.body);
    const playerId = req.playerId!;
    if (body.displayName || body.country) {
      await db.update(players)
        .set({
          displayName: body.displayName,
          country: body.country?.toUpperCase().slice(0, 2),
          updatedAt: new Date(),
        })
        .where(eq(players.id, playerId));
    }
    if (body.equipped) {
      await db.transaction(async (tx) => {
        await tx.update(inventoryItems)
          .set({ equipped: false })
          .where(and(eq(inventoryItems.playerId, playerId), eq(inventoryItems.kind, body.equipped!.kind)));
        await tx.update(inventoryItems)
          .set({ equipped: true })
          .where(and(
            eq(inventoryItems.playerId, playerId),
            eq(inventoryItems.catalogId, body.equipped!.catalogId)
          ));
      });
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});
