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
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useDashboard } from "@/contexts/DashboardContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { AlertRow } from "@/components/AlertRow";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguagePicker } from "@/components/LanguagePicker";
import * as Haptics from "expo-haptics";

type FilterKey = "all" | "errors" | "warnings" | "info";

export default function AlertsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { alerts, markAlertRead } = useDashboard();
  const { t } = useLanguage();
  const [filter, setFilter] = useState<FilterKey>("all");
  const isWeb = Platform.OS === "web";

  const filters: Array<{ key: FilterKey; label: string }> = [
    { key: "all", label: t("alerts.filter.all") },
    { key: "errors", label: t("alerts.filter.errors") },
    { key: "warnings", label: t("alerts.filter.warnings") },
    { key: "info", label: t("alerts.filter.info") },
  ];

  const filteredAlerts = alerts.filter((a) => {
    if (filter === "all") return true;
    if (filter === "errors") return a.type === "error";
    if (filter === "warnings") return a.type === "warning";
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
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>{t("alerts.title")}</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push("/notification-settings")}
            style={[styles.gearBtn, { backgroundColor: colors.surface1 }]}
            hitSlop={6}
            accessibilityLabel={t("alerts.openSettings")}
          >
            <Feather name="settings" size={16} color={colors.textSecondary} />
          </Pressable>
          <LanguagePicker />
          <ThemeToggle />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
      >
        {filters.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => {
              Haptics.selectionAsync();
              setFilter(f.key);
            }}
            style={[
              styles.chip,
              {
                backgroundColor: f.key === filter ? colors.blue : colors.surface1,
                borderColor: f.key === filter ? colors.blue : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: f.key === filter ? "#fff" : colors.textSecondary },
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {filteredAlerts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
            {t("alerts.empty")}
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
  container: { flex: 1 },
  content: { padding: 16, gap: 8 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 20, fontWeight: "700", letterSpacing: -0.4 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  gearBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  filterRow: { flexGrow: 0 },
  filterContent: { gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 10, fontWeight: "600" },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyText: { fontSize: 14 },
});
