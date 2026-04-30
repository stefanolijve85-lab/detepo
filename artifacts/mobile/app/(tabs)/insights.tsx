import { ScrollView, View, Text, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useDashboard } from "@/contexts/DashboardContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { InsightCard } from "@/components/InsightCard";
import { LineChart } from "@/components/LineChart";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguagePicker } from "@/components/LanguagePicker";
import { PctBadge } from "@/components/PctBadge";

function StatCard({
  label,
  value,
  previous,
  compareLabel,
}: {
  label: string;
  value: number | string;
  previous?: number;
  compareLabel?: string;
}) {
  const colors = useColors();
  return (
    <View style={[st.card, { backgroundColor: colors.surface1 }]}>
      <Text style={[st.label, { color: colors.textTertiary }]} numberOfLines={1}>
        {label}
      </Text>
      <Text
        style={[st.value, { color: colors.foreground }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {typeof value === "number" ? String(value) : value}
      </Text>
      {previous != null && compareLabel && typeof value === "number" ? (
        <PctBadge current={value} previous={previous} label={compareLabel} size="sm" />
      ) : (
        <View style={{ height: 16 }} />
      )}
    </View>
  );
}

export default function InsightsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data } = useDashboard();
  const { t, locale, formatNumber } = useLanguage();
  const isWeb = Platform.OS === "web";

  const flowBalance = data.dagTotaalIn - data.dagTotaalOut;
  const heartbeatText = data.heartbeatOnline
    ? t("insight.heartbeat.active", {
        time: data.lastUpdated.toLocaleTimeString(locale, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      })
    : t("insight.heartbeat.inactive");
  const offlinePart =
    data.offlineCount > 0
      ? t("insight.health.offline", { n: data.offlineCount })
      : t("insight.health.allOk");

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: isWeb ? 67 : insets.top + 10,
          paddingBottom: isWeb ? 34 + 84 : insets.bottom + 84,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>{t("insights.title")}</Text>
        <View style={styles.headerActions}>
          <LanguagePicker />
          <ThemeToggle />
        </View>
      </View>

      {/* Stat cards — 2 columns */}
      <View style={styles.row}>
        <StatCard
          label={t("insights.today")}
          value={data.dagTotaalIn}
          previous={data.yesterdayDagTotaalIn}
          compareLabel={t("home.vsYesterday")}
        />
        <StatCard
          label={t("insights.7days")}
          value={data.weekTotaal}
          previous={data.lastWeekTotaal}
          compareLabel={t("insights.vsPrev")}
        />
      </View>

      <View style={styles.row}>
        <StatCard
          label={t("insights.30days")}
          value={data.maandTotaal}
          previous={data.lastMonthTotaal}
          compareLabel={t("insights.vsPrev")}
        />
        <StatCard label={t("insights.avgPerHour")} value={data.avgPerHour} />
      </View>

      <View style={styles.row}>
        <StatCard label={t("insights.liveNow")} value={data.liveTelling} />
        <StatCard label={t("insights.peakHour")} value={data.peakHour} />
      </View>

      {/* Chart */}
      <LineChart data={data.hourlyData} dailyHistory={data.dailyHistory} />

      {/* Insight cards */}
      <InsightCard
        title={t("insight.heartbeat.title")}
        body={heartbeatText}
      />
      <InsightCard
        title={t("insight.flow.title")}
        body={
          flowBalance >= 0
            ? t("insight.flow.positive", {
                in: formatNumber(data.dagTotaalIn),
                out: formatNumber(data.dagTotaalOut),
                live: formatNumber(data.liveTelling),
              })
            : t("insight.flow.negative", { n: formatNumber(Math.abs(flowBalance)) })
        }
      />
      <InsightCard
        title={t("insight.weekMonth.title")}
        body={t("insight.weekMonth.body", {
          week: formatNumber(data.weekTotaal),
          month: formatNumber(data.maandTotaal),
        })}
      />
      <InsightCard
        title={t("insight.peak.title")}
        body={
          data.peakHourCount > 0
            ? t("insight.peak.with", {
                hour: data.peakHour,
                count: formatNumber(data.peakHourCount),
              })
            : t("insight.peak.without")
        }
      />
      <InsightCard
        title={t("insight.health.title")}
        body={`${t("insight.health.summary", {
          online: data.onlineCount,
          total: data.counters.length,
        })} ${offlinePart}`}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 8 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  title: { fontSize: 22, fontWeight: "700", letterSpacing: -0.4 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  row: { flexDirection: "row", gap: 8 },
});

const st = StyleSheet.create({
  card:  { flex: 1, borderRadius: 14, padding: 12, gap: 4, minHeight: 96 },
  label: { fontSize: 9, letterSpacing: 1.0, fontWeight: "500" },
  value: { fontSize: 24, fontWeight: "700", letterSpacing: -0.5, lineHeight: 30 },
});
