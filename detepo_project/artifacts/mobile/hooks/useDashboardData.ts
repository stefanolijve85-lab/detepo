import { useState, useEffect, useCallback } from "react";
import { DETEPO_API_BASE, DetepoUser } from "@/contexts/AuthContext";

export interface CounterDevice {
  id: string;
  uuid: string;
  name: string;
  location: string;
  online: boolean;
  countIn: number;
  countOut: number;
  firmware: string;
  battery: number;
  connection: string;
  lastHeartbeat: string;
  status: string;
}

export interface DashboardData {
  liveTelling: number;
  dagTotaalIn: number;
  dagTotaalOut: number;
  weekTotaal: number;
  maandTotaal: number;
  yesterdayDagTotaalIn: number;
  peakHour: string;
  peakHourCount: number;
  avgPerHour: number;
  status: "calm" | "busy" | "critical";
  counters: CounterDevice[];
  onlineCount: number;
  offlineCount: number;
  hourlyData: { hour: string; inCount: number; outCount: number }[];
  lastUpdated: Date;
  heartbeatOnline: boolean;
}

export interface Alert {
  id: string;
  type: "warning" | "error" | "info";
  message: string;
  time: string;
  read: boolean;
}

const baseData: DashboardData = {
  liveTelling: 0,
  dagTotaalIn: 0,
  dagTotaalOut: 0,
  weekTotaal: 0,
  maandTotaal: 0,
  yesterdayDagTotaalIn: 0,
  peakHour: "--:--",
  peakHourCount: 0,
  avgPerHour: 0,
  status: "calm",
  counters: [],
  onlineCount: 0,
  offlineCount: 0,
  hourlyData: [],
  lastUpdated: new Date(),
  heartbeatOnline: false,
};

