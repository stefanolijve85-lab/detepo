import { useMemo, useState } from "react";
import { ScrollView, View, Text, StyleSheet, Platform, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useDashboard } from "@/contexts/DashboardContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguagePicker } from "@/components/LanguagePicker";
import { CollapsibleDevice } from "@/components/CollapsibleDevice";
import type { CounterDevice } from "@/hooks/useDashboardData";

interface LocationGroup {
  name: string;
  counters: CounterDevice[];
  onlineCount: number;
}

export default function LocationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data } = useDashboard();
  const { t } = useLanguage();
  const isWeb = Platform.OS === "web";
  const [openLoc, setOpenLoc] = useState<Record<string, boolean>>({});

  const groups: LocationGroup[] = useMemo(() => {
    const map = new Map<string, CounterDevice[]>();
    data.counters.forEach((c) => {
      const key = (c.location ?? "").trim() || "—";
      const list = map.get(key) ?? [];
      list.push(c);
      map.set(key, list);
    });
    return Array.from(map.entries())
      .map(([name, counters]) => ({
        name,
        counters,
        onlineCount: counters.filter((c) => c.online).length,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data.counters]);

  const totalCounters = data.counters.length;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: isWeb ? 67 : insets.top + 10, paddingBottom: isWeb ? 34 + 84 : insets.bottom + 84 },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>{t("locations.title")}</Text>
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
            {t("locations.subtitle", { count: groups.length, counters: totalCounters })}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <LanguagePicker />
          <ThemeToggle />
        </View>
      </View>

      {groups.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.surface1 }]}>
          <Feather name="map-pin" size={22} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {t("locations.empty.title")}
          </Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            {t("locations.empty.sub")}
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {groups.map((g) => {
            const isOpen = openLoc[g.name] !== false; // default open
            return (
              <View key={g.name} style={[styles.locationCard, { backgroundColor: colors.surface1 }]}>
                <Pressable
                  onPress={() => setOpenLoc((prev) => ({ ...prev, [g.name]: !isOpen }))}
                  style={styles.locationHead}
                >
                  <View style={[styles.locIcon, { backgroundColor: "rgba(61,142,255,0.12)" }]}>
                    <Feather name="map-pin" size={16} color={colors.blue} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.locName, { color: colors.foreground }]} numberOfLines={1}>
                      {g.name}
                    </Text>
                    <Text style={[styles.locSub, { color: colors.textTertiary }]}>
                      {g.counters.length === 1
                        ? t("locations.counter")
                        : t("locations.counters", { n: g.counters.length })}
                      {" · "}
                      {g.onlineCount}/{g.counters.length} {t("common.online").toLowerCase()}
                    </Text>
                  </View>
                  <Feather
                    name={isOpen ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={colors.textTertiary}
                  />
                </Pressable>
                {isOpen && (
                  <View style={styles.countersList}>
                    {g.counters.map((device) => (
                      <CollapsibleDevice key={device.id} device={device} />
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 10 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  title: { fontSize: 22, fontWeight: "700", letterSpacing: -0.4 },
  subtitle: { fontSize: 11, marginTop: 2 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  list: { gap: 10 },
  locationCard: { borderRadius: 14, padding: 12, gap: 10 },
  locationHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  locIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  locName: { fontSize: 14, fontWeight: "700" },
  locSub: { fontSize: 11, marginTop: 2 },
  countersList: { gap: 8 },
  emptyCard: {
    borderRadius: 14,
    padding: 28,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: { fontSize: 14, fontWeight: "700", marginTop: 2 },
  emptySub: { fontSize: 11, textAlign: "center", lineHeight: 16 },
});
