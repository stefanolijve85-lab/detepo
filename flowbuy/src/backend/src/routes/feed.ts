import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { fetchUserContext } from "../services/contextService.js";
import { loadUserHistory } from "../services/historyService.js";
import { loadCandidatePool } from "../services/productService.js";
import { runOrchestrator } from "../services/aiService.js";
import type { FeedResponse } from "../../../shared/types.js";

const querySchema = z.object({
  userId: z.string().min(1),
  lat: z.coerce.number().optional(),
  lon: z.coerce.number().optional(),
  city: z.string().optional(),
});

export const feedRouter = Router();

feedRouter.get("/feed", async (req: Request, res: Response) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { userId, lat, lon, city } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: "User not found" });

  const [context, history] = await Promise.all([
    fetchUserContext({ userId, lat, lon, city }),
    loadUserHistory(userId),
  ]);

  const candidates = await loadCandidatePool({
    budgetLimit: Number(user.budgetLimit),
    excludeIds: history.recentBoughtIds,
    limit: 12,
  });

  const result = await runOrchestrator({
    userId,
    context,
    candidates,
    recentSkippedIds: history.recentSkippedIds,
    recentBoughtIds: history.recentBoughtIds,
    preferences: (user.preferences ?? {}) as Record<string, unknown>,
    budgetLimit: Number(user.budgetLimit),
  });

  let recommendationId: string | null = null;
  if (result.primary) {
    const rec = await prisma.recommendation.create({
      data: {
        userId,
        primaryProductId: result.primary.id,
        confidence: result.confidence,
        reasoningShort: result.reasoningShort,
        antiBuy: result.antiBuy.triggered,
        antiBuyReason: result.antiBuy.warning,
        contextSnapshot: context as unknown as object,
        alternatives: { connect: result.alternatives.map((a) => ({ id: a.id })) },
      },
    });
    recommendationId = rec.id;

    // Track impressions and anti-buy displays as part of the learning loop.
    await prisma.interaction.createMany({
      data: [
        {
          userId,
          productId: result.primary.id,
          action: "IMPRESSION",
          payload: { recommendationId, confidence: result.confidence } as unknown as object,
        },
        ...(result.antiBuy.triggered
          ? [
              {
                userId,
                productId: result.primary.id,
                action: "ANTI_BUY_SHOWN" as const,
                payload: {
                  recommendationId,
                  warning: result.antiBuy.warning,
                } as unknown as object,
              },
            ]
          : []),
      ],
    });
  }

  const body: FeedResponse = {
    primary: result.primary,
    alternatives: result.alternatives,
    confidence: result.confidence,
    reasoningShort: result.reasoningShort,
    antiBuy: result.antiBuy,
    decisionKill: result.decisionKill,
    recommendationId,
    context,
  };
  res.json(body);
});
