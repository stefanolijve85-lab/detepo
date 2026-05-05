import "dotenv/config";

function bool(v: string | undefined, fallback = false): boolean {
  if (v === undefined) return fallback;
  return /^(1|true|yes|on)$/i.test(v.trim());
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",

  databaseUrl: process.env.DATABASE_URL ?? "",

  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  claudeModel: process.env.CLAUDE_MODEL ?? "claude-3-5-sonnet-20241022",

  openWeatherApiKey: process.env.OPENWEATHER_API_KEY ?? "",
  defaultLat: Number(process.env.DEFAULT_LAT ?? 52.3676),
  defaultLon: Number(process.env.DEFAULT_LON ?? 4.9041),
  defaultCity: process.env.DEFAULT_CITY ?? "Amsterdam",

  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",

  // If true, or if no ANTHROPIC_API_KEY is set, the orchestrator falls back to
  // a deterministic mock so the rest of the system stays demo-able.
  useMockAi: bool(process.env.USE_MOCK_AI, true),
  useMockWeather: bool(process.env.USE_MOCK_WEATHER, true),

  // Confidence threshold under which the orchestrator returns no primary
  // product ("Decision Kill").
  confidenceFloor: 70,
  // Anti-Buy triggers if current price is this fraction over the 6-month avg.
  antiBuyMarkupThreshold: 0.2,
};

export type AppConfig = typeof config;
