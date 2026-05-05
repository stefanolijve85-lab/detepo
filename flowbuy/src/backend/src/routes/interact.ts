import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "../db.js";

const bodySchema = z.object({
  userId: z.string().min(1),
  productId: z.string().optional(),
  recommendationId: z.string().optional(),
  action: z.enum([
    "SWIPE_SKIP",
    "SWIPE_BUY",
    "BUY",
    "ANTI_BUY_SHOWN",
    "ALT_CHOSEN",
    "AUTO_BOUGHT",
    "IMPRESSION",
  ]),
  payload: z.record(z.unknown()).optional(),
});

export const interactRouter = Router();

interactRouter.post("/interact", async (req: Request, res: Response) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { userId, productId, recommendationId, action, payload } = parsed.data;

  const interaction = await prisma.interaction.create({
    data: {
      userId,
      productId: productId ?? null,
      action,
      payload: { ...(payload ?? {}), recommendationId } as unknown as object,
    },
  });

  res.status(201).json({ id: interaction.id, createdAt: interaction.createdAt });
});
