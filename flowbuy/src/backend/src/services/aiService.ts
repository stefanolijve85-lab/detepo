import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { config } from "../config.js";
import type {
  ContextSnapshot,
  ProductDTO,
  ProductMetadata,
  Recommendation,
} from "../../../shared/types.js";

// ---------------------------------------------------------------------------
// Anti-Buy detector
// ---------------------------------------------------------------------------

export interface AntiBuyResult {
  triggered: boolean;
  warning: string | null;
  averagePrice: number | null;
  markupRatio: number | null;
}

/**
 * If the current price is more than `antiBuyMarkupThreshold` (default 20%)
 * above the 6-month average price, return a warning so the UI can suppress
 * the buy_button and show a "wait for a better price" indicator instead.
 *
 * For products without price history we treat Anti-Buy as not triggered —
 * the orchestrator can still factor in confidence elsewhere.
 */
export function detectAntiBuy(product: ProductDTO): AntiBuyResult {
  const history = product.metadata.priceHistory ?? [];
  if (history.length === 0) {
    return { triggered: false, warning: null, averagePrice: null, markupRatio: null };
  }
  const avg = history.reduce((a, b) => a + b, 0) / history.length;
  if (avg <= 0) {
    return { triggered: false, warning: null, averagePrice: null, markupRatio: null };
  }
  const markupRatio = (product.price - avg) / avg;
  if (markupRatio > config.antiBuyMarkupThreshold) {
    const pct = Math.round(markupRatio * 100);
    return {
      triggered: true,
      warning:
        `This is ${pct}% above the 6-month average (€${avg.toFixed(2)}). ` +
        `Wait — a price drop is likely.`,
      averagePrice: avg,
      markupRatio,
    };
  }
  return { triggered: false, warning: null, averagePrice: avg, markupRatio };
}

// ---------------------------------------------------------------------------
// Claude prompt + response schema
// ---------------------------------------------------------------------------

const aiResponseSchema = z.object({
  primaryProductId: z.string().nullable(),
  alternativeProductIds: z.array(z.string()).max(2),
  confidence: z.number().min(0).max(100),
  reasoning_short: z.string().min(1).max(160),
});

type AIResponse = z.infer<typeof aiResponseSchema>;

const SYSTEM_PROMPT = `You are FlowBuy's Decision Orchestrator. Your job: pick ONE product to recommend right now, plus up to TWO alternatives, from the candidate list.

ABSOLUTE RULES (violating any rule = invalid response):
1. Output ONLY JSON matching the schema. No prose, no markdown fences, no commentary.
2. "primaryProductId" MUST be one of the candidate ids, or null.
3. "alternativeProductIds" is at most 2 ids, all from candidates, and MUST NOT include the primary id.
4. "confidence" is an integer 0-100 reflecting how strongly the context supports the primary pick.
5. "reasoning_short" is ONE short sentence (max 140 chars) tying the pick to the user's context (weather, time, history). Plain text, no emojis, no quotes.
6. Decision Kill: if you are not sure (confidence < 70) OR the candidates do not fit the context, set primaryProductId to null and alternativeProductIds to []. Still return a confidence and a reasoning_short explaining why nothing fit.
7. Never invent product ids. Never recommend a product the user has recently skipped (see history).

Schema:
{
  "primaryProductId": string | null,
  "alternativeProductIds": string[],         // length 0-2
  "confidence": number,                       // 0-100
  "reasoning_short": string                   // <=140 chars
}`;

interface OrchestratorInput {
  userId: string;
  context: ContextSnapshot;
  candidates: ProductDTO[];
  // Most recent first; product ids the user already swiped or bought.
  recentSkippedIds: string[];
  recentBoughtIds: string[];
  preferences: Record<string, unknown>;
  budgetLimit: number;
}

