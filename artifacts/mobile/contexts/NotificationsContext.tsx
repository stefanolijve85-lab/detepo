import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "detepo_notification_prefs";

export interface NotificationPrefs {
  batteryEnabled: boolean;
  batteryThreshold: number; // alert when battery <= this %
  visitorsEnabled: boolean;
  visitorsThreshold: number; // alert when liveTelling >= this
  wifiEnabled: boolean;
  wifiThreshold: number; // alert when wifiRssi <= this dBm (e.g. -85)
  alignmentEnabled: boolean; // alert on poor alignment (rssi <= -85 or null while online)
}

const DEFAULTS: NotificationPrefs = {
  batteryEnabled: true,
  batteryThreshold: 20,
  visitorsEnabled: false,
  visitorsThreshold: 50,
  wifiEnabled: true,
  wifiThreshold: -80,
  alignmentEnabled: true,
};

interface Ctx {
  prefs: NotificationPrefs;
  setPref: <K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) => void;
  reset: () => void;
  hydrated: boolean;
}

const NotificationsContext = createContext<Ctx | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
            setPrefs({ ...DEFAULTS, ...parsed });
          } catch {
            // ignore
          }
        }
      })
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)).catch(() => {});
  }, [prefs, hydrated]);

  const setPref = useCallback(
    <K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) => {
      setPrefs((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const reset = useCallback(() => setPrefs(DEFAULTS), []);

  const value = useMemo(() => ({ prefs, setPref, reset, hydrated }), [prefs, setPref, reset, hydrated]);
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
