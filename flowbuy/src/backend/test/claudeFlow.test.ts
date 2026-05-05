import test from "node:test";
import assert from "node:assert/strict";
import {
  __testHooks,
  runOrchestrator,
  type AnthropicLike,
} from "../src/services/aiService.js";
import type { ContextSnapshot, ProductDTO } from "../../shared/types.js";

// These tests force runOrchestrator down the Claude branch with a stubbed
// client, so we exercise the real callClaude() pipeline (build prompt ->
// SDK call -> strip fences -> JSON.parse -> Zod -> apply Decision Kill /
// hallucination guard / Anti-Buy) without needing an ANTHROPIC_API_KEY.

function ctx(over: Partial<ContextSnapshot["weather"]> = {}): ContextSnapshot {
  return {
    city: "Amsterdam",
    lat: 52.37,
    lon: 4.9,
    localTime: "2026-05-05T12:00:00.000Z",
    weather: {
      city: "Amsterdam",
      temperatureC: 6,
      conditions: "rain",
      humidity: 80,
      windKph: 18,
      ...over,
    },
  };
}

function product(over: Partial<ProductDTO> = {}): ProductDTO {
  return {
    id: "p1",
    sku: "SKU-1",
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

function stubClient(text: string): AnthropicLike {
  return {
    messages: {
      create: async () => ({ content: [{ type: "text", text }] }),
    },
  };
}

test.beforeEach(() => {
  __testHooks.forceClaudePath(true);
});

test.afterEach(() => {
  __testHooks.reset();
});

test("Claude returns clean JSON -> primary + alternatives + confidence carry through", async () => {
  const candidates = [
    product({ id: "umb", title: "Umbrella" }),
    product({ id: "coat", title: "Coat" }),
    product({ id: "buds", title: "Earbuds" }),
  ];
  __testHooks.setClientFactory(() =>
    stubClient(
      JSON.stringify({
        primaryProductId: "umb",
        alternativeProductIds: ["coat", "buds"],
        confidence: 88,
        reasoning_short: "It's raining in Amsterdam — you need this umbrella.",
      }),
    ),
  );

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
  assert.equal(r.primary?.id, "umb");
  assert.equal(r.confidence, 88);
  assert.match(r.reasoningShort, /raining in Amsterdam/);
  assert.deepEqual(
    r.alternatives.map((a) => a.id),
    ["coat", "buds"],
  );
});

test("Claude wraps JSON in ```json fence -> parser still accepts", async () => {
  __testHooks.setClientFactory(() =>
    stubClient(
      "```json\n" +
        JSON.stringify({
          primaryProductId: "umb",
          alternativeProductIds: [],
          confidence: 75,
          reasoning_short: "Rain expected — pick up the umbrella.",
        }) +
        "\n```",
    ),
  );

  const r = await runOrchestrator({
    userId: "u1",
    context: ctx(),
    candidates: [product({ id: "umb" })],
    recentSkippedIds: [],
    recentBoughtIds: [],
    preferences: {},
    budgetLimit: 200,
  });
  assert.equal(r.primary?.id, "umb");
  assert.equal(r.confidence, 75);
});

test("Claude returns confidence < 70 -> Decision Kill at orchestrator boundary", async () => {
  __testHooks.setClientFactory(() =>
    stubClient(
      JSON.stringify({
        primaryProductId: "umb",
        alternativeProductIds: [],
        confidence: 55,
        reasoning_short: "Not confident this fits.",
      }),
    ),
  );

  const r = await runOrchestrator({
    userId: "u1",
    context: ctx(),
    candidates: [product({ id: "umb" })],
    recentSkippedIds: [],
    recentBoughtIds: [],
    preferences: {},
    budgetLimit: 200,
  });
  assert.equal(r.decisionKill, true);
  assert.equal(r.primary, null);
  // Reasoning from Claude is preserved on the kill path so the UI can show it.
  assert.match(r.reasoningShort, /Not confident/);
});

test("Claude obeys its own Decision Kill rule (null primaryProductId) -> orchestrator suppresses", async () => {
  __testHooks.setClientFactory(() =>
    stubClient(
      JSON.stringify({
        primaryProductId: null,
        alternativeProductIds: [],
        confidence: 90,
        reasoning_short: "Catalog mismatch — nothing fits.",
      }),
    ),
  );

  const r = await runOrchestrator({
    userId: "u1",
    context: ctx(),
    candidates: [product({ id: "umb" })],
    recentSkippedIds: [],
    recentBoughtIds: [],
    preferences: {},
    budgetLimit: 200,
  });
  assert.equal(r.decisionKill, true);
  assert.equal(r.primary, null);
});

test("Claude hallucinates a product id -> orchestrator falls back to Decision Kill", async () => {
  __testHooks.setClientFactory(() =>
    stubClient(
      JSON.stringify({
        primaryProductId: "ghost-product",
        alternativeProductIds: [],
        confidence: 92,
        reasoning_short: "Confident pick.",
      }),
    ),
  );

  const r = await runOrchestrator({
    userId: "u1",
    context: ctx(),
    candidates: [product({ id: "umb" })],
    recentSkippedIds: [],
    recentBoughtIds: [],
    preferences: {},
    budgetLimit: 200,
  });
  assert.equal(r.decisionKill, true);
  assert.equal(r.primary, null);
  assert.match(r.reasoningShort, /unknown product id/);
});

test("Claude includes primary in alternatives -> dedup keeps primary, drops it from alts", async () => {
  __testHooks.setClientFactory(() =>
    stubClient(
      JSON.stringify({
        primaryProductId: "umb",
        // The system prompt forbids this, but defend against a sloppy model.
        alternativeProductIds: ["umb", "coat"],
        confidence: 85,
        reasoning_short: "Pick one.",
      }),
    ),
  );

  const r = await runOrchestrator({
    userId: "u1",
    context: ctx(),
    candidates: [product({ id: "umb" }), product({ id: "coat" })],
    recentSkippedIds: [],
    recentBoughtIds: [],
    preferences: {},
    budgetLimit: 200,
  });
  assert.equal(r.primary?.id, "umb");
  assert.deepEqual(
    r.alternatives.map((a) => a.id),
    ["coat"],
  );
});

test("Claude returns alt ids that aren't in the candidate set -> silently dropped", async () => {
  __testHooks.setClientFactory(() =>
    stubClient(
      JSON.stringify({
        primaryProductId: "umb",
        alternativeProductIds: ["coat", "ghost"],
        confidence: 85,
        reasoning_short: "Pick one.",
      }),
    ),
  );

  const r = await runOrchestrator({
    userId: "u1",
    context: ctx(),
    candidates: [product({ id: "umb" }), product({ id: "coat" })],
    recentSkippedIds: [],
    recentBoughtIds: [],
    preferences: {},
    budgetLimit: 200,
  });
  assert.equal(r.primary?.id, "umb");
  assert.deepEqual(
    r.alternatives.map((a) => a.id),
    ["coat"],
  );
});

test("Anti-Buy triggers when Claude picks an overpriced product", async () => {
  __testHooks.setClientFactory(() =>
    stubClient(
      JSON.stringify({
        primaryProductId: "trench",
        alternativeProductIds: [],
        confidence: 80,
        reasoning_short: "Fits the rain context.",
      }),
    ),
  );

  const r = await runOrchestrator({
    userId: "u1",
    context: ctx(),
    candidates: [
      product({
        id: "trench",
        price: 89.99,
        metadata: { rating: 4.4, tags: ["rain"], priceHistory: [60, 65, 60, 62, 65, 63] },
      }),
    ],
    recentSkippedIds: [],
    recentBoughtIds: [],
    preferences: {},
    budgetLimit: 200,
  });
  assert.equal(r.primary?.id, "trench");
  assert.equal(r.antiBuy.triggered, true);
  assert.match(r.antiBuy.warning!, /6-month average/);
});

test("Empty content array from Claude -> error surfaces (caller can fall back)", async () => {
  __testHooks.setClientFactory(() => ({
    messages: {
      create: async () => ({ content: [] }),
    },
  }));

  await assert.rejects(
    () =>
      runOrchestrator({
        userId: "u1",
        context: ctx(),
        candidates: [product({ id: "umb" })],
        recentSkippedIds: [],
        recentBoughtIds: [],
        preferences: {},
        budgetLimit: 200,
      }),
    /no text block/,
  );
});

test("Non-JSON Claude reply -> error surfaces with Claude-specific message", async () => {
  __testHooks.setClientFactory(() => stubClient("here you go: maybe an umbrella?"));

  await assert.rejects(
    () =>
      runOrchestrator({
        userId: "u1",
        context: ctx(),
        candidates: [product({ id: "umb" })],
        recentSkippedIds: [],
        recentBoughtIds: [],
        preferences: {},
        budgetLimit: 200,
      }),
    /non-JSON/,
  );
});

test("System prompt + user prompt both reach the SDK", async () => {
  let captured: { system?: string; messages?: Array<{ content: string }> } = {};
  __testHooks.setClientFactory(() => ({
    messages: {
      create: async (params: any) => {
        captured = { system: params.system, messages: params.messages };
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                primaryProductId: "umb",
                alternativeProductIds: [],
                confidence: 80,
                reasoning_short: "ok",
              }),
            },
          ],
        };
      },
    },
  }));

  await runOrchestrator({
    userId: "u1",
    context: ctx(),
    candidates: [product({ id: "umb", title: "Umbrella" })],
    recentSkippedIds: ["skipped-1"],
    recentBoughtIds: ["bought-1"],
    preferences: { sizes: { top: "M" } },
    budgetLimit: 200,
  });

  assert.match(captured.system!, /FlowBuy's Decision Orchestrator/);
  assert.match(captured.system!, /Decision Kill/);
  const userMsg = captured.messages![0].content;
  assert.match(userMsg, /city=Amsterdam/);
  assert.match(userMsg, /weather=rain/);
  assert.match(userMsg, /id=umb/);
  // History should be visible to the model so it can avoid skipped items.
  assert.match(userMsg, /skipped-1/);
  assert.match(userMsg, /bought-1/);
});
