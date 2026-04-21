import { useState, useCallback, useRef, useEffect } from "react";
import { Platform } from "react-native";
import { BleManager, Device, BleError, State } from "react-native-ble-plx";
import { DETEPO_API_BASE } from "@/contexts/AuthContext";

// ─── Detepo FP111 BLE protocol ──────────────────────────────────────────────
// Extracted from the official Detepo Bridge Python script.

const COUNTER_NAME_PREFIX = "FP1";         // Devices advertise as "FP111-{serial}"

const BLE_SERVICE = "00002760-08c2-11e1-9073-0e8ac72e1001";
const BLE_WRITE   = "00002760-08c2-11e1-9073-0e8ac72e0001";  // write without response
const BLE_NOTIFY  = "00002760-08c2-11e1-9073-0e8ac72e0002";  // notifications from counter

// Keepalive command — must be sent every 30 seconds to keep the BLE connection alive
const KEEPALIVE_CMD = '{"runLog":"on"}';

// WiFi config command
function wifiCmd(ssid: string, password: string): string {
  return JSON.stringify({
    wifiName: ssid,
    wifiPass: password,
    wifiEnc: "WPA2_AES_PSK",
    countryCode: 0,
  });
}

// Server config command — built with a one-time provisioning token
function buildServerCmd(provisionToken: string): string {
  return JSON.stringify({
    addr: "dashboard.detepo.com",
    port: 443,
    api: "/api/upload",
    https: 1,
    ptoken: provisionToken,
  });
}

// ─── Timeouts ────────────────────────────────────────────────────────────────
const WIFI_ATE0_TIMEOUT_MS  = 90_000;   // wait up to 90s for WIFI_ATE0 notification
const NET_CONNECT_TIMEOUT_MS = 30_000;  // wait up to 30s for netS:true
const KEEPALIVE_INTERVAL_MS  = 30_000;  // keepalive every 30s

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Encode a UTF-8 string to base64 (required by react-native-ble-plx) */
function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

