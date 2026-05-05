import Constants from "expo-constants";
import type {
  AutoBuyResponse,
  FeedResponse,
  InteractRequest,
} from "../../shared/types";

const baseUrl: string =
  (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? "http://localhost:4000";

// Demo user id resolved from the seeded user. The mobile UI fetches it from
// /users/by-email on first load and caches it; for the MVP we hard-code the
// email so there's no auth flow to maintain.
export const DEMO_USER_EMAIL = "demo@flowbuy.app";

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export interface FetchFeedArgs {
  userId: string;
  lat?: number;
  lon?: number;
  city?: string;
}

export async function fetchFeed(args: FetchFeedArgs): Promise<FeedResponse> {
  const params = new URLSearchParams({ userId: args.userId });
  if (args.lat !== undefined) params.set("lat", String(args.lat));
  if (args.lon !== undefined) params.set("lon", String(args.lon));
  if (args.city) params.set("city", args.city);
  return http<FeedResponse>(`/feed?${params.toString()}`);
}

export async function postInteract(req: InteractRequest): Promise<{ id: string }> {
  return http<{ id: string }>("/interact", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function postAutoBuy(
  userId: string,
  recommendationId?: string,
): Promise<AutoBuyResponse> {
  return http<AutoBuyResponse>("/auto-buy", {
    method: "POST",
    body: JSON.stringify({ userId, recommendationId }),
  });
}

export interface UserDTO {
  id: string;
  email: string;
  displayName: string | null;
  budgetLimit: number;
  autoBuyEnabled: boolean;
  preferences: Record<string, unknown>;
}

export async function getUser(userId: string): Promise<UserDTO> {
  return http<UserDTO>(`/users/${encodeURIComponent(userId)}`);
}

export async function patchUser(
  userId: string,
  patch: Partial<Pick<UserDTO, "budgetLimit" | "autoBuyEnabled" | "preferences">>,
): Promise<UserDTO> {
  return http<UserDTO>(`/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}