function buildUserPrompt(input: OrchestratorInput): string {
  const candidateLines = input.candidates.map((p) => {
    const md: ProductMetadata = p.metadata ?? {};
    const tags = (md.tags ?? []).slice(0, 6).join(", ");
    return [
      `- id=${p.id}`,
      `  title=${p.title}`,
      `  brand=${p.brand ?? "n/a"}`,
      `  category=${p.category}`,
      `  price=${p.price.toFixed(2)} ${p.currency}`,
      `  rating=${md.rating ?? "n/a"}`,
      `  tags=[${tags}]`,
      `  pros=[${(md.pros ?? []).join(" | ")}]`,
      `  cons=[${(md.cons ?? []).join(" | ")}]`,
    ].join("\n");
  });

  return [
    `User context:`,
    `  city=${input.context.city}`,
    `  localTime=${input.context.localTime}`,
    `  weather=${input.context.weather.conditions}, ${input.context.weather.temperatureC}C, humidity ${input.context.weather.humidity}%`,
    `  budgetLimit=${input.budgetLimit.toFixed(2)} EUR`,
    `  preferences=${JSON.stringify(input.preferences)}`,
    `  recentlySkippedIds=${JSON.stringify(input.recentSkippedIds)}`,
    `  recentlyBoughtIds=${JSON.stringify(input.recentBoughtIds)}`,
    ``,
    `Candidates (${input.candidates.length}):`,
    ...candidateLines,
    ``,
    `Return JSON only, matching the schema. No fences, no prose.`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Public orchestrator
// ---------------------------------------------------------------------------

export interface OrchestratorOutput extends Recommendation {
  rawAi: AIResponse;
}

export async function runOrchestrator(
  input: OrchestratorInput,
): Promise<OrchestratorOutput> {
  if (input.candidates.length === 0) {
    return {
      primary: null,
      alternatives: [],
      confidence: 0,
      reasoningShort: "No candidates available right now.",
      antiBuy: { triggered: false, warning: null },
      decisionKill: true,
      rawAi: {
        primaryProductId: null,
        alternativeProductIds: [],
        confidence: 0,
        reasoning_short: "No candidates available right now.",
      },
    };
  }

  const ai =
    config.useMockAi || !config.anthropicApiKey
      ? mockOrchestrate(input)
      : await callClaude(input);

  // Apply Decision Kill at the orchestrator boundary too — defends against a
  // model that ignores the rule.
  if (ai.confidence < config.confidenceFloor || !ai.primaryProductId) {
    return {
      primary: null,
      alternatives: [],
      confidence: ai.confidence,
      reasoningShort: ai.reasoning_short,
      antiBuy: { triggered: false, warning: null },
      decisionKill: true,
      rawAi: ai,
    };
  }

  const byId = new Map(input.candidates.map((c) => [c.id, c]));
  const primary = byId.get(ai.primaryProductId) ?? null;
  if (!primary) {
    // Hallucinated id — fall back to Decision Kill.
    return {
      primary: null,
      alternatives: [],
      confidence: 0,
      reasoningShort: "AI returned an unknown product id.",
      antiBuy: { triggered: false, warning: null },
      decisionKill: true,
      rawAi: ai,
    };
  }

  const alternatives = ai.alternativeProductIds
    .filter((id) => id !== primary.id)
    .slice(0, 2)
    .map((id) => byId.get(id))
    .filter((p): p is ProductDTO => Boolean(p));

  const antiBuy = detectAntiBuy(primary);

  return {
    primary,
    alternatives,
    confidence: ai.confidence,
    reasoningShort: ai.reasoning_short,
    antiBuy: { triggered: antiBuy.triggered, warning: antiBuy.warning },
    decisionKill: false,
    rawAi: ai,
  };
}

// ---------------------------------------------------------------------------
// Claude call
// ---------------------------------------------------------------------------

async function callClaude(input: OrchestratorInput): Promise<AIResponse> {
  const client = new Anthropic({ apiKey: config.anthropicApiKey });
  const userPrompt = buildUserPrompt(input);

  const msg = await client.messages.create({
    model: config.claudeModel,
    max_tokens: 512,
    temperature: 0.2,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = msg.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text block");
  }
  const cleaned = stripJsonFences(textBlock.text);
  const parsed = aiResponseSchema.safeParse(JSON.parse(cleaned));
  if (!parsed.success) {
    throw new Error(`Invalid AI response: ${parsed.error.message}`);
  }
  return parsed.data;
}

function stripJsonFences(s: string): string {
  const trimmed = s.trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```[a-zA-Z]*\n?/, "").replace(/```\s*$/, "").trim();
  }
  return trimmed;
}

// ---------------------------------------------------------------------------
// Mock orchestrator (used in CI/dev without an API key)
// ---------------------------------------------------------------------------

function mockOrchestrate(input: OrchestratorInput): AIResponse {
  const skipped = new Set(input.recentSkippedIds);
  const eligible = input.candidates.filter(
    (c) => !skipped.has(c.id) && c.price <= input.budgetLimit,
  );
  if (eligible.length === 0) {
    return {
      primaryProductId: null,
      alternativeProductIds: [],
      confidence: 30,
      reasoning_short: "Nothing in the catalog matches your budget and history.",
    };
  }

  const w = input.context.weather.conditions.toLowerCase();
  const isRainy = /rain|drizzle|thunderstorm/.test(w);
  const isCold = input.context.weather.temperatureC < 8;
  const isHot = input.context.weather.temperatureC > 25;

  // Score each candidate against the context. Highest score wins.
  const scored = eligible.map((p) => {
    const tags = (p.metadata.tags ?? []).map((t) => t.toLowerCase());
    let score = (p.metadata.rating ?? 3.5) * 10;
    if (isRainy && tags.includes("rain")) score += 35;
    if (isCold && tags.includes("warm")) score += 25;
    if (isHot && tags.includes("cooling")) score += 25;
    if (p.price < input.budgetLimit * 0.5) score += 5;
    return { p, score };
  });
  scored.sort((a, b) => b.score - a.score);

  const top = scored[0];
  // Mock confidence: bounded so that with no contextual match we cleanly
  // trigger Decision Kill.
  const confidence = Math.min(96, Math.round(top.score));
  const alts = scored.slice(1, 3).map((s) => s.p.id);

  const reason = isRainy
    ? `It's raining in ${input.context.city} — ${top.p.title.toLowerCase()} keeps you dry.`
    : isCold
      ? `It's ${input.context.weather.temperatureC}C in ${input.context.city} — stay warm with this.`
      : isHot
        ? `${input.context.weather.temperatureC}C and clear in ${input.context.city} — perfect timing.`
        : `Top-rated pick that fits your budget and recent activity.`;

  return {
    primaryProductId: top.p.id,
    alternativeProductIds: alts,
    confidence,
    reasoning_short: reason.slice(0, 140),
  };
}