/** Decode a base64 string back to UTF-8 */
function fromBase64(b64: string): string {
  try {
    return decodeURIComponent(
      atob(b64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch {
    return "";
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BLEDevice {
  id: string;
  name: string;
  rssi: number;
  raw: Device;
}

export type PairStep =
  | "idle"
  | "scanning"
  | "connecting"
  | "waitingWifi"     // waiting for WIFI_ATE0 from counter
  | "sendingWifi"     // WiFi command sent, waiting for netS:true
  | "sendingServer"   // server config sent
  | "done"
  | "error";

// ─── Backend device verification ─────────────────────────────────────────────

interface ApiCounter {
  id?: number;
  uuid?: string;
  name?: string;
  model?: string;
}

/**
 * Normalise an identifier for comparison: lowercase, strip hyphens/spaces.
 */
function normaliseId(s: string): string {
  return s.toLowerCase().replace(/[-\s]/g, "");
}

// Pre-connection ownership check:
//   (a) entered serial must exactly match BLE advertised name (canonical form)
//   (b) entered serial must exactly match an immutable backend-registered UUID
// Both must pass. Returns counterUuid on success for downstream binding.
async function verifyDeviceOwnership(
  bleDeviceName: string,
  enteredSerial: string,
  token: string | null
): Promise<{ ok: boolean; reason?: string; counterUuid?: string }> {
  const normSerial = normaliseId(enteredSerial);
  const normBle = normaliseId(bleDeviceName);

  // Check 1: entered serial must exactly equal the canonical BLE device name
  if (normBle !== normSerial) {
    return {
      ok: false,
      reason: `Serienummer "${enteredSerial}" komt niet exact overeen met het gekoppelde apparaat "${bleDeviceName}". Voer het volledige apparaatnaam in zoals weergegeven.`,
    };
  }

  // Check 2: entered serial must exactly match an immutable backend UUID
  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${DETEPO_API_BASE}/counters`, {
      headers,
      credentials: "include",
    });
    if (!res.ok) {
      return { ok: false, reason: "Kan tellers niet ophalen bij de Detepo backend. Controleer de internetverbinding." };
    }
    const data: unknown = await res.json();
    const counters: ApiCounter[] = Array.isArray(data)
      ? (data as ApiCounter[])
      : Array.isArray((data as Record<string, unknown>).counters)
      ? ((data as Record<string, unknown>).counters as ApiCounter[])
      : [];
    const match = counters.find((c) => normaliseId(c.uuid ?? "") === normSerial);
    if (!match) {
      return {
        ok: false,
        reason: `Apparaat "${enteredSerial}" is niet geregistreerd voor dit account. Neem contact op met Detepo support.`,
      };
    }
    return { ok: true, counterUuid: match.uuid };
  } catch {
    return { ok: false, reason: "Verbinding met Detepo backend mislukt. Onboarding gestopt." };
  }
}

// HMAC challenge-response device authentication over BLE.
// Prevents credential disclosure to spoofed peripherals: a rogue device that
// clones the advertised name cannot answer without the per-device secret.
// Protocol: (1) backend issues nonce, (2) app writes it to device via BLE,
// (3) device responds with HMAC-SHA256(nonce, secret), (4) backend verifies
// with constant-time compare and issues a one-time provisioning token.
async function performBleDeviceAuthentication(
  counterUuid: string,
  bearerToken: string | null,
  bleWrite: (payload: string) => Promise<void>,
  bleWaitNotify: (predicate: (m: string) => boolean, timeoutMs: number) => Promise<string | null>
): Promise<{ ok: true; provisionToken: string } | { ok: false; reason: string }> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (bearerToken) headers["Authorization"] = `Bearer ${bearerToken}`;

  // Round 1: obtain nonce from backend
  let nonce: string;
  try {
    const res = await fetch(`${DETEPO_API_BASE}/provision/challenge`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ counterUuid }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, reason: err.error ?? `Backend challenge failed (HTTP ${res.status})` };
    }
    const data = (await res.json()) as { nonce?: string };
    if (typeof data.nonce !== "string" || data.nonce.length === 0) {
      return { ok: false, reason: "Backend returned an invalid challenge nonce" };
    }
    nonce = data.nonce;
  } catch {
    return { ok: false, reason: "Verbinding met backend mislukt tijdens challenge-aanvraag" };
  }

  // Round 2: send nonce to device over BLE
  try {
    await bleWrite(JSON.stringify({ challenge: nonce }));
  } catch (err: unknown) {
    return {
      ok: false,
      reason: `BLE challenge-schrijven mislukt: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // Round 3a: wait for device HMAC response (15s)
  const CHALLENGE_TIMEOUT_MS = 15_000;
  const notifyMsg = await bleWaitNotify(
    (m) => {
      try {
        const obj = JSON.parse(m) as Record<string, unknown>;
        return typeof obj["hmac"] === "string" && obj["hmac"].length > 0;
      } catch {
        return false;
      }
    },
    CHALLENGE_TIMEOUT_MS
  );

  if (!notifyMsg) {
    return {
      ok: false,
      reason:
        "Apparaat heeft niet gereageerd op het authenticatie-challenge. " +
        "Dit kan een vervalst apparaat zijn. Provisioning geannuleerd.",
    };
  }

  let deviceResponse: string;
  try {
    const obj = JSON.parse(notifyMsg) as Record<string, unknown>;
    deviceResponse = String(obj["hmac"] ?? "");
    if (!deviceResponse) throw new Error("empty hmac");
  } catch {
    return { ok: false, reason: "Ongeldige HMAC-respons ontvangen van apparaat" };
  }

  // Round 3b: verify HMAC with backend; on success receive provisioning token
  try {
    const res = await fetch(`${DETEPO_API_BASE}/provision/verify-response`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ nonce, deviceResponse, counterUuid }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      return {
        ok: false,
        reason:
          err.error ??
          "Apparaat-authenticatie mislukt. Het apparaat kon niet worden geverifieerd als echt. Provisioning geannuleerd.",
      };
    }
    const data = (await res.json()) as { token?: string };
    if (typeof data.token !== "string" || data.token.length === 0) {
      return { ok: false, reason: "Backend gaf geen provisioning-token na succesvolle verificatie" };
    }
    return { ok: true, provisionToken: data.token };
  } catch {
    return { ok: false, reason: "Verbinding met backend mislukt tijdens HMAC-verificatie" };
  }
}

// ─── Shared BleManager (singleton) ───────────────────────────────────────────

let sharedManager: BleManager | null = null;

function getManager(): BleManager | null {
  if (Platform.OS === "web") return null;
  if (!sharedManager) sharedManager = new BleManager();
  return sharedManager;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBLE() {
  const [bleState, setBleState] = useState<State>(State.Unknown);
  const [devices, setDevices]   = useState<BLEDevice[]>([]);
  const [step, setStep]         = useState<PairStep>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage]   = useState("");
  const [logLines, setLogLines]           = useState<string[]>([]);
  const [pairedDeviceName, setPairedDeviceName] = useState("");

  const scanTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectedRef      = useRef<Device | null>(null);
  const keepaliveRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const notifySubRef      = useRef<{ remove(): void } | null>(null);

  // Collect notify messages in a ref-backed queue so async provisioning can read them
  const notifyQueueRef = useRef<string[]>([]);
  const notifyResolversRef = useRef<Array<(msg: string) => void>>([]);

  const addLog = useCallback((msg: string) => {
    setLogLines((prev) => [...prev.slice(-49), msg]);
  }, []);

  // Monitor Bluetooth power state
  useEffect(() => {
    const manager = getManager();
    if (!manager) return;
    const sub = manager.onStateChange((s) => setBleState(s), true);
    return () => sub.remove();
  }, []);

  // ── Internal: cleanup ──────────────────────────────────────────────────────
  const cleanup = useCallback(async () => {
    if (scanTimerRef.current) { clearTimeout(scanTimerRef.current); scanTimerRef.current = null; }
    if (keepaliveRef.current) { clearInterval(keepaliveRef.current); keepaliveRef.current = null; }
    notifySubRef.current?.remove(); notifySubRef.current = null;
    try { await connectedRef.current?.cancelConnection(); } catch { /* ignore */ }
    connectedRef.current = null;
    notifyQueueRef.current = [];
    notifyResolversRef.current = [];
  }, []);

  // ── Internal: wait for next notification matching a predicate ──────────────
  const waitForNotify = useCallback(
    (predicate: (msg: string) => boolean, timeoutMs: number): Promise<string | null> => {
      return new Promise((resolve) => {
        const deadline = Date.now() + timeoutMs;

        // Check backlog first
        const idx = notifyQueueRef.current.findIndex(predicate);
        if (idx !== -1) {
          const [found] = notifyQueueRef.current.splice(idx, 1);
          resolve(found);
          return;
        }

        // Register resolver
        let settled = false;
        const timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          notifyResolversRef.current = notifyResolversRef.current.filter((r) => r !== check);
          resolve(null);
        }, Math.max(0, deadline - Date.now()));

        const check = (msg: string) => {
          if (settled) return;
          if (predicate(msg)) {
            settled = true;
            clearTimeout(timer);
            notifyResolversRef.current = notifyResolversRef.current.filter((r) => r !== check);
            resolve(msg);
          }
        };
        notifyResolversRef.current.push(check);
      });
    },
    []
  );

  // ── Scan ───────────────────────────────────────────────────────────────────
  const stopScan = useCallback(() => {
    const manager = getManager();
    manager?.stopDeviceScan();
    if (scanTimerRef.current) { clearTimeout(scanTimerRef.current); scanTimerRef.current = null; }
  }, []);

  const startScan = useCallback(() => {
    const manager = getManager();
    if (!manager) return;

    if (Platform.OS === "web") {
      setErrorMessage("Bluetooth wordt niet ondersteund in de webbrowser. Gebruik de Expo Go app op iOS.");
      setStep("error");
      return;
    }

    setDevices([]);
    setStep("scanning");
    setErrorMessage("");
    addLog("🔍 Scannen naar WiFi Tellers…");

    manager.startDeviceScan(
      null,
      { allowDuplicates: false },
      (error: BleError | null, device: Device | null) => {
        if (error) {
          setErrorMessage(`Bluetooth scan mislukt: ${error.message}`);
          setStep("error");
          return;
        }
        if (device?.name && device.name.startsWith(COUNTER_NAME_PREFIX)) {
          setDevices((prev) => {
            const exists = prev.some((d) => d.id === device.id);
            if (exists) {
              // update RSSI
              return prev
                .map((d) => d.id === device.id ? { ...d, rssi: device.rssi ?? d.rssi } : d)
                .sort((a, b) => b.rssi - a.rssi);
            }
            addLog(`✅ Gevonden: ${device.name} (${Math.abs(device.rssi ?? -100)} dBm)`);
            return [
              ...prev,
              { id: device.id, name: device.name ?? device.id, rssi: device.rssi ?? -100, raw: device },
            ].sort((a, b) => b.rssi - a.rssi);
          });
        }
      }
    );

    scanTimerRef.current = setTimeout(() => {
      manager.stopDeviceScan();
      setStep((prev) => (prev === "scanning" ? "idle" : prev));
      addLog("⏱ Scan gestopt na 15 seconden.");
    }, 15_000);
  }, [addLog]);

  // ── Connect + provision ────────────────────────────────────────────────────
  const connectAndProvision = useCallback(
    async (bleDevice: BLEDevice, ssid: string, password: string, deviceLabel: string, enteredSerial: string, token: string | null) => {
      const manager = getManager();
      if (!manager) return;

      stopScan();
      setErrorMessage("");
      setLogLines([]);

      // ── Step 0: Pre-connection ownership checks (serial vs BLE name + backend) ──
      setStep("connecting");
      setStatusMessage("Apparaat-eigendom verifiëren…");
      addLog("🔍 Serienummer verifiëren via BLE-naam en backend registratie…");

      const ownership = await verifyDeviceOwnership(bleDevice.name, enteredSerial, token);
      if (!ownership.ok) {
        addLog(`❌ Verificatie mislukt: ${ownership.reason}`);
        setErrorMessage(ownership.reason ?? "Apparaatverificatie mislukt. Provisioning geannuleerd.");
        setStep("error");
        return;
      }
      const counterUuid = ownership.counterUuid ?? enteredSerial;
      addLog(`✅ Serienummer geverifieerd: "${enteredSerial}" bevestigd via label en backend`);

      // ── Connect ──
      setStep("connecting");
      setStatusMessage(`Verbinden met ${bleDevice.name}…`);
      addLog(`🔗 Verbinden met ${bleDevice.name}…`);

      let device: Device;
      try {
        device = await manager.connectToDevice(bleDevice.id, { requestMTU: 512 });
        connectedRef.current = device;
        await device.discoverAllServicesAndCharacteristicsForDevice();
        addLog("✅ Verbonden en services ontdekt");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        addLog(`❌ Verbinding mislukt: ${msg}`);
        setErrorMessage(`Verbinding mislukt: ${msg}`);
        setStep("error");
        return;
      }

      // ── Subscribe to notifications ──
      notifyQueueRef.current = [];
      notifyResolversRef.current = [];

      try {
        const sub = device.monitorCharacteristicForService(
          BLE_SERVICE,
          BLE_NOTIFY,
          (_err, char) => {
            if (!char?.value) return;
            const msg = fromBase64(char.value);
            if (!msg) return;
            const trimmed = msg.trim();
            if (trimmed === KEEPALIVE_CMD || trimmed === '{"runLog":"off"}') return;
            addLog(`📨 Teller: ${trimmed.slice(0, 80)}`);
            const resolvers = [...notifyResolversRef.current];
            for (const resolver of resolvers) resolver(trimmed);
            notifyQueueRef.current.push(trimmed);
            if (notifyQueueRef.current.length > 50) notifyQueueRef.current.shift();
          }
        );
        notifySubRef.current = sub;
        addLog("✅ Notificaties ingeschakeld");
      } catch (err: unknown) {
        addLog(`⚠️ Notificaties niet beschikbaar: ${err instanceof Error ? err.message : err}`);
      }

      // ── Cryptographic device authentication (HMAC challenge-response) ──
      // Blocks credential send until the connected device proves it holds
      // the per-device HMAC secret — defeats name-cloning / spoof attacks.
      setStep("connecting");
      setStatusMessage("Apparaat cryptografisch authenticeren…");
      addLog("🔐 BLE challenge-response authenticatie starten…");

      const bleWriteFn = async (payload: string) => {
        await device.writeCharacteristicWithoutResponseForService(
          BLE_SERVICE,
          BLE_WRITE,
          toBase64(payload)
        );
      };

      const authResult = await performBleDeviceAuthentication(
        counterUuid,
        token,
        bleWriteFn,
        waitForNotify
      );

      if (!authResult.ok) {
        addLog(`❌ Apparaat-authenticatie mislukt: ${authResult.reason}`);
        await cleanup();
        setErrorMessage(authResult.reason);
        setStep("error");
        return;
      }

      const provisionToken = authResult.provisionToken;
      addLog("✅ Apparaat cryptografisch geverifieerd — HMAC-handshake geslaagd");

      // ── Start keepalive every 30s ──
      const sendCmd = async (cmd: string) => {
        try {
          await device.writeCharacteristicWithoutResponseForService(
            BLE_SERVICE,
            BLE_WRITE,
            toBase64(cmd)
          );
        } catch {
          /* ignore write errors in keepalive */
        }
      };

      keepaliveRef.current = setInterval(() => {
        sendCmd(KEEPALIVE_CMD);
        addLog("💓 Keepalive verstuurd");
      }, KEEPALIVE_INTERVAL_MS);

      // ── Wait for WIFI_ATE0 (max 90s) ──
      setStep("waitingWifi");
      setStatusMessage("Wachten op WiFi module herstart (max 90s)…");
      addLog("⏳ Wachten op WIFI_ATE0 — de teller herstart zijn WiFi elke minuut");

      const ate0Msg = await waitForNotify(
        (m) => m.includes("WIFI_ATE0"),
        WIFI_ATE0_TIMEOUT_MS
      );

      if (!ate0Msg) {
        addLog("❌ WIFI_ATE0 niet ontvangen — onboarding geannuleerd");
        await cleanup();
        setErrorMessage(
          "Apparaat reageerde niet met verwacht handshake-signaal. Onboarding gestopt om te voorkomen dat Wi-Fi-gegevens naar een niet-geverifieerd apparaat worden gestuurd."
        );
        setStep("error");
        return;
      }

      addLog("✅ WIFI_ATE0 ontvangen — WiFi commando insturen!");

      // ── Send WiFi command ──
      setStep("sendingWifi");
      setStatusMessage(`WiFi-gegevens versturen naar ${ssid}…`);

      const cmd = wifiCmd(ssid, password);
      try {
        await device.writeCharacteristicWithoutResponseForService(
          BLE_SERVICE,
          BLE_WRITE,
          toBase64(cmd)
        );
        addLog(`📶 WiFi commando verstuurd: ${ssid}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        addLog(`❌ WiFi commando mislukt: ${msg}`);
        await cleanup();
        setErrorMessage(`WiFi commando mislukt: ${msg}`);
        setStep("error");
        return;
      }

      // ── Wait for netS:true (max 30s) ──
      setStatusMessage(`Wachten op verbinding met ${ssid}…`);
      addLog("⏳ Wachten op netS:true verbindingsbevestiging…");

      const netMsg = await waitForNotify(
        (m) => m.toLowerCase().includes("nets") && m.toLowerCase().includes("true"),
        NET_CONNECT_TIMEOUT_MS
      );

      if (netMsg) {
        addLog("🎉 Teller verbonden met het WiFi-netwerk!");
      } else {
        addLog("⚠️ netS:true niet bevestigd — serveradres toch instellen");
      }

      // ── Send server command ──
      setStep("sendingServer");
      setStatusMessage("Serveradres instellen…");
      addLog("🌐 Serveradres instellen: dashboard.detepo.com:443 (HTTPS)");

      try {
        await device.writeCharacteristicWithoutResponseForService(
          BLE_SERVICE,
          BLE_WRITE,
          toBase64(buildServerCmd(provisionToken))
        );
        addLog("✅ Serveradres ingesteld");
      } catch (err: unknown) {
        addLog(`⚠️ Server commando mislukt: ${err instanceof Error ? err.message : err}`);
      }

      // ── Done ──
      await new Promise((r) => setTimeout(r, 1500));
      await cleanup();

      setPairedDeviceName(deviceLabel || bleDevice.name);
      setStep("done");
      setStatusMessage("");
      addLog("✅ Configuratie voltooid!");
    },
    [stopScan, addLog, cleanup, waitForNotify]
  );

  // ── Reset ──────────────────────────────────────────────────────────────────
  const reset = useCallback(async () => {
    await cleanup();
    setDevices([]);
    setStep("idle");
    setStatusMessage("");
    setErrorMessage("");
    setLogLines([]);
    setPairedDeviceName("");
  }, [cleanup]);

  return {
    bleState,
    devices,
    step,
    statusMessage,
    errorMessage,
    logLines,
    pairedDeviceName,
    startScan,
    stopScan,
    connectAndProvision,
    reset,
  };
}
