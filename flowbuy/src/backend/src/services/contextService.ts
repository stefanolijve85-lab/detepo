import { z } from "zod";
import { config } from "../config.js";
import { prisma } from "../db.js";
import type { ContextSnapshot, WeatherSnapshot } from "../../../shared/types.js";

interface FetchContextArgs {
  userId: string;
  lat?: number;
  lon?: number;
  city?: string;
}

// ---------------------------------------------------------------------------
// OpenWeather response schema
// ---------------------------------------------------------------------------
// Only the fields we actually consume are required; the rest of the payload
// is intentionally left loose. If OpenWeather changes shape on us, Zod will
// surface a clear error rather than letting `undefined` flow into the AI
// orchestrator.

const openWeatherSchema = z.object({
  name: z.string().optional(),
  main: z.object({
    temp: z.number(),
    humidity: z.number().optional(),
  }),
  weather: z
    .array(z.object({ main: z.string() }))
    .min(1),
  wind: z.object({ speed: z.number().optional() }).optional(),
});

// ---------------------------------------------------------------------------
// Test seam
// ---------------------------------------------------------------------------
// Tests stub the fetcher so they can exercise the OpenWeather path without
// hitting the real API. Production code never sets it.

type Fetcher = (url: string) => Promise<Response>;
let fetcher: Fetcher = (url) => fetch(url);

export const __weatherTestHooks = {
  setFetcher: (f: Fetcher) => {
    fetcher = f;
  },
  reset: () => {
    fetcher = (url) => fetch(url);
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchUserContext(args: FetchContextArgs): Promise<ContextSnapshot> {
  const lat = args.lat ?? config.defaultLat;
  const lon = args.lon ?? config.defaultLon;
  const city = args.city ?? config.defaultCity;

  const weather = await resolveWeather(lat, lon, city);

  const snapshot: ContextSnapshot = {
    city,
    lat,
    lon,
    localTime: new Date().toISOString(),
    weather,
  };

  // Persist for the learning loop. Failures are non-fatal — we never want a
  // logging issue to block a recommendation.
  try {
    await prisma.userContext.create({
      data: {
        userId: args.userId,
        city,
        lat,
        lon,
        localTime: snapshot.localTime,
        weather: weather as unknown as object,
      },
    });
  } catch (err) {
    console.warn("[contextService] failed to persist context:", err);
  }

  return snapshot;
}

/**
 * Resolves a WeatherSnapshot, preferring real OpenWeather data when a key is
 * configured. If the upstream call fails for ANY reason (network, non-2xx,
 * malformed payload), we log and fall back to mock weather rather than
 * propagate — the recommendation engine should always produce a feed, even
 * if weather is degraded.
 */
async function resolveWeather(lat: number, lon: number, city: string): Promise<WeatherSnapshot> {
  if (config.useMockWeather || !config.openWeatherApiKey) {
    return mockWeather(city);
  }
  try {
    return await fetchOpenWeather(lat, lon, city);
  } catch (err) {
    console.warn("[contextService] OpenWeather call failed, falling back to mock:", err);
    return mockWeather(city);
  }
}

export async function fetchOpenWeather(
  lat: number,
  lon: number,
  city: string,
): Promise<WeatherSnapshot> {
  const url =
    `https://api.openweathermap.org/data/2.5/weather` +
    `?lat=${encodeURIComponent(String(lat))}` +
    `&lon=${encodeURIComponent(String(lon))}` +
    `&units=metric&appid=${encodeURIComponent(config.openWeatherApiKey)}`;
  const res = await fetcher(url);
  if (!res.ok) {
    throw new Error(`OpenWeather ${res.status}: ${await res.text()}`);
  }
  const raw = (await res.json()) as unknown;
  return parseOpenWeather(raw, city);
}

/**
 * Validates an OpenWeather payload and shapes it into our WeatherSnapshot.
 * Exported so unit tests can drive it without faking a Response object.
 */
export function parseOpenWeather(raw: unknown, fallbackCity: string): WeatherSnapshot {
  const parsed = openWeatherSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`OpenWeather payload invalid: ${parsed.error.message}`);
  }
  const data = parsed.data;
  return {
    city: data.name && data.name.length > 0 ? data.name : fallbackCity,
    temperatureC: Math.round(data.main.temp),
    conditions: data.weather[0].main.toLowerCase(),
    humidity: Math.round(data.main.humidity ?? 0),
    windKph: Math.round((data.wind?.speed ?? 0) * 3.6),
  };
}

// Deterministic mock — varies by hour so demos feel alive without hitting an API.
export function mockWeather(city: string): WeatherSnapshot {
  const hour = new Date().getHours();
  const cycle: Array<Pick<WeatherSnapshot, "temperatureC" | "conditions">> = [
    { temperatureC: 6, conditions: "rain" },
    { temperatureC: 4, conditions: "rain" },
    { temperatureC: 12, conditions: "clouds" },
    { temperatureC: 18, conditions: "clear" },
    { temperatureC: 27, conditions: "clear" },
    { temperatureC: 22, conditions: "clouds" },
  ];
  const slot = cycle[hour % cycle.length];
  return {
    city,
    temperatureC: slot.temperatureC,
    conditions: slot.conditions,
    humidity: 65,
    windKph: 12,
  };
}
