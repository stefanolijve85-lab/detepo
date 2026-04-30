import { ScrollView, View, Text, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useDashboard } from "@/contexts/DashboardContext";
import { InsightCard } from "@/components/InsightCard";
import { LineChart } from "@/components/LineChart";

export default function InsightsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data } = useDashboard();
  const isWeb = Platform.OS === "web";

  const flowBalance = data.dagTotaalIn - data.dagTotaalOut;
  const heartbeatText = data.heartbeatOnline
    ? `Dashboard heartbeat actief · ${data.lastUpdated.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
    : "Dashboard tijdelijk niet bereikbaar. Automatisch opnieuw proberen.";

  const insights = [
    {
      title: "Live heartbeat",
      body: heartbeatText,
    },
    {
      title: "Bezoekersstroom vandaag",
      body:
        flowBalance >= 0
          ? `${data.dagTotaalIn} bezoekers binnengekomen, ${data.dagTotaalOut} vertrokken. Live bezetting: ${data.liveTelling} personen.`
          : `${Math.abs(flowBalance)} meer bezoekers vertrokken dan binnengekomen. Controleer de richting van je tellers.`,
    },
    {
      title: "Week & maand overzicht",
      body: `Deze week: ${data.weekTotaal} bezoekers. Deze maand: ${data.maandTotaal} bezoekers totaal.`,
    },
    {
      title: "Drukste uur vandaag",
      body:
        data.peakHourCount > 0
          ? `Het drukste uur is ${data.peakHour} met ${data.peakHourCount} inkomende bezoekers.`
          : "Nog geen piekuur gemeten — data wordt elke 5 seconden bijgewerkt.",
    },
    {
      title: "Tellergezondheid",
      body: `${data.onlineCount} van ${data.counters.length} teller${data.counters.length !== 1 ? "s" : ""} online. ${data.offlineCount > 0 ? `${data.offlineCount} offline — controleer voeding en verbinding.` : "Alle tellers bereikbaar."}`,
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: isWeb ? 67 : insets.top + 10, paddingBottom: isWeb ? 34 + 84 : insets.bottom + 84 },
      ]}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>Inzichten</Text>

      {/* Stats grid */}
      <View style={styles.row}>
        <View style={[styles.statCard, { backgroundColor: colors.surface1 }]}>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>DAG TOTAAL</Text>
          <Text style={[styles.statValue, { color: colors.cyan }]}>{data.dagTotaalIn}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface1 }]}>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>WEEK</Text>
          <Text style={[styles.statValue, { color: "#8B5CF6" }]}>{data.weekTotaal}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface1 }]}>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>MAAND</Text>
          <Text style={[styles.statValue, { color: colors.amber }]}>{data.maandTotaal}</Text>
        </View>
      </View>

      {/* Avg / Live */}
      <View style={styles.row}>
        <View style={[styles.statCard, { backgroundColor: colors.surface1 }]}>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>GEM/UUR</Text>
          <Text style={[styles.statValue, { color: colors.textSecondary }]}>{data.avgPerHour}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface1 }]}>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>LIVE NU</Text>
          <Text style={[styles.statValue, { color: colors.green }]}>{data.liveTelling}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface1 }]}>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>PIEKUUR</Text>
          <Text style={[styles.statValueSm, { color: colors.amber }]}>{data.peakHour}</Text>
        </View>
      </View>

      {/* Line chart */}
      {data.hourlyData.length > 0 && <LineChart data={data.hourlyData} />}

      {/* Insights */}
      <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>AI INZICHTEN</Text>
      {insights.map((insight) => (
        <InsightCard key={insight.title} title={insight.title} body={insight.body} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 10 },
  title: { fontSize: 22, fontWeight: "700", letterSpacing: -0.4 },
  row: { flexDirection: "row", gap: 8 },
  statCard: { flex: 1, borderRadius: 14, padding: 12, gap: 4 },
  statLabel: { fontSize: 8, letterSpacing: 1.2, fontWeight: "500" },
  statValue: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5 },
  statValueSm: { fontSize: 18, fontWeight: "700", letterSpacing: -0.5 },
  sectionLabel: { fontSize: 9, letterSpacing: 1.5, fontWeight: "500", marginTop: 4 },
});
