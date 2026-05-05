import { config } from "../config.js";
import { prisma } from "../db.js";
import type { ContextSnapshot, WeatherSnapshot } from "../../../shared/types.js";

interface FetchContextArgs {
  userId: string;
  lat?: number;
  lon?: number;
  city?: string;
}

export async function fetchUserContext(args: FetchContextArgs): Promise<ContextSnapshot> {
  const lat = args.lat ?? config.defaultLat;
  const lon = args.lon ?? config.defaultLon;
  const city = args.city ?? config.defaultCity;

  const weather = config.useMockWeather || !config.openWeatherApiKey
    ? mockWeather(city)
    : await fetchOpenWeather(lat, lon, city);

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

async function fetchOpenWeather(
  lat: number,
  lon: number,
  city: string,
): Promise<WeatherSnapshot> {
  const url =
    `https://api.openweathermap.org/data/2.5/weather` +
    `?lat=${lat}&lon=${lon}&units=metric&appid=${config.openWeatherApiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OpenWeather ${res.status}: ${await res.text()}`);
  }
  const json: any = await res.json();
  return {
    city: json.name ?? city,
    temperatureC: Math.round(json.main?.temp ?? 0),
    conditions: String(json.weather?.[0]?.main ?? "Clear").toLowerCase(),
    humidity: Number(json.main?.humidity ?? 0),
    windKph: Math.round((json.wind?.speed ?? 0) * 3.6),
  };
}

// Deterministic mock — varies by hour so demos feel alive without hitting an API.
function mockWeather(city: string): WeatherSnapshot {
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
