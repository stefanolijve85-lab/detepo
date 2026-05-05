import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  shouldSkip,
  startTestServer,
  resetDb,
  disconnect,
  type TestServer,
} from "./setup.js";
import { prisma } from "../../src/db.js";
import type { FeedResponse, AutoBuyResponse } from "../../../shared/types.js";

const skipState = shouldSkip();
if (skipState.skip) {
  console.log("[integration] " + skipState.reason);
}
const skip = skipState.skip;

let server: TestServer;
let userId = "demo-user";

before(async () => {
  if (skip) return;
  server = await startTestServer();
});

after(async () => {
  if (skip) return;
  await server.close();
  await disconnect();
});

beforeEach(async () => {
  if (skip) return;
  ({ userId } = await resetDb());
});

// /health -----------------------------------------------------------------

test("GET /health returns ok and reports mode flags", { skip }, async () => {
  const r = await server.http<{ ok: boolean; mode: { mockAi: boolean; mockWeather: boolean } }>(
    "/health",
  );
  assert.equal(r.ok, true);
  assert.equal(typeof r.mode.mockAi, "boolean");
  assert.equal(typeof r.mode.mockWeather, "boolean");
});

// /feed -------------------------------------------------------------------

test("GET /feed without userId returns 400", { skip }, async () => {
  const res = await server.rawFetch("/feed");
  assert.equal(res.status, 400);
});

test("GET /feed for unknown user returns 404", { skip }, async () => {
  const res = await server.rawFetch("/feed?userId=ghost-user");
  assert.equal(res.status, 404);
});

test(
  "GET /feed returns a primary recommendation, persists Recommendation + IMPRESSION",
  { skip },
  async () => {
    const r = await server.http<FeedResponse>(`/feed?userId=${userId}`);
    assert.ok(r.primary, "expected a primary recommendation");
    assert.ok(r.recommendationId, "expected a persisted recommendationId");
    assert.equal(r.decisionKill, false);
    assert.ok(r.confidence >= 70);

    const recCount = await prisma.recommendation.count();
    assert.equal(recCount, 1);

    const impressions = await prisma.interaction.count({
      where: { action: "IMPRESSION" },
    });
    assert.equal(impressions, 1);
  },
);

test(
  "GET /feed forwards lat/lon/city to context and persists a UserContext row",
  { skip },
  async () => {
    await server.http<FeedResponse>(
      `/feed?userId=${userId}&lat=48.8566&lon=2.3522&city=Paris`,
    );
    const ctx = await prisma.userContext.findFirst({ orderBy: { createdAt: "desc" } });
    assert.equal(ctx?.city, "Paris");
    assert.equal(ctx?.lat, 48.8566);
    assert.equal(ctx?.lon, 2.3522);
  },
);

test(
  "GET /feed produces Anti-Buy when only the overpriced product is left",
  { skip },
  async () => {
    // Mark every product except RAIN-002 as bought so the candidate pool
    // shrinks to just the rigged Anti-Buy fixture.
    const products = await prisma.product.findMany({
      where: { sku: { not: "RAIN-002" } },
    });
    for (const p of products) {
      await server.http("/interact", {
        method: "POST",
        body: JSON.stringify({ userId, productId: p.id, action: "BUY" }),
      });
    }

    const r = await server.http<FeedResponse>(`/feed?userId=${userId}`);
    assert.equal(r.primary?.sku, "RAIN-002");
    assert.equal(r.antiBuy.triggered, true);
    assert.match(r.antiBuy.warning!, /6-month average/);

    const antiBuyShown = await prisma.interaction.count({
      where: { action: "ANTI_BUY_SHOWN" },
    });
    assert.equal(antiBuyShown, 1);
  },
);

// /interact ---------------------------------------------------------------

test("POST /interact persists each action and round-trips the recommendationId", { skip }, async () => {
  const feed = await server.http<FeedResponse>(`/feed?userId=${userId}`);
  const r = await server.http<{ id: string; createdAt: string }>("/interact", {
    method: "POST",
    body: JSON.stringify({
      userId,
      productId: feed.primary!.id,
      recommendationId: feed.recommendationId,
      action: "SWIPE_BUY",
    }),
  });
  assert.ok(r.id);

  const row = await prisma.interaction.findUnique({ where: { id: r.id } });
  assert.equal(row?.action, "SWIPE_BUY");
  const payload = row!.payload as { recommendationId?: string };
  assert.equal(payload.recommendationId, feed.recommendationId);
});

