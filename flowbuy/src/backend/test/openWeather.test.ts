import test from "node:test";
import assert from "node:assert/strict";
import {
  __weatherTestHooks,
  fetchOpenWeather,
  mockWeather,
  parseOpenWeather,
} from "../src/services/contextService.js";

// ---------------------------------------------------------------------------
// parseOpenWeather (pure)
// ---------------------------------------------------------------------------

const VALID_PAYLOAD = {
  name: "Paris",
  main: { temp: 18.4, humidity: 62 },
  weather: [{ main: "Clear" }],
  wind: { speed: 4.2 },
};

test("parseOpenWeather: shapes a valid payload into our snapshot", () => {
  const w = parseOpenWeather(VALID_PAYLOAD, "fallback");
  assert.equal(w.city, "Paris");
  assert.equal(w.temperatureC, 18); // rounded
  assert.equal(w.conditions, "clear"); // lowercased
  assert.equal(w.humidity, 62);
  // 4.2 m/s * 3.6 ≈ 15.12 -> 15 kph
  assert.equal(w.windKph, 15);
});

test("parseOpenWeather: uses fallback city when payload is missing 'name'", () => {
  const { name: _name, ...withoutName } = VALID_PAYLOAD;
  const w = parseOpenWeather(withoutName, "Amsterdam");
  assert.equal(w.city, "Amsterdam");
});

test("parseOpenWeather: handles a missing wind object", () => {
  const { wind: _wind, ...withoutWind } = VALID_PAYLOAD;
  const w = parseOpenWeather(withoutWind, "X");
  assert.equal(w.windKph, 0);
});

test("parseOpenWeather: throws on payloads missing weather[0].main", () => {
  assert.throws(
    () => parseOpenWeather({ ...VALID_PAYLOAD, weather: [] }, "X"),
    /OpenWeather payload invalid/,
  );
});

test("parseOpenWeather: throws on payloads missing main.temp", () => {
  assert.throws(
    () => parseOpenWeather({ ...VALID_PAYLOAD, main: {} }, "X"),
    /OpenWeather payload invalid/,
  );
});

test("parseOpenWeather: throws on a totally malformed payload", () => {
  assert.throws(() => parseOpenWeather({ hello: "world" }, "X"), /OpenWeather payload invalid/);
});

test("parseOpenWeather: lowercases mixed-case condition strings", () => {
  const w = parseOpenWeather(
    { ...VALID_PAYLOAD, weather: [{ main: "Thunderstorm" }] },
    "X",
  );
  assert.equal(w.conditions, "thunderstorm");
});

// ---------------------------------------------------------------------------
// fetchOpenWeather (with stubbed fetch)
// ---------------------------------------------------------------------------

function jsonResponse(body: unknown, init?: { status?: number }): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { "Content-Type": "application/json" },
  });
}

test.afterEach(() => __weatherTestHooks.reset());

test("fetchOpenWeather: returns a snapshot on a 200 response", async () => {
  __weatherTestHooks.setFetcher(async () => jsonResponse(VALID_PAYLOAD));
  const w = await fetchOpenWeather(48.85, 2.35, "fallback");
  assert.equal(w.city, "Paris");
  assert.equal(w.temperatureC, 18);
});

test("fetchOpenWeather: throws OpenWeather <status> on non-2xx", async () => {
  __weatherTestHooks.setFetcher(
    async () => new Response("invalid api key", { status: 401 }),
  );
  await assert.rejects(
    () => fetchOpenWeather(0, 0, "X"),
    /OpenWeather 401/,
  );
});

test("fetchOpenWeather: throws when the body is not valid JSON", async () => {
  __weatherTestHooks.setFetcher(
    async () => new Response("not-json", { status: 200, headers: {} }),
  );
  await assert.rejects(() => fetchOpenWeather(0, 0, "X"));
});

test("fetchOpenWeather: throws when the body is JSON but the schema fails", async () => {
  __weatherTestHooks.setFetcher(async () => jsonResponse({ hello: "world" }));
  await assert.rejects(
    () => fetchOpenWeather(0, 0, "X"),
    /OpenWeather payload invalid/,
  );
});

test("fetchOpenWeather: surfaces network errors", async () => {
  __weatherTestHooks.setFetcher(async () => {
    throw new Error("ENETUNREACH");
  });
  await assert.rejects(() => fetchOpenWeather(0, 0, "X"), /ENETUNREACH/);
});

test("fetchOpenWeather: encodes the API key into the URL safely", async () => {
  let calledUrl = "";
  __weatherTestHooks.setFetcher(async (url) => {
    calledUrl = url;
    return jsonResponse(VALID_PAYLOAD);
  });
  await fetchOpenWeather(52.37, 4.9, "X");
  // Must include lat/lon and the appid query param.
  assert.match(calledUrl, /lat=52\.37/);
  assert.match(calledUrl, /lon=4\.9/);
  assert.match(calledUrl, /appid=/);
  // Must use HTTPS, not HTTP.
  assert.ok(calledUrl.startsWith("https://"));
});

// ---------------------------------------------------------------------------
// mockWeather sanity
// ---------------------------------------------------------------------------

test("mockWeather: returns a valid snapshot for an arbitrary city", () => {
  const w = mockWeather("Tokyo");
  assert.equal(w.city, "Tokyo");
  assert.ok(typeof w.temperatureC === "number");
  assert.ok(["rain", "clouds", "clear"].includes(w.conditions));
  assert.equal(w.humidity, 65);
  assert.equal(w.windKph, 12);
});
