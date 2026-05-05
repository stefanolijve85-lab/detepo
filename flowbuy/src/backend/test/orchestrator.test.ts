import test from "node:test";
import assert from "node:assert/strict";
import { runOrchestrator } from "../src/services/aiService.js";
import type { ContextSnapshot, ProductDTO } from "../../shared/types.js";

// These tests exercise the mock orchestrator path. The real path requires
// ANTHROPIC_API_KEY and is covered separately in scripts/verify-claude.ts.
// In CI / sandboxed environments where the key is absent, runOrchestrator
// falls through to mockOrchestrate, which is deterministic given its inputs.

function ctx(overrides: Partial<ContextSnapshot["weather"]> = {}): ContextSnapshot {
  return {
    city: "Amsterdam",
    lat: 52.3676,
    lon: 4.9041,
    localTime: "2026-05-05T12:00:00.000Z",
    weather: {
      city: "Amsterdam",
      temperatureC: 18,
      conditions: "clear",
      humidity: 60,
      windKph: 10,
      ...overrides,
    },
  };
}

function product(over: Partial<ProductDTO> = {}): ProductDTO {
  return {
    id: "p" + Math.random().toString(36).slice(2, 8),
    sku: "SKU-X",
    title: "Test Product",
    brand: "Acme",
    category: "OTHER",
    price: 50,
    currency: "EUR",
    imageUrl: "https://example.com/img.jpg",
    metadata: { rating: 4.5, tags: [] },
    ...over,
  };
}

test("Decision Kill when there are no candidates", async () => {
  const r = await runOrchestrator({
    userId: "u1",
    context: ctx(),
    candidates: [],
    recentSkippedIds: [],
    recentBoughtIds: [],
    preferences: {},
    budgetLimit: 500,
  });
  assert.equal(r.decisionKill, true);
  assert.equal(r.primary, null);
  assert.deepEqual(r.alternatives, []);
});

test("Decision Kill when every candidate is over budget", async () => {
  const r = await runOrchestrator({
    userId: "u1",
    context: ctx(),
    candidates: [product({ price: 1000 }), product({ price: 800 })],
    recentSkippedIds: [],
    recentBoughtIds: [],
    preferences: {},
    budgetLimit: 50,
  });
  assert.equal(r.decisionKill, true);
  assert.equal(r.primary, null);
});

test("Decision Kill when all eligible products are too low-rated to clear the floor", async () => {
  // Baseline = 20 + rating*12. A 3.0★ product scores 56, well below 70.
  const r = await runOrchestrator({
    userId: "u1",
    context: ctx(),
    candidates: [
      product({ id: "low1", metadata: { rating: 3.0, tags: [] }, price: 10 }),
      product({ id: "low2", metadata: { rating: 3.2, tags: [] }, price: 10 }),
    ],
    recentSkippedIds: [],
    recentBoughtIds: [],
    preferences: {},
    budgetLimit: 200,
  });
  assert.equal(r.decisionKill, true);
  assert.ok(r.confidence < 70);
});

test("Returns primary + up to 2 alternatives for high-rated catalog", async () => {
  const candidates: ProductDTO[] = [
    product({ id: "a", metadata: { rating: 4.8, tags: [] }, price: 30 }),
    product({ id: "b", metadata: { rating: 4.7, tags: [] }, price: 40 }),
    product({ id: "c", metadata: { rating: 4.6, tags: [] }, price: 50 }),
    product({ id: "d", metadata: { rating: 4.5, tags: [] }, price: 60 }),
  ];
  const r = await runOrchestrator({
    userId: "u1",
    context: ctx(),
    candidates,
    recentSkippedIds: [],
    recentBoughtIds: [],
    preferences: {},
    budgetLimit: 200,
  });
  assert.equal(r.decisionKill, false);
  assert.ok(r.primary, "expected a primary recommendation");
  assert.ok(r.confidence >= 70);
  assert.ok(r.alternatives.length <= 2);
  // Primary must NOT also appear in alternatives.
  assert.ok(!r.alternatives.some((a) => a.id === r.primary!.id));
  // Reasoning must be present and short.
  assert.ok(r.reasoningShort.length > 0 && r.reasoningShort.length <= 140);
});

test("Skipped product is never selected as primary", async () => {
  const skipped = product({ id: "skipped", metadata: { rating: 4.9, tags: [] }, price: 30 });
  const ok = product({ id: "ok", metadata: { rating: 4.5, tags: [] }, price: 30 });
  const r = await runOrchestrator({
    userId: "u1",
    context: ctx(),
    candidates: [skipped, ok],
    recentSkippedIds: ["skipped"],
    recentBoughtIds: [],
    preferences: {},
    budgetLimit: 200,
  });
  assert.equal(r.decisionKill, false);
  assert.equal(r.primary?.id, "ok");
  assert.ok(!r.alternatives.some((a) => a.id === "skipped"));
});

test("Anti-Buy flag rides through to the orchestrator output", async () => {
  // Single candidate is rigged like RAIN-002 — overpriced vs its history.
  const overpriced = product({
    id: "rain002",
    price: 89.99,
    metadata: {
      rating: 4.4,
      tags: ["rain"],
      priceHistory: [60, 65, 60, 62, 65, 63],
    },
  });
  const r = await runOrchestrator({
    userId: "u1",
    context: ctx({ conditions: "rain", temperatureC: 6 }),
    candidates: [overpriced],
    recentSkippedIds: [],
    recentBoughtIds: [],
    preferences: {},
    budgetLimit: 200,
  });
  assert.equal(r.primary?.id, "rain002");
  assert.equal(r.antiBuy.triggered, true);
  assert.match(r.antiBuy.warning!, /6-month average/);
});

test("Rainy weather + rain-tagged item should reach high confidence", async () => {
  const umbrella = product({
    id: "umb",
    metadata: { rating: 4.6, tags: ["rain", "compact"] },
    price: 25,
  });
  const r = await runOrchestrator({
    userId: "u1",
    context: ctx({ conditions: "rain", temperatureC: 6 }),
    candidates: [umbrella],
    recentSkippedIds: [],
    recentBoughtIds: [],
    preferences: {},
    budgetLimit: 200,
  });
  assert.equal(r.primary?.id, "umb");
  assert.ok(r.confidence >= 85, `expected confidence ≥85 for rain match, got ${r.confidence}`);
  // Mock reasoning template should mention rain when conditions match.
  assert.match(r.reasoningShort, /raining/i);
});