test("POST /interact rejects unknown actions with 400", { skip }, async () => {
  const res = await server.rawFetch("/interact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, action: "WAVE_HELLO" }),
  });
  assert.equal(res.status, 400);
});

// /auto-buy ---------------------------------------------------------------

test(
  "POST /auto-buy refuses when auto_buy is off (default)",
  { skip },
  async () => {
    await server.http<FeedResponse>(`/feed?userId=${userId}`);
    const r = await server.http<AutoBuyResponse>("/auto-buy", {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
    assert.equal(r.triggered, false);
    assert.match(r.reason, /disabled/i);
  },
);

test(
  "POST /auto-buy fires + records AUTO_BOUGHT once auto_buy is enabled",
  { skip },
  async () => {
    const feed = await server.http<FeedResponse>(`/feed?userId=${userId}`);
    assert.ok(feed.primary);

    await server.http(`/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ autoBuyEnabled: true }),
    });

    const r = await server.http<AutoBuyResponse>("/auto-buy", {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
    assert.equal(r.triggered, true);
    assert.equal(r.productId, feed.primary!.id);
    assert.equal(r.amountCharged, feed.primary!.price);

    const auto = await prisma.interaction.count({
      where: { action: "AUTO_BOUGHT" },
    });
    assert.equal(auto, 1);
  },
);

test(
  "POST /auto-buy refuses on Anti-Buy recommendations even when enabled",
  { skip },
  async () => {
    // Drive the catalog down to RAIN-002 (Anti-Buy fixture) again.
    const products = await prisma.product.findMany({
      where: { sku: { not: "RAIN-002" } },
    });
    for (const p of products) {
      await server.http("/interact", {
        method: "POST",
        body: JSON.stringify({ userId, productId: p.id, action: "BUY" }),
      });
    }
    const feed = await server.http<FeedResponse>(`/feed?userId=${userId}`);
    assert.equal(feed.antiBuy.triggered, true);

    await server.http(`/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ autoBuyEnabled: true }),
    });

    const r = await server.http<AutoBuyResponse>("/auto-buy", {
      method: "POST",
      body: JSON.stringify({ userId, recommendationId: feed.recommendationId }),
    });
    assert.equal(r.triggered, false);
    assert.match(r.reason, /Anti-Buy/i);
  },
);

test(
  "POST /auto-buy refuses when the product is over budget",
  { skip },
  async () => {
    // Lower the budget below every product so eligibility fails. /feed will
    // Decision-Kill, so create a cheap recommendation first, then lower
    // the budget.
    const feed = await server.http<FeedResponse>(`/feed?userId=${userId}`);
    assert.ok(feed.primary);
    const cheapPrice = feed.primary!.price;

    await server.http(`/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({
        autoBuyEnabled: true,
        budgetLimit: cheapPrice - 0.01,
      }),
    });

    const r = await server.http<AutoBuyResponse>("/auto-buy", {
      method: "POST",
      body: JSON.stringify({ userId, recommendationId: feed.recommendationId }),
    });
    assert.equal(r.triggered, false);
    assert.match(r.reason, /budget/i);
  },
);

// /users ------------------------------------------------------------------

test("GET /users/:id returns the seeded user shape", { skip }, async () => {
  const u = await server.http<{
    id: string;
    email: string;
    budgetLimit: number;
    autoBuyEnabled: boolean;
    preferences: Record<string, unknown>;
  }>(`/users/${userId}`);
  assert.equal(u.id, userId);
  assert.equal(u.email, "demo@flowbuy.app");
  assert.equal(typeof u.budgetLimit, "number");
  assert.equal(u.autoBuyEnabled, false);
});

test("PATCH /users/:id updates budget, autoBuy, and preferences", { skip }, async () => {
  const u = await server.http<{ budgetLimit: number; autoBuyEnabled: boolean; preferences: any }>(
    `/users/${userId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        budgetLimit: 99.99,
        autoBuyEnabled: true,
        preferences: { priceDropAlertsEnabled: true, sizes: { top: "L" } },
      }),
    },
  );
  assert.equal(u.budgetLimit, 99.99);
  assert.equal(u.autoBuyEnabled, true);
  assert.equal(u.preferences.priceDropAlertsEnabled, true);
  assert.equal(u.preferences.sizes.top, "L");
});

test("PATCH /users/:id rejects negative budget with 400", { skip }, async () => {
  const res = await server.rawFetch(`/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ budgetLimit: -50 }),
  });
  assert.equal(res.status, 400);
});
