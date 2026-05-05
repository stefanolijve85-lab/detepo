import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "../db.js";

const updateSchema = z.object({
  budgetLimit: z.number().positive().optional(),
  autoBuyEnabled: z.boolean().optional(),
  preferences: z.record(z.unknown()).optional(),
});

export const usersRouter = Router();

usersRouter.get("/users/:id", async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    budgetLimit: Number(user.budgetLimit),
    autoBuyEnabled: user.autoBuyEnabled,
    preferences: user.preferences,
  });
});

usersRouter.patch("/users/:id", async (req: Request, res: Response) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      ...(parsed.data.budgetLimit !== undefined && { budgetLimit: parsed.data.budgetLimit }),
      ...(parsed.data.autoBuyEnabled !== undefined && {
        autoBuyEnabled: parsed.data.autoBuyEnabled,
      }),
      ...(parsed.data.preferences !== undefined && {
        preferences: parsed.data.preferences as unknown as object,
      }),
    },
  });
  res.json({
    id: user.id,
    budgetLimit: Number(user.budgetLimit),
    autoBuyEnabled: user.autoBuyEnabled,
    preferences: user.preferences,
  });
});
