import { useEffect, useState } from "react";
import * as Location from "expo-location";

export interface LocationFix {
  lat: number;
  lon: number;
  city: string | null;
  // "granted" -> we have a real GPS fix.
  // "denied"  -> user said no; backend will use its DEFAULT_LAT/LON/CITY.
  // "error"   -> permission/fix failed unexpectedly; same fallback as denied.
  // "loading" -> still waiting on the OS prompt or the fix.
  status: "loading" | "granted" | "denied" | "error";
  error?: string;
}

const INITIAL: LocationFix = {
  lat: 0,
  lon: 0,
  city: null,
  status: "loading",
};

/**
 * One-shot location lookup. We deliberately do NOT subscribe to position
 * updates — the recommendation engine only cares about coarse location to
 * fetch weather, so a single fix on app start is enough.
 *
 * On web, the browser geolocation prompt may take time or be blocked by
 * the user; we time out the fix at 8s and fall through to "denied" so the
 * UI is never left waiting.
 */
export function useLocation(): LocationFix {
  const [fix, setFix] = useState<LocationFix>(INITIAL);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== "granted") {
          setFix({ lat: 0, lon: 0, city: null, status: "denied" });
          return;
        }

        const positionPromise = Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Location fix timed out")), 8000),
        );
        const pos = await Promise.race([positionPromise, timeoutPromise]);
        if (cancelled) return;

        const { latitude: lat, longitude: lon } = pos.coords;

        let city: string | null = null;
        try {
          const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
          city = places[0]?.city ?? places[0]?.subregion ?? places[0]?.region ?? null;
        } catch {
          // Reverse geocode is non-essential — backend can still produce
          // weather context from lat/lon alone.
        }
        if (cancelled) return;

        setFix({ lat, lon, city, status: "granted" });
      } catch (e) {
        if (cancelled) return;
        setFix({
          lat: 0,
          lon: 0,
          city: null,
          status: "error",
          error: e instanceof Error ? e.message : String(e),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return fix;
}
