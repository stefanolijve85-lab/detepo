import { ScrollView, View, Text, StyleSheet, RefreshControl, Platform, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useDashboard } from "@/contexts/DashboardContext";
import { useAuth } from "@/contexts/AuthContext";
import { LiveDot } from "@/components/LiveDot";
import { LineChart } from "@/components/LineChart";
import { CounterRow } from "@/components/CounterRow";

// ── Helper: format % change vs yesterday ────────────────────────────────────
function PctBadge({ current, yesterday }: { current: number; yesterday: number }) {
  const colors = useColors();
  if (yesterday <= 0) return null;
  const pct = Math.round(((current - yesterday) / yesterday) * 100);
  const up = pct >= 0;
  const color = up ? colors.green : colors.red;
  const icon: "arrow-up" | "arrow-down" = up ? "arrow-up" : "arrow-down";
  return (
    <View style={[styles.pctBadge, { backgroundColor: up ? "rgba(0,229,160,0.1)" : "rgba(255,59,92,0.1)" }]}>
      <Feather name={icon} size={9} color={color} />
      <Text style={[styles.pctText, { color }]}>{Math.abs(pct)}% vs gisteren</Text>
    </View>
  );
}

// ── Helper: period card with "bekijk" hint ───────────────────────────────────
function PeriodCard({
  label,
  value,
  periodLabel,
}: {
  label: string;
  value: number;
  periodLabel: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.surface1 }]}>
      <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value.toLocaleString("nl-NL")}</Text>
      <View style={styles.periodHint}>
        <Text style={[styles.periodHintText, { color: colors.textTertiary }]}>{periodLabel}</Text>
        <Feather name="bar-chart-2" size={9} color={colors.textTertiary} />
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, loading, refresh, connectionError } = useDashboard();
  const { user, logout } = useAuth();
  const isWeb = Platform.OS === "web";

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "GOEDEMORGEN" : hour < 18 ? "GOEDEMIDDAG" : "GOEDENAVOND";

  const warningCount = data.counters.filter((c) => c.battery > 0 && c.battery <= 40 && c.online).length;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: isWeb ? 67 : insets.top + 10, paddingBottom: isWeb ? 34 + 84 : insets.bottom + 84 },
      ]}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.cyan} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.textTertiary }]}>{greeting}</Text>
          <Text style={[styles.orgName, { color: colors.foreground }]}>
            {user?.org?.name ?? user?.name ?? "Detepo Dashboard"}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <LiveDot heartbeat={data.heartbeatOnline} />
          <Pressable onPress={logout} style={[styles.logoutBtn, { backgroundColor: colors.surface1 }]}>
            <Text style={[styles.logoutText, { color: colors.textSecondary }]}>Uitloggen</Text>
          </Pressable>
        </View>
      </View>

      {/* Connection error */}
      {connectionError && (
        <View style={[styles.errorBanner, { backgroundColor: "rgba(255,59,92,0.08)", borderColor: "rgba(255,59,92,0.2)" }]}>
          <Text style={[styles.errorText, { color: colors.red }]}>
            Dashboard tijdelijk niet bereikbaar — laatste waarden
          </Text>
        </View>
      )}

      {/* ── Actuele Bezetting (full width) ── */}
      <View style={[styles.heroCard, { backgroundColor: colors.surface1 }]}>
        <View style={styles.heroTop}>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>ACTUELE BEZETTING</Text>
          <View style={[styles.livePill, { backgroundColor: "rgba(0,229,160,0.1)" }]}>
            <View style={[styles.liveDot, { backgroundColor: colors.green }]} />
            <Text style={[styles.livePillText, { color: colors.green }]}>Live</Text>
          </View>
        </View>
        <Text style={[styles.heroValue, { color: colors.foreground }]}>{data.liveTelling}</Text>
        <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
          Bezoekers momenteel aanwezig
        </Text>
      </View>

      {/* ── Dag Totaal ── */}
      <View style={[styles.statCard, { backgroundColor: colors.surface1 }]}>
        <Text style={[styles.statLabel, { color: colors.textTertiary }]}>DAG TOTAAL</Text>
        <View style={styles.statRow}>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {data.dagTotaalIn.toLocaleString("nl-NL")}
          </Text>
          <PctBadge current={data.dagTotaalIn} yesterday={data.yesterdayDagTotaalIn} />
        </View>
        <View style={styles.inOutRow}>
          <View style={styles.inOutItem}>
            <View style={[styles.inOutDot, { backgroundColor: colors.green }]} />
            <Text style={[styles.inOutText, { color: colors.textSecondary }]}>In: {data.dagTotaalIn}</Text>
          </View>
          <View style={styles.inOutItem}>
            <View style={[styles.inOutDot, { backgroundColor: "#3D8EFF" }]} />
            <Text style={[styles.inOutText, { color: colors.textSecondary }]}>Uit: {data.dagTotaalOut}</Text>
          </View>
        </View>
      </View>

      {/* ── Week + Maand ── */}
      <View style={styles.row}>
        <PeriodCard
          label="WEEK TOTAAL"
          value={data.weekTotaal}
          periodLabel="Deze week"
        />
        <PeriodCard
          label="MAAND TOTAAL"
          value={data.maandTotaal}
          periodLabel="Deze maand"
        />
      </View>

      {/* ── Hourly line chart ── */}
      <LineChart data={data.hourlyData} />

      {/* ── Batterij ── */}
      {data.counters.length > 0 && (() => {
        const avgBattery = Math.round(
          data.counters.reduce((s, c) => s + c.battery, 0) / data.counters.length
        );
        return (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>BATTERIJ</Text>
            <View style={[styles.battCard, { backgroundColor: colors.surface1 }]}>
              <View style={styles.battRow}>
                <Text style={[styles.battPct, { color: colors.foreground }]}>
                  {avgBattery}%
                </Text>
                <Text style={[styles.battSub, { color: colors.textSecondary }]}>
                  Gemiddeld over {data.counters.length} apparaat{data.counters.length !== 1 ? "en" : ""}
                </Text>
              </View>
              <View style={[styles.battBarBg, { backgroundColor: colors.surface2 }]}>
                <View
                  style={[
                    styles.battBarFill,
                    {
                      width: `${Math.min(100, avgBattery)}%`,
                      backgroundColor: avgBattery > 40 ? colors.green : avgBattery > 20 ? colors.amber : colors.red,
                    },
                  ]}
                />
              </View>
            </View>
          </>
        );
      })()}

      {/* ── Tellers ── */}
      {data.counters.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>TELLERS</Text>
          {data.counters.map((counter) => (
            <CounterRow key={counter.id} counter={counter} />
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 8 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  greeting: { fontSize: 10, letterSpacing: 1.5, fontWeight: "500" },
  orgName: { fontSize: 18, fontWeight: "700", letterSpacing: -0.3, marginTop: 2 },
  headerRight: { alignItems: "flex-end", gap: 6 },
  logoutBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  logoutText: { fontSize: 10, fontWeight: "600" },
  errorBanner: { borderRadius: 10, borderWidth: 1, padding: 10 },
  errorText: { fontSize: 11, textAlign: "center" },
  heroCard: { borderRadius: 14, padding: 16, gap: 4 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  livePill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  livePillText: { fontSize: 10, fontWeight: "600" },
  heroValue: { fontSize: 52, fontWeight: "700", letterSpacing: -2, lineHeight: 58 },
  heroSub: { fontSize: 11, marginTop: 2 },
  row: { flexDirection: "row", gap: 8 },
  statCard: { flex: 1, borderRadius: 14, padding: 14, gap: 6 },
  statLabel: { fontSize: 9, letterSpacing: 1.2, fontWeight: "500" },
  statValue: { fontSize: 36, fontWeight: "700", letterSpacing: -1, lineHeight: 40 },
  statRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  pctBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 10 },
  pctText: { fontSize: 9, fontWeight: "600" },
  inOutRow: { flexDirection: "row", gap: 12 },
  inOutItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  inOutDot: { width: 6, height: 6, borderRadius: 3 },
  inOutText: { fontSize: 10 },
  periodHint: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  periodHintText: { fontSize: 9 },
  sectionLabel: { fontSize: 9, letterSpacing: 1.5, fontWeight: "500", marginTop: 4 },
  battCard: { borderRadius: 14, padding: 14, gap: 10 },
  battRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  battPct: { fontSize: 32, fontWeight: "700", letterSpacing: -1 },
  battSub: { fontSize: 12, flex: 1 },
  battBarBg: { height: 8, borderRadius: 4, overflow: "hidden" },
  battBarFill: { height: "100%", borderRadius: 4 },
});
