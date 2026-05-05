import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { runAutoBuy } from "../services/autoBuyService.js";

const bodySchema = z.object({
  userId: z.string().min(1),
  recommendationId: z.string().optional(),
});

export const autoBuyRouter = Router();

autoBuyRouter.post("/auto-buy", async (req: Request, res: Response) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const result = await runAutoBuy(parsed.data);
  res.status(result.triggered ? 200 : 202).json(result);
});
