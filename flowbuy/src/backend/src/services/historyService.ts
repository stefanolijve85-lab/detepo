import { prisma } from "../db.js";

const RECENT_LIMIT = 50;

export interface UserHistory {
  recentSkippedIds: string[];
  recentBoughtIds: string[];
}

export async function loadUserHistory(userId: string): Promise<UserHistory> {
  const rows = await prisma.interaction.findMany({
    where: {
      userId,
      action: { in: ["SWIPE_SKIP", "SWIPE_BUY", "BUY", "AUTO_BOUGHT"] },
      productId: { not: null },
    },
    orderBy: { createdAt: "desc" },
    take: RECENT_LIMIT,
    select: { productId: true, action: true },
  });

  const recentSkippedIds: string[] = [];
  const recentBoughtIds: string[] = [];
  for (const r of rows) {
    if (!r.productId) continue;
    if (r.action === "SWIPE_SKIP") recentSkippedIds.push(r.productId);
    else recentBoughtIds.push(r.productId);
  }
  return { recentSkippedIds, recentBoughtIds };
}
