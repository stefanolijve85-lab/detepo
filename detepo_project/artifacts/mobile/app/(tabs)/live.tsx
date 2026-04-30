import { ScrollView, View, Text, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useDashboard } from "@/contexts/DashboardContext";
import { CounterCard } from "@/components/CounterCard";
import { LineChart } from "@/components/LineChart";

export default function LiveScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data } = useDashboard();
  const isWeb = Platform.OS === "web";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: isWeb ? 67 : insets.top + 10, paddingBottom: isWeb ? 34 + 84 : insets.bottom + 84 },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Live</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Realtime bezoekersstroom
        </Text>
      </View>

      {/* Hourly line chart */}
      <LineChart data={data.hourlyData} />

      {/* Counter cards */}
      {data.counters.map((counter) => (
        <CounterCard key={counter.id} counter={counter} />
      ))}

      {data.counters.length === 0 && (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>
          Live tellerdata wordt opgehaald…
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  header: { marginBottom: 4 },
  title: { fontSize: 22, fontWeight: "700", letterSpacing: -0.4 },
  subtitle: { fontSize: 12, marginTop: 2 },
  empty: {
    fontSize: 12,
    lineHeight: 18,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
});
