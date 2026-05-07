// src/routes/store.ts

import { Router } from 'express';
import { z } from 'zod/v4';
import { db } from '../db/client.js';
import { purchases, players, inventoryItems } from '../db/schema.js';
import { ulid } from '../util/ulid.js';
import { verifyAppleStoreKitJWS } from '../services/storeKit.js';
import { eq, sql } from 'drizzle-orm';

export const storeRouter: Router = Router();

const receiptBody = z.object({
  jws: z.string(),
});

storeRouter.post('/receipt', async (req, res, next) => {
  try {
    const body = receiptBody.parse(req.body);
    const playerId = req.playerId!;
    const verified = await verifyAppleStoreKitJWS(body.jws);
    if (!verified) { res.status(400).json({ code: 'invalid_receipt' }); return; }

    // Idempotent: skip if transactionId already recorded.
    const existing = await db.select().from(purchases).where(eq(purchases.transactionId, verified.transactionId)).limit(1);
    if (existing[0]) { res.json({ ok: true, dedup: true }); return; }

    // Resolve catalog grants. (Production: a typed catalog map keyed by productId.)
    const grant = catalogFor(verified.productId);

    await db.transaction(async (tx) => {
      await tx.insert(purchases).values({
        id: ulid(),
        playerId,
        productId: verified.productId,
        transactionId: verified.transactionId,
        originalTransactionId: verified.originalTransactionId,
        appleSignedPayload: body.jws,
        verified: true,
        purchasedAt: verified.purchasedAt,
        grantedBytes: grant.bytes,
        grantedChips: grant.chips,
        grantedItems: grant.items,
      });
      await tx.update(players).set({
        bytes: sql`${players.bytes} + ${grant.bytes}`,
        chips: sql`${players.chips} + ${grant.chips}`,
      }).where(eq(players.id, playerId));
      for (const catalogId of grant.items) {
        await tx.insert(inventoryItems).values({
          id: ulid(),
          playerId,
          catalogId,
          kind: 'jetpack',                 // production: lookup by catalog
          rarity: 'epic',
          source: 'purchase',
        }).onConflictDoNothing();
      }
    });

    res.json({ ok: true });
  } catch (e) { next(e); }
});

function catalogFor(productId: string): { bytes: number; chips: number; items: string[] } {
  switch (productId) {
    case 'chips_pack_xs': return { bytes: 0, chips: 80, items: [] };
    case 'chips_pack_sm': return { bytes: 0, chips: 450, items: [] };
    case 'chips_pack_md': return { bytes: 0, chips: 950, items: [] };
    case 'chips_pack_lg': return { bytes: 0, chips: 2100, items: [] };
    case 'chips_pack_xl': return { bytes: 0, chips: 5800, items: [] };
    case 'bytes_pack_sm': return { bytes: 25_000, chips: 0, items: [] };
    case 'bytes_pack_md': return { bytes: 80_000, chips: 0, items: [] };
    case 'starter_pack_v1': return { bytes: 5_000, chips: 250, items: ['glv_neon_pulse'] };
    case 'battlepass_premium': return { bytes: 0, chips: 0, items: ['bp_premium_active'] };
    default: return { bytes: 0, chips: 0, items: [] };
  }
}
