import { useState, useEffect, useCallback, useRef } from "react";
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
  lastWeekTotaal: number;
  lastMonthTotaal: number;
  peakHour: string;
  peakHourCount: number;
  avgPerHour: number;
  status: "calm" | "busy" | "critical";
  counters: CounterDevice[];
  onlineCount: number;
  offlineCount: number;
  hourlyData: { hour: string; inCount: number; outCount: number }[];
  dailyHistory: { date: string; inCount: number; outCount: number }[];
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
  lastWeekTotaal: 0,
  lastMonthTotaal: 0,
  peakHour: "--:--",
  peakHourCount: 0,
  avgPerHour: 0,
  status: "calm",
  counters: [],
  onlineCount: 0,
  offlineCount: 0,
  hourlyData: [],
  dailyHistory: [],
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

function mapApiData(
  overview: ApiOverview,
  apiCounters: ApiCounter[],
  yesterdayOverview: ApiOverview | null = null,
  lastWeekOverview: ApiOverview | null = null,
  lastMonthOverview: ApiOverview | null = null,
  dailyHistory: { date: string; inCount: number; outCount: number }[] = [],
): DashboardData {
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
    lastWeekTotaal: lastWeekOverview
      ? toNum(lastWeekOverview.weekTotal ?? lastWeekOverview.totalIn)
      : 0,
    lastMonthTotaal: lastMonthOverview
      ? toNum(lastMonthOverview.monthTotal ?? lastMonthOverview.totalIn)
      : 0,
    peakHour: peak.hour === "--" ? "--:--" : `${peak.hour}:00`,
    peakHourCount: peak.inCount,
    avgPerHour: Math.round(dagTotaalIn / activeHours),
    status: deriveStatus(liveTelling),
    counters,
    onlineCount,
    offlineCount,
    hourlyData,
    dailyHistory,
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
  token: string | null,
  prevDailyHistory: { date: string; inCount: number; outCount: number }[] = [],
): Promise<DashboardData> {
  const orgParams = getOrgParams(user);

  const today = new Date();
  const ymd = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  // Previous 7-day window: 14 days ago through 8 days ago
  const lastWeekFrom = new Date(today);
  lastWeekFrom.setDate(today.getDate() - 13);
  const lastWeekTo = new Date(today);
  lastWeekTo.setDate(today.getDate() - 7);

  // Previous 30-day window: 60 days ago through 31 days ago
  const lastMonthFrom = new Date(today);
  lastMonthFrom.setDate(today.getDate() - 59);
  const lastMonthTo = new Date(today);
  lastMonthTo.setDate(today.getDate() - 30);

  const [overview, countersRaw, yesterdayOverview, lastWeekOverview, lastMonthOverview] = await Promise.all([
    apiGet<ApiOverview>("/overview", token, orgParams),
    apiGet<ApiCounter[]>("/counters", token, orgParams),
    apiGet<ApiOverview>("/overview", token, { ...orgParams, date: ymd(yesterday) }).catch(() => null),
    apiGet<ApiOverview>("/overview", token, { ...orgParams, from: ymd(lastWeekFrom), to: ymd(lastWeekTo) }).catch(() => null),
    apiGet<ApiOverview>("/overview", token, { ...orgParams, from: ymd(lastMonthFrom), to: ymd(lastMonthTo) }).catch(() => null),
  ]);

  const apiCounters = Array.isArray(countersRaw) ? countersRaw : [];
  return mapApiData(
    overview,
    apiCounters,
    yesterdayOverview as ApiOverview | null,
    lastWeekOverview as ApiOverview | null,
    lastMonthOverview as ApiOverview | null,
    prevDailyHistory,
  );
}

async function loadDailyHistory(
  user: DetepoUser | null,
  token: string | null,
  days: number = 30,
): Promise<{ date: string; inCount: number; outCount: number }[]> {
  const orgParams = getOrgParams(user);
  const ymd = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const today = new Date();
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(ymd(d));
  }
  const results = await Promise.all(
    dates.map((date) =>
      apiGet<ApiOverview>("/overview", token, { ...orgParams, date })
        .then((res) => ({
          date,
          inCount: toNum(res.totalIn),
          outCount: toNum(res.totalOut),
        }))
        .catch(() => ({ date, inCount: 0, outCount: 0 })),
    ),
  );
  return results;
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

  const dailyHistoryRef = useRef<{ date: string; inCount: number; outCount: number }[]>([]);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const next = await loadDashboard(user, token, dailyHistoryRef.current);
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
      dailyHistoryRef.current = [];
      return;
    }
    void refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const fetchHistory = async () => {
      try {
        const next = await loadDailyHistory(user, token, 30);
        if (cancelled) return;
        dailyHistoryRef.current = next;
        setData((prev) => ({ ...prev, dailyHistory: next }));
      } catch {
        // ignore — will retry on next interval
      }
    };
    void fetchHistory();
    const interval = setInterval(fetchHistory, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [enabled, token, user?.id, user?.org?.id, user?.role]);

  const markAlertRead = useCallback((id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
  }, []);

  return { data, alerts, loading, refresh, markAlertRead, connectionError };
}

export { formatLastSeen };
