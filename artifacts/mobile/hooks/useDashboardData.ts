import { useState, useEffect, useCallback, useRef } from "react";
import { DETEPO_API_BASE, DetepoUser } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotifications, type NotificationPrefs } from "@/contexts/NotificationsContext";

type TFn = (key: string, vars?: Record<string, string | number>) => string;

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
  wifiRssi: number | null;
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

function defaultT(k: string, v?: Record<string, string | number>): string {
  if (k === "relativeTime.unknown") return "onbekend";
  if (k === "relativeTime.justNow") return "nu actief";
  if (k === "relativeTime.minutesAgo") return `${v?.n} min geleden`;
  if (k === "relativeTime.hoursAgo") return `${v?.n} uur geleden`;
  if (k === "relativeTime.daysAgo") return `${v?.n} dag geleden`;
  return k;
}

function formatLastSeen(isoString: string | null | undefined, t: TFn = defaultT): string {
  if (!isoString) return t("relativeTime.unknown");
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return t("relativeTime.unknown");
  const now = Date.now();
  const diffMinutes = Math.round((now - date.getTime()) / 60000);
  if (diffMinutes < 2) return t("relativeTime.justNow");
  if (diffMinutes < 60) return t("relativeTime.minutesAgo", { n: diffMinutes });
  if (diffMinutes < 1440) return t("relativeTime.hoursAgo", { n: Math.round(diffMinutes / 60) });
  return t("relativeTime.daysAgo", { n: Math.round(diffMinutes / 1440) });
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
  wifi_rssi?: string | number | null;
  rssi?: string | number | null;
  signal_strength?: string | number | null;
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
    const rawRssi = c.wifi_rssi ?? c.rssi ?? c.signal_strength;
    const rssiNum = rawRssi == null ? null : Number(rawRssi);
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
      wifiRssi: rssiNum != null && Number.isFinite(rssiNum) ? rssiNum : null,
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

function buildAlerts(
  data: DashboardData,
  t: TFn = defaultT,
  prefs?: NotificationPrefs,
): Alert[] {
  const alerts: Alert[] = [];
  const liveTime = t("alerts.time.live");
  const nowTime = t("alerts.time.now");

  data.counters.filter((c) => !c.online).forEach((c, i) => {
    alerts.push({
      id: `offline-${c.uuid}-${i}`,
      type: "error",
      message: t("alerts.message.offline", { name: c.name }),
      time: c.lastHeartbeat ? formatLastSeen(c.lastHeartbeat, t) : nowTime,
      read: false,
    });
  });

  // Battery alerts (gated by prefs)
  if (!prefs || prefs.batteryEnabled) {
    const threshold = prefs?.batteryThreshold ?? 20;
    data.counters
      .filter((c) => c.battery > 0 && c.battery <= threshold)
      .forEach((c, i) => {
        alerts.push({
          id: `battery-${c.uuid}-${i}`,
          type: "warning",
          message: t("alerts.message.battery", { name: c.name, pct: c.battery }),
          time: nowTime,
          read: false,
        });
      });
  }

  // WiFi signal alerts (gated by prefs)
  if (!prefs || prefs.wifiEnabled) {
    const wifiTh = prefs?.wifiThreshold ?? -80;
    data.counters
      .filter((c) => c.online && c.wifiRssi != null && c.wifiRssi <= wifiTh)
      .forEach((c, i) => {
        alerts.push({
          id: `wifi-${c.uuid}-${i}`,
          type: "warning",
          message: t("alerts.message.wifi", { name: c.name, dbm: c.wifiRssi as number }),
          time: nowTime,
          read: false,
        });
      });
  }

  // Alignment / very poor signal
  if (!prefs || prefs.alignmentEnabled) {
    data.counters
      .filter((c) => c.online && c.wifiRssi != null && (c.wifiRssi as number) <= -85)
      .forEach((c, i) => {
        alerts.push({
          id: `alignment-${c.uuid}-${i}`,
          type: "warning",
          message: t("alerts.message.alignment", { name: c.name }),
          time: nowTime,
          read: false,
        });
      });
  }

  // Visitor threshold alert
  if (prefs?.visitorsEnabled && data.liveTelling >= prefs.visitorsThreshold) {
    alerts.push({
      id: `visitors-${prefs.visitorsThreshold}`,
      type: "info",
      message: t("alerts.message.visitors", {
        live: data.liveTelling,
        threshold: prefs.visitorsThreshold,
      }),
      time: liveTime,
      read: false,
    });
  }

  if (data.peakHourCount > 0) {
    alerts.push({
      id: "peak-hour",
      type: "info",
      message: t("alerts.message.peakHour", { hour: data.peakHour, count: data.peakHourCount }),
      time: liveTime,
      read: true,
    });
  }

  alerts.push({
    id: "day-summary",
    type: "info",
    message: t("alerts.message.daySummary", {
      live: data.liveTelling,
      in: data.dagTotaalIn,
      out: data.dagTotaalOut,
    }),
    time: liveTime,
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
  // First, try a SINGLE bulk-range request and parse a daily breakdown if the
  // server returns one (common shapes: `daily`, `series`, `data`, or `days`).
  try {
    const bulk = await apiGet<Record<string, unknown>>("/overview", token, {
      ...orgParams,
      from: dates[0],
      to: dates[dates.length - 1],
    });
    type DayRow = {
      date?: string;
      day?: string;
      label?: string;
      in_count?: string | number;
      out_count?: string | number;
      total_in?: string | number;
      total_out?: string | number;
      totalIn?: string | number;
      totalOut?: string | number;
    };
    const candidates: DayRow[] | undefined =
      (bulk?.daily as DayRow[] | undefined) ??
      (bulk?.series as DayRow[] | undefined) ??
      (bulk?.days as DayRow[] | undefined) ??
      (Array.isArray(bulk?.data) ? (bulk?.data as DayRow[]) : undefined);
    if (Array.isArray(candidates) && candidates.length > 1) {
      const byDate = new Map<string, { inCount: number; outCount: number }>();
      candidates.forEach((row) => {
        const key = String(row.date ?? row.day ?? row.label ?? "").slice(0, 10);
        if (!key) return;
        const inC = toNum(row.in_count ?? row.total_in ?? row.totalIn);
        const outC = toNum(row.out_count ?? row.total_out ?? row.totalOut);
        byDate.set(key, { inCount: inC, outCount: outC });
      });
      if (byDate.size > 1) {
        return dates.map((d) => ({
          date: d,
          inCount: byDate.get(d)?.inCount ?? 0,
          outCount: byDate.get(d)?.outCount ?? 0,
        }));
      }
    }
  } catch {
    // ignore — fall back to per-day loop below
  }

  // Fall back: fetch each day individually. Try `date=` first, then `from=&to=`
  // for deployments that only honour the range form.
  const fetchDay = async (date: string) => {
    try {
      const res = await apiGet<ApiOverview>("/overview", token, { ...orgParams, date });
      const inC = toNum(res.totalIn);
      const outC = toNum(res.totalOut);
      if (inC > 0 || outC > 0) return { date, inCount: inC, outCount: outC };
      // Fall through to range query when single-date returns empty
      throw new Error("empty");
    } catch {
      try {
        const res = await apiGet<ApiOverview>("/overview", token, {
          ...orgParams,
          from: date,
          to: date,
        });
        return { date, inCount: toNum(res.totalIn), outCount: toNum(res.totalOut) };
      } catch {
        return { date, inCount: 0, outCount: 0 };
      }
    }
  };
  const results = await Promise.all(dates.map(fetchDay));
  return results;
}

export function useDashboardData(
  user: DetepoUser | null,
  token: string | null,
  enabled: boolean
) {
  const { t } = useLanguage();
  const { prefs } = useNotifications();
  const tRef = useRef(t);
  const prefsRef = useRef(prefs);
  tRef.current = t;
  prefsRef.current = prefs;

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
      setAlerts(buildAlerts(next, tRef.current, prefsRef.current));
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
                message: tRef.current("alerts.message.connectionError"),
                time: tRef.current("alerts.time.now"),
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

  // Re-derive alerts whenever language or notification prefs change so that
  // toggles take effect immediately and message text follows the active locale.
  useEffect(() => {
    if (!enabled) return;
    setAlerts((prev) => {
      const fresh = buildAlerts(data, t, prefs);
      // Preserve "read" state for matching ids
      const readMap = new Map(prev.map((a) => [a.id, a.read] as const));
      return fresh.map((a) => ({ ...a, read: readMap.get(a.id) ?? a.read }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, prefs, data]);

  const markAlertRead = useCallback((id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
  }, []);

  return { data, alerts, loading, refresh, markAlertRead, connectionError };
}

export { formatLastSeen };
