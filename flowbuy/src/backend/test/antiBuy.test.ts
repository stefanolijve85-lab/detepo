import test from "node:test";
import assert from "node:assert/strict";
import { detectAntiBuy } from "../src/services/aiService.js";
import type { ProductDTO } from "../../shared/types.js";

function product(overrides: Partial<ProductDTO> = {}): ProductDTO {
  return {
    id: "p1",
    sku: "SKU-1",
    title: "Test Product",
    brand: "Acme",
    category: "OTHER",
    price: 100,
    currency: "EUR",
    imageUrl: "https://example.com/img.jpg",
    metadata: {},
    ...overrides,
  };
}

test("returns not-triggered when there is no price history", () => {
  const r = detectAntiBuy(product({ price: 100, metadata: {} }));
  assert.equal(r.triggered, false);
  assert.equal(r.warning, null);
  assert.equal(r.averagePrice, null);
  assert.equal(r.markupRatio, null);
});

test("returns not-triggered when current price equals the 6-month average", () => {
  const r = detectAntiBuy(
    product({ price: 60, metadata: { priceHistory: [60, 60, 60, 60, 60, 60] } }),
  );
  assert.equal(r.triggered, false);
  assert.equal(r.warning, null);
  assert.equal(r.averagePrice, 60);
  assert.equal(r.markupRatio, 0);
});

test("returns not-triggered for a 19% markup (just below threshold)", () => {
  const r = detectAntiBuy(
    product({ price: 119, metadata: { priceHistory: [100, 100, 100, 100, 100, 100] } }),
  );
  assert.equal(r.triggered, false);
  assert.equal(r.averagePrice, 100);
  // markupRatio is 0.19, threshold is 0.20
  assert.ok(r.markupRatio !== null && r.markupRatio < 0.2);
});

test("triggers Anti-Buy at >20% markup with the average and percent in the warning", () => {
  const r = detectAntiBuy(
    product({
      price: 89.99,
      // RAIN-002 fixture from mockProducts.ts
      metadata: { priceHistory: [60, 65, 60, 62, 65, 63] },
    }),
  );
  assert.equal(r.triggered, true);
  assert.ok(r.warning, "expected a warning string");
  // 6-mo avg of [60,65,60,62,65,63] = 62.5
  assert.equal(r.averagePrice, 62.5);
  // Warning must surface the average AND the percent over.
  assert.match(r.warning!, /62\.50/);
  assert.match(r.warning!, /44%/);
});

test("triggers Anti-Buy on extreme markup (10x)", () => {
  const r = detectAntiBuy(
    product({ price: 1000, metadata: { priceHistory: [100, 100, 100, 100, 100, 100] } }),
  );
  assert.equal(r.triggered, true);
  assert.match(r.warning!, /900%/);
});

test("does NOT trigger when the average price is zero (defensive)", () => {
  // Should not divide by zero or claim antibuy on a meaningless history.
  const r = detectAntiBuy(
    product({ price: 50, metadata: { priceHistory: [0, 0, 0, 0, 0, 0] } }),
  );
  assert.equal(r.triggered, false);
  assert.equal(r.warning, null);
});

test("does NOT trigger when current price is below average (deal, not anti-buy)", () => {
  const r = detectAntiBuy(
    product({ price: 50, metadata: { priceHistory: [100, 100, 100, 100, 100, 100] } }),
  );
  assert.equal(r.triggered, false);
  assert.equal(r.averagePrice, 100);
  // Negative markup = price drop.
  assert.ok(r.markupRatio !== null && r.markupRatio < 0);
});
