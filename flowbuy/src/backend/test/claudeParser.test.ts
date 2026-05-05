import test from "node:test";
import assert from "node:assert/strict";
import {
  parseClaudeResponseText,
  stripJsonFences,
  aiResponseSchema,
} from "../src/services/aiService.js";

// stripJsonFences --------------------------------------------------------

test("stripJsonFences: passes plain JSON through unchanged", () => {
  const s = '{"a":1}';
  assert.equal(stripJsonFences(s), '{"a":1}');
});

test("stripJsonFences: trims whitespace", () => {
  assert.equal(stripJsonFences('  \n{"a":1}\n\t '), '{"a":1}');
});

test("stripJsonFences: strips ```json ... ``` fence", () => {
  const s = '```json\n{"a":1}\n```';
  assert.equal(stripJsonFences(s), '{"a":1}');
});

test("stripJsonFences: strips ``` ... ``` fence with no language tag", () => {
  const s = '```\n{"a":1}\n```';
  assert.equal(stripJsonFences(s), '{"a":1}');
});

test("stripJsonFences: handles fence + leading whitespace", () => {
  const s = '   ```json\n{"a":1}\n```   ';
  assert.equal(stripJsonFences(s), '{"a":1}');
});

// parseClaudeResponseText ------------------------------------------------

const VALID = {
  primaryProductId: "p1",
  alternativeProductIds: ["p2", "p3"],
  confidence: 80,
  reasoning_short: "It's raining in Amsterdam — you need this umbrella.",
};

test("parseClaudeResponseText: accepts valid raw JSON", () => {
  const r = parseClaudeResponseText(JSON.stringify(VALID));
  assert.deepEqual(r, VALID);
});

test("parseClaudeResponseText: accepts JSON wrapped in ```json fence", () => {
  const r = parseClaudeResponseText("```json\n" + JSON.stringify(VALID) + "\n```");
  assert.deepEqual(r, VALID);
});

test("parseClaudeResponseText: accepts decision-kill response (null primary, [] alts)", () => {
  const dk = {
    primaryProductId: null,
    alternativeProductIds: [],
    confidence: 35,
    reasoning_short: "Nothing in the catalog matches your context.",
  };
  const r = parseClaudeResponseText(JSON.stringify(dk));
  assert.deepEqual(r, dk);
});

test("parseClaudeResponseText: throws clearly on non-JSON text", () => {
  assert.throws(
    () => parseClaudeResponseText("here you go: maybe an umbrella?"),
    /Claude returned non-JSON text/,
  );
});

test("parseClaudeResponseText: throws clearly on JSON that violates the schema", () => {
  const bad = { ...VALID, confidence: 150 }; // confidence out of range
  assert.throws(
    () => parseClaudeResponseText(JSON.stringify(bad)),
    /Invalid AI response/,
  );
});

test("parseClaudeResponseText: rejects more than 2 alternatives", () => {
  const bad = { ...VALID, alternativeProductIds: ["a", "b", "c"] };
  assert.throws(
    () => parseClaudeResponseText(JSON.stringify(bad)),
    /Invalid AI response/,
  );
});

test("parseClaudeResponseText: rejects empty reasoning_short", () => {
  const bad = { ...VALID, reasoning_short: "" };
  assert.throws(
    () => parseClaudeResponseText(JSON.stringify(bad)),
    /Invalid AI response/,
  );
});

test("parseClaudeResponseText: rejects reasoning_short > 160 chars", () => {
  const bad = { ...VALID, reasoning_short: "x".repeat(161) };
  assert.throws(
    () => parseClaudeResponseText(JSON.stringify(bad)),
    /Invalid AI response/,
  );
});

test("parseClaudeResponseText: rejects missing required fields", () => {
  const bad: Record<string, unknown> = { ...VALID };
  delete bad.primaryProductId;
  assert.throws(
    () => parseClaudeResponseText(JSON.stringify(bad)),
    /Invalid AI response/,
  );
});

test("parseClaudeResponseText: rejects wrong types (confidence as string)", () => {
  const bad = { ...VALID, confidence: "high" };
  assert.throws(
    () => parseClaudeResponseText(JSON.stringify(bad)),
    /Invalid AI response/,
  );
});

// Schema sanity ----------------------------------------------------------

test("aiResponseSchema: accepts the exact contract advertised in the system prompt", () => {
  const r = aiResponseSchema.safeParse({
    primaryProductId: "p1",
    alternativeProductIds: [],
    confidence: 0,
    reasoning_short: "x",
  });
  assert.equal(r.success, true);
});

test("aiResponseSchema: confidence boundary 0..100 inclusive", () => {
  assert.equal(
    aiResponseSchema.safeParse({
      primaryProductId: "p1",
      alternativeProductIds: [],
      confidence: 100,
      reasoning_short: "x",
    }).success,
    true,
  );
  assert.equal(
    aiResponseSchema.safeParse({
      primaryProductId: "p1",
      alternativeProductIds: [],
      confidence: -1,
      reasoning_short: "x",
    }).success,
    false,
  );
});
