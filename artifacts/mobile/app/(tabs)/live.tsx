import { ScrollView, View, Text, StyleSheet, Platform, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useDashboard } from "@/contexts/DashboardContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguagePicker } from "@/components/LanguagePicker";
import { CollapsibleDevice } from "@/components/CollapsibleDevice";

export default function TellerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data } = useDashboard();
  const { t } = useLanguage();
  const isWeb = Platform.OS === "web";

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
          <Text style={[styles.title, { color: colors.foreground }]}>{t("teller.title")}</Text>
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
            {data.counters.length === 0
              ? t("teller.subtitle.empty")
              : t("teller.subtitle.status", { online: data.onlineCount, offline: data.offlineCount })}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <LanguagePicker />
          <ThemeToggle />
        </View>
      </View>

      {/* ── Add options first ── */}
      <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>{t("teller.add")}</Text>

      <Pressable
        onPress={() => router.push("/bluetooth-scan")}
        style={({ pressed }) => [
          styles.optionCard,
          {
            backgroundColor: pressed ? colors.surface2 : colors.surface1,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={[styles.optionIcon, { backgroundColor: "rgba(0,200,224,0.1)" }]}>
          <Feather name="bluetooth" size={22} color={colors.cyan} />
        </View>
        <View style={styles.optionBody}>
          <Text style={[styles.optionTitle, { color: colors.foreground }]} numberOfLines={1}>
            {t("teller.bluetoothTitle")}
          </Text>
          <Text style={[styles.optionDesc, { color: colors.textTertiary }]} numberOfLines={2}>
            {t("teller.bluetoothDesc")}
          </Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.textTertiary} />
      </Pressable>

      <Pressable
        onPress={() =>
          Alert.alert(t("teller.alert.3d.title"), t("teller.alert.3d.body"), [{ text: t("common.ok") }])
        }
        style={({ pressed }) => [
          styles.optionCard,
          {
            backgroundColor: pressed ? colors.surface2 : colors.surface1,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={[styles.optionIcon, { backgroundColor: "rgba(61,142,255,0.1)" }]}>
          <Feather name="wifi" size={22} color={colors.blue} />
        </View>
        <View style={styles.optionBody}>
          <Text style={[styles.optionTitle, { color: colors.foreground }]} numberOfLines={1}>
            {t("teller.wifiTitle")}
          </Text>
          <Text style={[styles.optionDesc, { color: colors.textTertiary }]} numberOfLines={2}>
            {t("teller.wifiDesc")}
          </Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.textTertiary} />
      </Pressable>

      {/* ── Existing tellers below ── */}
      {data.counters.length > 0 ? (
        <>
          <Text style={[styles.sectionLabel, { color: colors.textTertiary, marginTop: 14 }]}>
            {t("teller.your")}
          </Text>
          <View style={styles.list}>
            {data.counters.map((device) => (
              <CollapsibleDevice key={device.id} device={device} />
            ))}
          </View>
        </>
      ) : (
        <View style={[styles.emptyCard, { backgroundColor: colors.surface1, marginTop: 14 }]}>
          <Feather name="cpu" size={22} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t("teller.empty.title")}</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            {t("teller.empty.sub")}
          </Text>
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
  sectionLabel: { fontSize: 9, letterSpacing: 1.5, fontWeight: "500", marginTop: 4 },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  optionIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  optionBody: { flex: 1, gap: 2 },
  optionTitle: { fontSize: 13, fontWeight: "700" },
  optionDesc: { fontSize: 11, lineHeight: 15 },
  list: { gap: 8 },
  emptyCard: {
    borderRadius: 14,
    padding: 22,
    alignItems: "center",
    gap: 6,
  },
  emptyTitle: { fontSize: 14, fontWeight: "700", marginTop: 2 },
  emptySub: { fontSize: 11, textAlign: "center", lineHeight: 16 },
});
