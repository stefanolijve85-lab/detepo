import { useState, useCallback, useRef, useEffect } from "react";
import { Platform } from "react-native";
import { BleManager, Device, BleError, State } from "react-native-ble-plx";

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

// Server config command — the counter will POST data here
const SERVER_CMD = JSON.stringify({
  addr: "dashboard.detepo.com",
  port: 8080,
  api: "/api/upload",
  https: 0,
});

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
    addLog("🔍 Scannen naar FP111 tellers…");

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
    async (bleDevice: BLEDevice, ssid: string, password: string, deviceLabel: string) => {
      const manager = getManager();
      if (!manager) return;

      stopScan();
      setErrorMessage("");
      setLogLines([]);

      // ── Step 1: Connect ──
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

      // ── Step 2: Subscribe to notifications ──
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
            // Skip noisy keepalive echoes
            if (trimmed === KEEPALIVE_CMD || trimmed === '{"runLog":"off"}') return;
            addLog(`📨 Teller: ${trimmed.slice(0, 80)}`);
            // Dispatch to waiting resolvers
            const resolvers = [...notifyResolversRef.current];
            for (const resolver of resolvers) resolver(trimmed);
            // Also buffer for late consumers
            notifyQueueRef.current.push(trimmed);
            if (notifyQueueRef.current.length > 50) notifyQueueRef.current.shift();
          }
        );
        notifySubRef.current = sub;
        addLog("✅ Notificaties ingeschakeld");
      } catch (err: unknown) {
        addLog(`⚠️ Notificaties niet beschikbaar: ${err instanceof Error ? err.message : err}`);
      }

      // ── Step 3: Start keepalive every 30s ──
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

      // ── Step 4: Wait for WIFI_ATE0 (max 90s) ──
      setStep("waitingWifi");
      setStatusMessage("Wachten op WiFi module herstart (max 90s)…");
      addLog("⏳ Wachten op WIFI_ATE0 — de teller herstart zijn WiFi elke minuut");

      const ate0Msg = await waitForNotify(
        (m) => m.includes("WIFI_ATE0"),
        WIFI_ATE0_TIMEOUT_MS
      );

      if (ate0Msg) {
        addLog("✅ WIFI_ATE0 ontvangen — WiFi commando insturen!");
      } else {
        addLog("⚠️ WIFI_ATE0 niet ontvangen — WiFi commando alsnog sturen");
      }

      // ── Step 5: Send WiFi command ──
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

      // ── Step 6: Wait for netS:true (max 30s) ──
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

      // ── Step 7: Send server command ──
      setStep("sendingServer");
      setStatusMessage("Serveradres instellen…");
      addLog("🌐 Serveradres instellen: dashboard.detepo.com:8080");

      try {
        await device.writeCharacteristicWithoutResponseForService(
          BLE_SERVICE,
          BLE_WRITE,
          toBase64(SERVER_CMD)
        );
        addLog("✅ Serveradres ingesteld");
      } catch (err: unknown) {
        addLog(`⚠️ Server commando mislukt: ${err instanceof Error ? err.message : err}`);
      }

      // ── Step 8: Done ──
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
