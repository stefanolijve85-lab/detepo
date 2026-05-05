/**
 * One-shot integration check for the real Claude orchestrator.
 *
 * Run with:
 *   ANTHROPIC_API_KEY=sk-ant-... pnpm --filter flowbuy-backend run verify:claude
 *
 * Bypasses USE_MOCK_AI and asks Claude for a real recommendation against a
 * small in-memory catalog. Validates that:
 *   - Claude returned valid JSON parseable by our Zod schema
 *   - The picked primary id exists in the candidate set
 *   - Alternatives have ≤2 entries and don't include the primary
 *   - reasoning_short is non-empty and under 160 chars
 *   - Decision Kill rule holds: confidence < 70 ⇒ primary is null
 *
 * Exit code is 0 on success, 1 on any contract violation.
 */
import { runOrchestrator } from "../src/services/aiService.js";
import type { ContextSnapshot, ProductDTO } from "../../shared/types.js";

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error("ANTHROPIC_API_KEY not set. Cannot run live Claude check.");
  process.exit(1);
}
// Force the live path even if .env left USE_MOCK_AI=true.
process.env.USE_MOCK_AI = "false";

const context: ContextSnapshot = {
  city: "Amsterdam",
  lat: 52.3676,
  lon: 4.9041,
  localTime: new Date().toISOString(),
  weather: { city: "Amsterdam", temperatureC: 6, conditions: "rain", humidity: 80, windKph: 18 },
};

const candidates: ProductDTO[] = [
  {
    id: "umb",
    sku: "RAIN-001",
    title: "Compact Travel Umbrella",
    brand: "Senz",
    category: "OUTDOOR",
    price: 24.99,
    currency: "EUR",
    imageUrl: "https://example.com/umb.jpg",
    metadata: { rating: 4.6, tags: ["rain", "compact"], pros: ["Wind-proof"], cons: [] },
  },
  {
    id: "trench",
    sku: "RAIN-002",
    title: "Waterproof Trench Coat",
    brand: "Stutterheim",
    category: "APPAREL",
    price: 89.99,
    currency: "EUR",
    imageUrl: "https://example.com/trench.jpg",
    metadata: {
      rating: 4.4,
      tags: ["rain", "warm"],
      pros: ["Fully waterproof"],
      cons: [],
      priceHistory: [60, 65, 60, 62, 65, 63],
    },
  },
  {
    id: "earbuds",
    sku: "ELEC-001",
    title: "Wireless Noise-Cancelling Earbuds",
    brand: "Sony",
    category: "ELECTRONICS",
    price: 129.0,
    currency: "EUR",
    imageUrl: "https://example.com/earbuds.jpg",
    metadata: { rating: 4.8, tags: ["audio"], pros: [], cons: [] },
  },
];

function fail(msg: string): never {
  console.error("FAIL:", msg);
  process.exit(1);
}

const start = Date.now();
const r = await runOrchestrator({
  userId: "verify-claude-script",
  context,
  candidates,
  recentSkippedIds: [],
  recentBoughtIds: [],
  preferences: {},
  budgetLimit: 200,
});
const ms = Date.now() - start;

console.log(`Claude returned in ${ms}ms`);
console.log("  primary:        ", r.primary?.id ?? "(none)");
console.log("  confidence:     ", r.confidence);
console.log("  decisionKill:   ", r.decisionKill);
console.log("  alternatives:   ", r.alternatives.map((a) => a.id).join(", ") || "(none)");
console.log("  reasoning_short:", JSON.stringify(r.reasoningShort));
console.log("  antiBuy:        ", r.antiBuy.triggered, r.antiBuy.warning ?? "");

const candidateIds = new Set(candidates.map((c) => c.id));

// Contract checks.
if (typeof r.confidence !== "number" || r.confidence < 0 || r.confidence > 100) {
  fail(`confidence out of range: ${r.confidence}`);
}
if (!r.reasoningShort || r.reasoningShort.length === 0) {
  fail("reasoning_short was empty");
}
if (r.reasoningShort.length > 160) {
  fail(`reasoning_short too long (${r.reasoningShort.length} chars)`);
}
if (r.confidence < 70 && r.primary !== null) {
  fail("Decision Kill violated: confidence < 70 but a primary was returned");
}
if (r.primary && !candidateIds.has(r.primary.id)) {
  fail(`Primary id "${r.primary.id}" is not in the candidate set (hallucination)`);
}
if (r.alternatives.length > 2) {
  fail(`Too many alternatives: ${r.alternatives.length}`);
}
if (r.primary && r.alternatives.some((a) => a.id === r.primary!.id)) {
  fail("Primary appears in alternatives");
}
for (const a of r.alternatives) {
  if (!candidateIds.has(a.id)) fail(`Alternative id "${a.id}" not in candidate set`);
}

console.log("\nAll contract checks passed.");
