import { useState, useCallback, useRef, useEffect } from "react";
import { Platform } from "react-native";
import { BleManager, Device, State } from "react-native-ble-plx";

const DEVICE_PREFIX = "FP1";

let manager: BleManager | null = null;

function getManager() {
  if (Platform.OS === "web") return null;
  if (!manager) manager = new BleManager();
  return manager;
}

export function useBLE() {
  const [bleState, setBleState] = useState<State>(State.Unknown);
  const [devices, setDevices] = useState<any[]>([]);
  const [step, setStep] = useState("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const selectedDeviceRef = useRef<Device | null>(null);
  const manualConnectRef = useRef(false); // 🔥 KEY FIX

  const scanTimeout = useRef<any>(null);

  useEffect(() => {
    const m = getManager();
    if (!m) return;

    const sub = m.onStateChange((s) => {
      setBleState(s);
    }, true);

    return () => sub.remove();
  }, []);

  const cleanup = useCallback(async () => {
    const m = getManager();
    if (!m) return;

    try {
      m.stopDeviceScan();
    } catch {}

    if (scanTimeout.current) {
      clearTimeout(scanTimeout.current);
      scanTimeout.current = null;
    }

    try {
      if (selectedDeviceRef.current) {
        await selectedDeviceRef.current.cancelConnection();
      }
    } catch {}

    selectedDeviceRef.current = null;
    manualConnectRef.current = false; // 🔥 reset
  }, []);

  const startScan = useCallback(async () => {
    const m = getManager();
    if (!m) return;

    await cleanup();

    setDevices([]);
    setStep("scanning");
    setStatusMessage("Scannen... druk knop op teller");

    m.startDeviceScan(null, null, (error, device) => {
      if (error) {
        setErrorMessage(error.message);
        setStep("error");
        return;
      }

      if (!device?.name) return;
      if (!device.name.startsWith(DEVICE_PREFIX)) return;

      setDevices((prev) => {
        if (prev.find((d) => d.id === device.id)) return prev;

        return [
          ...prev,
          {
            id: device.id,
            name: device.name,
            rssi: device.rssi,
            raw: device,
          },
        ];
      });
    });

    scanTimeout.current = setTimeout(() => {
      m.stopDeviceScan();
      setStep("idle");
    }, 15000);
  }, [cleanup]);

  const connectAndProvision = useCallback(async (bleDevice: any) => {
    const m = getManager();
    if (!m) return;

    try {
      manualConnectRef.current = true; // 🔥 alleen dan mag connect

      m.stopDeviceScan();

      setStep("connecting");
      setStatusMessage("Verbinden...");

      const device = await m.connectToDevice(bleDevice.id);

      // 🔥 EXTRA CHECK → voorkom ghost connect
      if (!manualConnectRef.current) {
        await device.cancelConnection();
        return;
      }

      await device.discoverAllServicesAndCharacteristics();

      selectedDeviceRef.current = device;

      setStep("connected");
      setStatusMessage("Verbonden");
    } catch (e: any) {
      setErrorMessage(e.message);
      setStep("error");
    }
  }, []);

  const reset = useCallback(async () => {
    await cleanup();
    setDevices([]);
    setStep("idle");
    setStatusMessage("");
    setErrorMessage("");
  }, [cleanup]);

  return {
    bleState,
    devices,
    step,
    statusMessage,
    errorMessage,
    startScan,
    connectAndProvision,
    reset,
  };
}
