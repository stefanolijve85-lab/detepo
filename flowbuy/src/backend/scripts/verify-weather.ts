/**
 * One-shot integration check for OpenWeather.
 *
 * Run with:
 *   OPENWEATHER_API_KEY=... pnpm --filter flowbuy-backend run verify:weather
 *
 * Bypasses USE_MOCK_WEATHER and asks OpenWeather for live conditions at
 * three sample coordinates (Amsterdam, Tokyo, São Paulo) so any auth /
 * regional / payload-shape issue surfaces immediately.
 *
 * Exits 0 on success, 1 on any failure.
 */
import { fetchOpenWeather } from "../src/services/contextService.js";

const apiKey = process.env.OPENWEATHER_API_KEY;
if (!apiKey) {
  console.error("OPENWEATHER_API_KEY not set. Cannot run live weather check.");
  process.exit(1);
}
// Force the live path even if .env left USE_MOCK_WEATHER=true.
process.env.USE_MOCK_WEATHER = "false";

const cases = [
  { city: "Amsterdam", lat: 52.3676, lon: 4.9041 },
  { city: "Tokyo", lat: 35.6762, lon: 139.6503 },
  { city: "São Paulo", lat: -23.5505, lon: -46.6333 },
];

let failed = 0;

for (const c of cases) {
  const start = Date.now();
  try {
    const w = await fetchOpenWeather(c.lat, c.lon, c.city);
    const ms = Date.now() - start;
    console.log(
      `[${c.city.padEnd(10)}] ${ms.toString().padStart(4)}ms  ` +
        `${w.temperatureC}°C ${w.conditions}, humidity ${w.humidity}%, wind ${w.windKph} kph ` +
        `(reported as: ${w.city})`,
    );

    if (typeof w.temperatureC !== "number" || Number.isNaN(w.temperatureC)) {
      throw new Error("temperatureC missing or NaN");
    }
    if (typeof w.conditions !== "string" || w.conditions.length === 0) {
      throw new Error("conditions missing");
    }
    if (typeof w.humidity !== "number" || w.humidity < 0 || w.humidity > 100) {
      throw new Error(`humidity out of range: ${w.humidity}`);
    }
  } catch (err) {
    failed++;
    console.error(`[${c.city}] FAIL: ${err instanceof Error ? err.message : err}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed}/${cases.length} location(s) failed.`);
  process.exit(1);
}
console.log("\nAll OpenWeather checks passed.");
