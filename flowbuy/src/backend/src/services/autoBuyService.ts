import Stripe from "stripe";
import { config } from "../config.js";
import { prisma } from "../db.js";
import type { AutoBuyResponse } from "../../../shared/types.js";

/**
 * Simulates an auto-purchase. Triggers only when:
 *   - the user has auto_buy_enabled = true
 *   - the latest recommendation has confidence >= confidenceFloor
 *   - the recommendation was NOT flagged as Anti-Buy
 *   - the primary product price <= user's budgetLimit
 *
 * In test mode (no Stripe key) we record an AUTO_BOUGHT interaction without
 * actually charging. Stripe charge is wrapped so the rest of the flow works
 * even when the call fails.
 */
export async function runAutoBuy(args: {
  userId: string;
  recommendationId?: string;
}): Promise<AutoBuyResponse> {
  const user = await prisma.user.findUnique({ where: { id: args.userId } });
  if (!user) return { triggered: false, reason: "User not found" };
  if (!user.autoBuyEnabled) {
    return { triggered: false, reason: "Auto-buy disabled for user" };
  }

  const rec = args.recommendationId
    ? await prisma.recommendation.findUnique({
        where: { id: args.recommendationId },
        include: { primary: true },
      })
    : await prisma.recommendation.findFirst({
        where: { userId: args.userId },
        orderBy: { createdAt: "desc" },
        include: { primary: true },
      });

  if (!rec) return { triggered: false, reason: "No recommendation to auto-buy" };
  if (rec.antiBuy) {
    return { triggered: false, reason: "Anti-Buy flag set — skipping auto-buy" };
  }
  if (rec.confidence < config.confidenceFloor) {
    return {
      triggered: false,
      reason: `Confidence ${rec.confidence} below floor ${config.confidenceFloor}`,
    };
  }

  const priceNum = Number(rec.primary.price);
  const budget = Number(user.budgetLimit);
  if (priceNum > budget) {
    return {
      triggered: false,
      reason: `Price ${priceNum.toFixed(2)} exceeds budget ${budget.toFixed(2)}`,
    };
  }

  // Stripe in test mode — non-fatal if it fails.
  if (config.stripeSecretKey) {
    try {
      const stripe = new Stripe(config.stripeSecretKey);
      await stripe.paymentIntents.create({
        amount: Math.round(priceNum * 100),
        currency: rec.primary.currency.toLowerCase(),
        description: `FlowBuy auto-buy: ${rec.primary.title}`,
        // In test mode we don't confirm — this just demonstrates the integration.
        capture_method: "manual",
      });
    } catch (err) {
      console.warn("[autoBuyService] Stripe call failed (continuing):", err);
    }
  }

  await prisma.interaction.create({
    data: {
      userId: user.id,
      productId: rec.primaryProductId,
      action: "AUTO_BOUGHT",
      payload: {
        recommendationId: rec.id,
        amount: priceNum,
        currency: rec.primary.currency,
      } as unknown as object,
    },
  });

  return {
    triggered: true,
    reason: "Auto-buy executed",
    productId: rec.primaryProductId,
    amountCharged: priceNum,
  };
}
