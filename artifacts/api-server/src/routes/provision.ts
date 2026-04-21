import { Router, type IRouter } from "express";
import crypto from "crypto";

const router: IRouter = Router();

interface ChallengeEntry {
  counterUuid: string;
  nonce: string;
  expiresAt: number;
}

interface ProvisionTokenEntry {
  counterUuid: string;
  expiresAt: number;
  used: boolean;
}

const challengeStore = new Map<string, ChallengeEntry>();
const tokenStore = new Map<string, ProvisionTokenEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of challengeStore) { if (v.expiresAt < now) challengeStore.delete(k); }
  for (const [k, v] of tokenStore)     { if (v.expiresAt < now) tokenStore.delete(k); }
}, 60_000);

const DETEPO_API = "https://dashboard.detepo.com/api";

function extractBearer(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const t = authHeader.slice(7).trim();
  return t.length > 0 ? t : null;
}

function normaliseUuid(s: string): string {
  return s.toLowerCase().replace(/[-\s]/g, "");
}

async function verifyCounterBelongsToAccount(
  counterUuid: string,
  bearerToken: string
): Promise<boolean> {
  try {
    const res = await fetch(`${DETEPO_API}/counters`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${bearerToken}` },
    });
    if (!res.ok) return false;
    const data = (await res.json()) as unknown;
    const counters: unknown[] = Array.isArray(data)
      ? data
      : Array.isArray((data as Record<string, unknown>).counters)
      ? ((data as Record<string, unknown>).counters as unknown[])
      : [];
    const norm = normaliseUuid(counterUuid);
    return counters.some((c) => normaliseUuid(String((c as Record<string, unknown>).uuid ?? "")) === norm);
  } catch {
    return false;
  }
}

// Fetch per-device HMAC secret. Tries production internal endpoint first,
// falls back to DEVICE_SECRETS env var (JSON map uuid→hexSecret) for dev/CI.
async function getDeviceSecret(counterUuid: string, bearerToken: string): Promise<string | null> {
  try {
    const res = await fetch(`${DETEPO_API}/counters/${encodeURIComponent(counterUuid)}/secret`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${bearerToken}` },
    });
    if (res.ok) {
      const data = (await res.json()) as { secret?: string };
      if (typeof data.secret === "string" && data.secret.length > 0) return data.secret;
    }
  } catch { /* fall through */ }

  const envSecrets = process.env["DEVICE_SECRETS"];
  if (envSecrets) {
    try {
      const map = JSON.parse(envSecrets) as Record<string, string>;
      const norm = normaliseUuid(counterUuid);
      for (const [k, v] of Object.entries(map)) {
        if (normaliseUuid(k) === norm && typeof v === "string" && v.length > 0) return v;
      }
    } catch { /* ignore */ }
  }
  return null;
}

// Issue a challenge nonce tied to counterUuid (5-min TTL).
// Requires auth + account ownership. App forwards nonce to device over BLE.
router.post("/provision/challenge", async (req, res) => {
  const bearerToken = extractBearer(req.headers["authorization"]);
  if (!bearerToken) { res.status(401).json({ error: "Authentication required" }); return; }

  const { counterUuid } = req.body as { counterUuid?: string };
  if (!counterUuid?.trim()) { res.status(400).json({ error: "counterUuid is required" }); return; }

  const uuid = counterUuid.trim();
  if (!(await verifyCounterBelongsToAccount(uuid, bearerToken))) {
    res.status(403).json({ error: "Counter not found or not authorised for this account" });
    return;
  }

  const nonce = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 5 * 60 * 1000;
  challengeStore.set(nonce, { counterUuid: uuid, nonce, expiresAt });
  res.json({ nonce, expiresAt: new Date(expiresAt).toISOString() });
});

// Verify the HMAC response the device sent back over BLE.
// Performs constant-time compare; on success issues a one-time provisioning token.
router.post("/provision/verify-response", async (req, res) => {
  const bearerToken = extractBearer(req.headers["authorization"]);
  if (!bearerToken) { res.status(401).json({ ok: false, error: "Authentication required" }); return; }

  const { nonce, deviceResponse, counterUuid } = req.body as {
    nonce?: string; deviceResponse?: string; counterUuid?: string;
  };
  if (!nonce || !deviceResponse || !counterUuid) {
    res.status(400).json({ ok: false, error: "nonce, deviceResponse, and counterUuid are required" });
    return;
  }

  const entry = challengeStore.get(nonce.trim());
  if (!entry || entry.expiresAt < Date.now()) {
    challengeStore.delete(nonce.trim());
    res.status(401).json({ ok: false, error: "Challenge nonce expired or not found" });
    return;
  }
  if (normaliseUuid(entry.counterUuid) !== normaliseUuid(counterUuid.trim())) {
    res.status(401).json({ ok: false, error: "Nonce does not match the requested counter" });
    return;
  }

  const deviceSecret = await getDeviceSecret(entry.counterUuid, bearerToken);
  if (!deviceSecret) {
    res.status(503).json({ ok: false, error: "Device secret unavailable; cannot authenticate device" });
    return;
  }

  const expected = crypto
    .createHmac("sha256", Buffer.from(deviceSecret, "hex"))
    .update(Buffer.from(entry.nonce, "hex"))
    .digest("hex");

  let valid = false;
  try {
    valid = crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(deviceResponse.trim(), "hex")
    );
  } catch { valid = false; }

  challengeStore.delete(nonce.trim()); // burn nonce regardless of outcome

  if (!valid) {
    res.status(401).json({ ok: false, error: "Device authentication failed: HMAC mismatch" });
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const tokenExpiry = Date.now() + 30 * 60 * 1000;
  tokenStore.set(token, { counterUuid: entry.counterUuid, expiresAt: tokenExpiry, used: false });
  res.json({ token, counterUuid: entry.counterUuid, expiresAt: new Date(tokenExpiry).toISOString() });
});

// Validate a provisioning token issued by verify-response.
router.post("/provision/verify", (req, res) => {
  const bearerToken = extractBearer(req.headers["authorization"]);
  if (!bearerToken) { res.status(401).json({ ok: false, error: "Authentication required" }); return; }

  const { token, counterUuid } = req.body as { token?: string; counterUuid?: string };
  if (!token || !counterUuid) {
    res.status(400).json({ ok: false, error: "token and counterUuid are required" });
    return;
  }

  const entry = tokenStore.get(token);
  if (!entry || entry.expiresAt < Date.now()) {
    tokenStore.delete(token);
    res.status(401).json({ ok: false, error: "Invalid or expired provisioning token" });
    return;
  }
  if (entry.used) { res.status(401).json({ ok: false, error: "Provisioning token already used" }); return; }
  if (normaliseUuid(entry.counterUuid) !== normaliseUuid(counterUuid.trim())) {
    res.status(401).json({ ok: false, error: "Token not valid for this counter" });
    return;
  }

  entry.used = true;
  res.json({ ok: true });
});

export default router;
