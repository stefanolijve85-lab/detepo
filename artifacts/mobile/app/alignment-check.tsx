import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Platform, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams, Redirect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboard } from "@/contexts/DashboardContext";
import { SignalBars, rssiQuality, rssiToBars } from "@/components/SignalBars";

const POLL_MS = 3000;

export default function AlignmentCheckScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, loading } = useAuth();
  const { data, refresh } = useDashboard();
  const params = useLocalSearchParams<{ uuid?: string; name?: string }>();
  const uuid = String(params.uuid ?? "");
  const fallbackName = String(params.name ?? "");
  const isWeb = Platform.OS === "web";

  const [history, setHistory] = useState<number[]>([]);
  const lastSampledRef = useRef<number>(0);

  const counter = useMemo(
    () => data.counters.find((c) => c.uuid === uuid || c.id === uuid),
    [data.counters, uuid],
  );

  const rssi = counter?.wifiRssi ?? null;
  const name = counter?.name ?? fallbackName ?? t("alignment.unknownDevice");
  const quality = rssiQuality(rssi);
  const bars = rssiToBars(rssi);

  // Keep a rolling history of the last ~30 samples so the user sees movement
  useEffect(() => {
    if (rssi == null) return;
    const now = Date.now();
    if (now - lastSampledRef.current < 1000) return;
    lastSampledRef.current = now;
    setHistory((prev) => [...prev.slice(-29), rssi]);
  }, [rssi, data.lastUpdated]);

  // Force-refresh more often while this screen is open
  useEffect(() => {
    const id = setInterval(() => {
      void refresh();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  if (loading) return null;
  if (!isAuthenticated) return <Redirect href="/login" />;

  const max = -30;
  const min = -95;
  const pct = rssi == null ? 0 : Math.max(0, Math.min(1, (rssi - min) / (max - min)));

  const ringColor =
    quality === "excellent" || quality === "good"
      ? colors.green
      : quality === "fair"
      ? colors.amber
      : quality === "poor"
      ? colors.red
      : colors.textTertiary;

  // SVG ring
  const SIZE = 200;
  const STROKE = 14;
  const R = (SIZE - STROKE) / 2;
  const C = 2 * Math.PI * R;
  const dash = C * pct;

  const tip =
    quality === "excellent"
      ? t("alignment.tip.excellent")
      : quality === "good"
      ? t("alignment.tip.good")
      : quality === "fair"
      ? t("alignment.tip.fair")
      : quality === "poor"
      ? t("alignment.tip.poor")
      : t("alignment.tip.none");

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: isWeb ? 20 : insets.top + 10, paddingBottom: insets.bottom + 32 },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Feather name="x" size={20} color={colors.textSecondary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
            {t("alignment.title")}
          </Text>
          <Text style={[styles.headerSub, { color: colors.textTertiary }]} numberOfLines={1}>
            {name}
          </Text>
        </View>
      </View>

      {/* Gauge */}
      <View style={[styles.gaugeCard, { backgroundColor: colors.surface1 }]}>
        <Svg width={SIZE} height={SIZE}>
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={colors.surface2}
            strokeWidth={STROKE}
            fill="none"
          />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={ringColor}
            strokeWidth={STROKE}
            fill="none"
            strokeDasharray={`${dash} ${C - dash}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </Svg>
        <View style={styles.gaugeCenter}>
          <Text style={[styles.gaugeValue, { color: colors.foreground }]}>
            {rssi != null ? `${rssi}` : "—"}
          </Text>
          <Text style={[styles.gaugeUnit, { color: colors.textTertiary }]}>dBm</Text>
          <View style={{ marginTop: 6 }}>
            <SignalBars rssi={rssi} size="md" />
          </View>
        </View>
      </View>

      {/* Quality label */}
      <View style={[styles.qualityRow, { backgroundColor: colors.surface1 }]}>
        <View style={[styles.qualityDot, { backgroundColor: ringColor }]} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.qualityLabel, { color: colors.textTertiary }]}>
            {t("alignment.qualityLabel")}
          </Text>
          <Text style={[styles.qualityValue, { color: ringColor }]}>
            {t(`signal.quality.${quality}` as const)} · {bars}/4
          </Text>
        </View>
        <Text style={[styles.live, { color: colors.green }]}>● {t("common.live")}</Text>
      </View>

      {/* Live mini-history */}
      {history.length > 1 && (
        <View style={[styles.historyCard, { backgroundColor: colors.surface1 }]}>
          <Text style={[styles.historyLabel, { color: colors.textTertiary }]}>
            {t("alignment.historyLabel")}
          </Text>
          <View style={styles.barRow}>
            {history.map((v, i) => {
              const h = Math.max(2, ((v - min) / (max - min)) * 36);
              const c =
                rssiToBars(v) >= 3
                  ? colors.green
                  : rssiToBars(v) === 2
                  ? colors.amber
                  : colors.red;
              return <View key={i} style={[styles.histBar, { height: h, backgroundColor: c }]} />;
            })}
          </View>
        </View>
      )}

      {/* Tip */}
      <View style={[styles.tipCard, { backgroundColor: colors.surface1 }]}>
        <Feather name="info" size={14} color={colors.cyan} />
        <Text style={[styles.tipText, { color: colors.textSecondary }]}>{tip}</Text>
      </View>

      {/* Status */}
      <Text style={[styles.statusText, { color: colors.textTertiary }]}>
        {counter?.online ? t("alignment.deviceOnline") : t("alignment.deviceOffline")}
        {rssi == null ? `  ·  ${t("alignment.noSignalData")}` : ""}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", letterSpacing: -0.3 },
  headerSub: { fontSize: 11, marginTop: 2 },
  gaugeCard: {
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  gaugeCenter: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  gaugeValue: { fontSize: 42, fontWeight: "800", letterSpacing: -1 },
  gaugeUnit: { fontSize: 11, fontWeight: "600", letterSpacing: 1, marginTop: -4 },
  qualityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
  },
  qualityDot: { width: 10, height: 10, borderRadius: 5 },
  qualityLabel: { fontSize: 9, letterSpacing: 1.2, fontWeight: "500" },
  qualityValue: { fontSize: 14, fontWeight: "700", marginTop: 2 },
  live: { fontSize: 9, fontWeight: "700", letterSpacing: 0.8 },
  historyCard: { borderRadius: 14, padding: 14, gap: 8 },
  historyLabel: { fontSize: 9, letterSpacing: 1.2, fontWeight: "500" },
  barRow: { flexDirection: "row", alignItems: "flex-end", gap: 3, height: 40 },
  histBar: { flex: 1, borderRadius: 1.5, minHeight: 2 },
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 14,
  },
  tipText: { fontSize: 12, lineHeight: 17, flex: 1 },
  statusText: { fontSize: 10, textAlign: "center", marginTop: 4 },
});
