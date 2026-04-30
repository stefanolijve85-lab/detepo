import { useMemo, useState } from "react";
import { ScrollView, View, Text, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useDashboard } from "@/contexts/DashboardContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useInsightGrid } from "@/contexts/WidgetOrderContext";
import { InsightCard } from "@/components/InsightCard";
import { LineChart } from "@/components/LineChart";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguagePicker } from "@/components/LanguagePicker";
import { PctBadge } from "@/components/PctBadge";
import { WidgetGrid2D, GridItem, GridLayout } from "@/components/WidgetGrid2D";

function StatCard({
  label,
  value,
  previous,
  compareLabel,
  small,
}: {
  label: string;
  value: number | string;
  previous?: number;
  compareLabel?: string;
  small?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={[st.card, { backgroundColor: colors.surface1 }]}>
      <Text style={[st.label, { color: colors.textTertiary }]} numberOfLines={1}>
        {label}
      </Text>
      <Text
        style={[small ? st.valueSm : st.value, { color: colors.foreground }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <View style={st.badgeRow}>
        {previous != null && compareLabel && typeof value === "number" ? (
          <PctBadge current={value} previous={previous} label={compareLabel} size="sm" />
        ) : (
          <View style={{ height: 16 }} />
        )}
      </View>
    </View>
  );
}

export default function InsightsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data } = useDashboard();
  const { t, locale, formatNumber } = useLanguage();
  const isWeb = Platform.OS === "web";
  const { layout, setLayout } = useInsightGrid();
  const [scrollEnabled, setScrollEnabled] = useState(true);

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

  const insightTexts = [
    { id: "insight_0", title: t("insight.heartbeat.title"), body: heartbeatText },
    {
      id: "insight_1",
      title: t("insight.flow.title"),
      body:
        flowBalance >= 0
          ? t("insight.flow.positive", {
              in: formatNumber(data.dagTotaalIn),
              out: formatNumber(data.dagTotaalOut),
              live: formatNumber(data.liveTelling),
            })
          : t("insight.flow.negative", { n: formatNumber(Math.abs(flowBalance)) }),
    },
    {
      id: "insight_2",
      title: t("insight.weekMonth.title"),
      body: t("insight.weekMonth.body", {
        week: formatNumber(data.weekTotaal),
        month: formatNumber(data.maandTotaal),
      }),
    },
    {
      id: "insight_3",
      title: t("insight.peak.title"),
      body:
        data.peakHourCount > 0
          ? t("insight.peak.with", {
              hour: data.peakHour,
              count: formatNumber(data.peakHourCount),
            })
          : t("insight.peak.without"),
    },
    {
      id: "insight_4",
      title: t("insight.health.title"),
      body: `${t("insight.health.summary", {
        online: data.onlineCount,
        total: data.counters.length,
      })} ${offlinePart}`,
    },
  ];

  // Build GridItem[] from all possible widget IDs
  const allItems = useMemo((): GridItem[] => {
    const nodeMap: Record<string, React.ReactNode> = {
      today_stat: (
        <StatCard
          label={t("insights.today")}
          value={data.dagTotaalIn}
          previous={data.yesterdayDagTotaalIn}
          compareLabel={t("home.vsYesterday")}
        />
      ),
      week_stat: (
        <StatCard
          label={t("insights.7days")}
          value={data.weekTotaal}
          previous={data.lastWeekTotaal}
          compareLabel={t("insights.vsPrev")}
        />
      ),
      month_stat: (
        <StatCard
          label={t("insights.30days")}
          value={data.maandTotaal}
          previous={data.lastMonthTotaal}
          compareLabel={t("insights.vsPrev")}
        />
      ),
      avg_stat: <StatCard label={t("insights.avgPerHour")} value={data.avgPerHour} />,
      live_stat: <StatCard label={t("insights.liveNow")} value={data.liveTelling} />,
      peak_stat: <StatCard label={t("insights.peakHour")} value={data.peakHour} small />,
      insight_chart: <LineChart data={data.hourlyData} dailyHistory={data.dailyHistory} />,
      ...Object.fromEntries(
        insightTexts.map((ins) => [
          ins.id,
          <InsightCard key={ins.id} title={ins.title} body={ins.body} />,
        ]),
      ),
    };

    return Object.entries(nodeMap).map(([id, node]) => ({ id, node }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, colors, t, formatNumber]);

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
      scrollEnabled={scrollEnabled}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>{t("insights.title")}</Text>
        <View style={styles.headerActions}>
          <LanguagePicker />
          <ThemeToggle />
        </View>
      </View>

      <WidgetGrid2D
        items={allItems}
        layout={layout}
        onLayoutChange={setLayout}
        gap={8}
        onEditModeChange={(editing) => setScrollEnabled(!editing)}
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
});

const st = StyleSheet.create({
  card:    { flex: 1, borderRadius: 14, padding: 12, gap: 4, minHeight: 92 },
  label:   { fontSize: 9, letterSpacing: 1.0, fontWeight: "500" },
  value:   { fontSize: 24, fontWeight: "700", letterSpacing: -0.5 },
  valueSm: { fontSize: 18, fontWeight: "700", letterSpacing: -0.5 },
  badgeRow: { marginTop: 2, minHeight: 16, justifyContent: "center" },
});