function toNum(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function deriveStatus(occupancy: number): DashboardData["status"] {
  if (occupancy >= 80) return "critical";
  if (occupancy >= 25) return "busy";
  return "calm";
}

function formatLastSeen(isoString: string | null | undefined): string {
  if (!isoString) return "onbekend";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "onbekend";
  const now = Date.now();
  const diffMinutes = Math.round((now - date.getTime()) / 60000);
  if (diffMinutes < 2) return "nu actief";
  if (diffMinutes < 60) return `${diffMinutes} min geleden`;
  if (diffMinutes < 1440) return `${Math.round(diffMinutes / 60)} uur geleden`;
  return `${Math.round(diffMinutes / 1440)} dag geleden`;
}

interface ApiOverview {
  totalIn?: number;
  totalOut?: number;
  weekTotal?: number;
  monthTotal?: number;
  occupancy?: number;
  countersTotal?: number;
  countersOnline?: number;
  hourly?: { hour: string | number; in_count?: string | number; out_count?: string | number }[];
}

interface ApiCounter {
  id?: number;
  uuid?: string;
  name?: string;
  model?: string;
  firmware?: string;
  is_online?: boolean;
  status?: string;
  battery_percent?: number;
  last_heartbeat?: string;
  today_in?: string | number;
  today_out?: string | number;
  location_name?: string;
  connection_type?: string;
}

function mapApiData(overview: ApiOverview, apiCounters: ApiCounter[], yesterdayOverview: ApiOverview | null = null): DashboardData {
  const hourlyData = (overview.hourly ?? []).map((item) => ({
    hour: String(item.hour).padStart(2, "0"),
    inCount: toNum(item.in_count),
    outCount: toNum(item.out_count),
  }));

  const peak = hourlyData.reduce(
    (best, item) => (item.inCount > best.inCount ? item : best),
    { hour: "--", inCount: 0, outCount: 0 }
  );

  const activeHours = hourlyData.filter((item) => item.inCount > 0).length || 1;
  const dagTotaalIn = toNum(overview.totalIn);

  const counters: CounterDevice[] = apiCounters.map((c) => {
    const isOnline =
      typeof c.is_online === "boolean"
        ? c.is_online
        : String(c.status ?? "").toLowerCase() === "online";
    return {
      id: c.uuid ?? String(c.id ?? ""),
      uuid: c.uuid ?? String(c.id ?? ""),
      name: c.name ?? `Teller ${c.uuid ?? c.id}`,
      location: c.location_name ?? "Hoofdingang",
      online: isOnline,
      countIn: toNum(c.today_in),
      countOut: toNum(c.today_out),
      firmware: c.firmware ?? "onbekend",
      battery: toNum(c.battery_percent),
      connection: c.connection_type ? c.connection_type.toUpperCase() : "BLE",
      lastHeartbeat: c.last_heartbeat ?? "",
      status: c.status ?? (isOnline ? "online" : "offline"),
    };
  });

  const onlineCount = counters.filter((c) => c.online).length;
  const offlineCount = counters.filter((c) => !c.online).length;
  const liveTelling = toNum(overview.occupancy);

  return {
    liveTelling,
    dagTotaalIn,
    dagTotaalOut: toNum(overview.totalOut),
    weekTotaal: toNum(overview.weekTotal),
    maandTotaal: toNum(overview.monthTotal),
    yesterdayDagTotaalIn: yesterdayOverview ? toNum(yesterdayOverview.totalIn) : 0,
    peakHour: peak.hour === "--" ? "--:--" : `${peak.hour}:00`,
    peakHourCount: peak.inCount,
    avgPerHour: Math.round(dagTotaalIn / activeHours),
    status: deriveStatus(liveTelling),
    counters,
    onlineCount,
    offlineCount,
    hourlyData,
    lastUpdated: new Date(),
    heartbeatOnline: true,
  };
}

function buildAlerts(data: DashboardData): Alert[] {
  const alerts: Alert[] = [];

  data.counters.filter((c) => !c.online).forEach((c, i) => {
    alerts.push({
      id: `offline-${c.uuid}-${i}`,
      type: "error",
      message: `${c.name} is offline. Controleer verbinding en voeding.`,
      time: c.lastHeartbeat ? formatLastSeen(c.lastHeartbeat) : "nu",
      read: false,
    });
  });

  data.counters.filter((c) => c.battery > 0 && c.battery < 20).forEach((c, i) => {
    alerts.push({
      id: `battery-${c.uuid}-${i}`,
      type: "warning",
      message: `${c.name} batterij is laag (${c.battery}%).`,
      time: "nu",
      read: false,
    });
  });

  if (data.peakHourCount > 0) {
    alerts.push({
      id: "peak-hour",
      type: "info",
      message: `Drukste uur vandaag: ${data.peakHour} met ${data.peakHourCount} bezoekers.`,
      time: "live",
      read: true,
    });
  }

  alerts.push({
    id: "day-summary",
    type: "info",
    message: `Live: ${data.liveTelling} aanwezig · ${data.dagTotaalIn} in · ${data.dagTotaalOut} uit vandaag.`,
    time: "live",
    read: true,
  });

  return alerts;
}

function getOrgParams(user: DetepoUser | null): Record<string, string> {
  const orgId = user?.role !== "platform_admin" ? user?.org?.id : null;
  return orgId ? { org_id: String(orgId) } : {};
}

async function apiGet<T>(
  path: string,
  token: string | null,
  params: Record<string, string> = {}
): Promise<T> {
  const query = new URLSearchParams({ ...params, _: String(Date.now()) });
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Cache-Control": "no-cache",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${DETEPO_API_BASE}${path}?${query}`, { headers });
  if (!response.ok) {
    throw new Error(`${path} fout (${response.status})`);
  }
  return response.json() as Promise<T>;
}

async function loadDashboard(
  user: DetepoUser | null,
  token: string | null
): Promise<DashboardData> {
  const orgParams = getOrgParams(user);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const [overview, countersRaw, yesterdayOverview] = await Promise.all([
    apiGet<ApiOverview>("/overview", token, orgParams),
    apiGet<ApiCounter[]>("/counters", token, orgParams),
    apiGet<ApiOverview>("/overview", token, { ...orgParams, date: yesterdayStr }).catch(() => null),
  ]);

  const apiCounters = Array.isArray(countersRaw) ? countersRaw : [];
  return mapApiData(overview, apiCounters, yesterdayOverview as ApiOverview | null);
}

export function useDashboardData(
  user: DetepoUser | null,
  token: string | null,
  enabled: boolean
) {
  const [data, setData] = useState<DashboardData>(baseData);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const next = await loadDashboard(user, token);
      setData(next);
      setAlerts(buildAlerts(next));
      setConnectionError(false);
    } catch {
      setData((prev) => ({ ...prev, heartbeatOnline: false }));
      setConnectionError(true);
      setAlerts((prev) =>
        prev.some((a) => a.id === "conn-error")
          ? prev
          : [
              {
                id: "conn-error",
                type: "warning",
                message:
                  "Kan het dashboard niet bereiken. De app blijft het automatisch proberen.",
                time: "nu",
                read: false,
              },
              ...prev.filter((a) => a.id !== "conn-error"),
            ]
      );
    } finally {
      setLoading(false);
    }
  }, [enabled, token, user?.id, user?.org?.id, user?.role]);

  useEffect(() => {
    if (!enabled) {
      setData(baseData);
      setAlerts([]);
      setConnectionError(false);
      return;
    }
    void refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [enabled, refresh]);

  const markAlertRead = useCallback((id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
  }, []);

  return { data, alerts, loading, refresh, markAlertRead, connectionError };
}

export { formatLastSeen };
