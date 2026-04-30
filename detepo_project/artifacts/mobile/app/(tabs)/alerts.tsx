import { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useDashboard } from "@/contexts/DashboardContext";
import { AlertRow } from "@/components/AlertRow";
import * as Haptics from "expo-haptics";

const FILTERS = ["Alle", "Fouten", "Waarschuwingen", "Info"] as const;

export default function AlertsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { alerts, markAlertRead } = useDashboard();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Alle");
  const isWeb = Platform.OS === "web";

  const filteredAlerts = alerts.filter((a) => {
    if (filter === "Alle") return true;
    if (filter === "Fouten") return a.type === "error";
    if (filter === "Waarschuwingen") return a.type === "warning";
    return a.type === "info";
  });

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: isWeb ? 67 : insets.top + 10, paddingBottom: isWeb ? 34 + 84 : insets.bottom + 84 },
      ]}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>
        Meldingen
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
      >
        {FILTERS.map((f) => (
          <Pressable
            key={f}
            onPress={() => {
              Haptics.selectionAsync();
              setFilter(f);
            }}
            style={[
              styles.chip,
              {
                backgroundColor:
                  f === filter ? colors.blue : colors.surface1,
                borderColor:
                  f === filter ? colors.blue : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color:
                    f === filter ? "#fff" : colors.textSecondary,
                },
              ]}
            >
              {f}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {filteredAlerts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
            Geen meldingen
          </Text>
        </View>
      ) : (
        filteredAlerts.map((alert) => (
          <AlertRow key={alert.id} alert={alert} onPress={markAlertRead} />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  filterRow: {
    flexGrow: 0,
  },
  filterContent: {
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 10,
    fontWeight: "600",
  },
  empty: {
    alignItems: "center",
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 14,
  },
});
