import { ScrollView, View, Text, StyleSheet, Pressable, Switch, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotifications } from "@/contexts/NotificationsContext";

export default function NotificationSettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { prefs, setPref } = useNotifications();
  const isWeb = Platform.OS === "web";

  // Stepper values
  const batterySteps = [10, 15, 20, 25, 30, 40, 50];
  const visitorsSteps = [10, 25, 50, 75, 100, 150, 200];
  const wifiSteps = [-90, -85, -80, -75, -70, -65];

  const cycle = <T,>(arr: T[], current: T) => {
    const i = arr.findIndex((v) => v === current);
    return arr[(i + 1) % arr.length];
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: isWeb ? 20 : insets.top + 10,
          paddingBottom: insets.bottom + 32,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Feather name="x" size={20} color={colors.textSecondary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {t("notifSettings.title")}
          </Text>
          <Text style={[styles.headerSub, { color: colors.textTertiary }]}>
            {t("notifSettings.subtitle")}
          </Text>
        </View>
      </View>

      {/* Battery */}
      <View style={[styles.card, { backgroundColor: colors.surface1 }]}>
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: "rgba(255,193,7,0.12)" }]}>
            <Feather name="battery" size={16} color={colors.amber} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.itemTitle, { color: colors.foreground }]}>
              {t("notifSettings.battery.title")}
            </Text>
            <Text style={[styles.itemSub, { color: colors.textTertiary }]}>
              {t("notifSettings.battery.sub")}
            </Text>
          </View>
          <Switch
            value={prefs.batteryEnabled}
            onValueChange={(v) => setPref("batteryEnabled", v)}
            thumbColor={colors.foreground}
            trackColor={{ true: colors.green, false: colors.surface2 }}
          />
        </View>
        {prefs.batteryEnabled && (
          <Pressable
            onPress={() => setPref("batteryThreshold", cycle(batterySteps, prefs.batteryThreshold))}
            style={[styles.thresholdRow, { backgroundColor: colors.surface2 }]}
          >
            <Text style={[styles.thresholdLabel, { color: colors.textSecondary }]}>
              {t("notifSettings.battery.threshold")}
            </Text>
            <Text style={[styles.thresholdValue, { color: colors.foreground }]}>
              ≤ {prefs.batteryThreshold}%
            </Text>
            <Feather name="chevron-right" size={16} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>

      {/* Visitors */}
      <View style={[styles.card, { backgroundColor: colors.surface1 }]}>
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: "rgba(61,142,255,0.12)" }]}>
            <Feather name="users" size={16} color={colors.blue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.itemTitle, { color: colors.foreground }]}>
              {t("notifSettings.visitors.title")}
            </Text>
            <Text style={[styles.itemSub, { color: colors.textTertiary }]}>
              {t("notifSettings.visitors.sub")}
            </Text>
          </View>
          <Switch
            value={prefs.visitorsEnabled}
            onValueChange={(v) => setPref("visitorsEnabled", v)}
            thumbColor={colors.foreground}
            trackColor={{ true: colors.green, false: colors.surface2 }}
          />
        </View>
        {prefs.visitorsEnabled && (
          <Pressable
            onPress={() => setPref("visitorsThreshold", cycle(visitorsSteps, prefs.visitorsThreshold))}
            style={[styles.thresholdRow, { backgroundColor: colors.surface2 }]}
          >
            <Text style={[styles.thresholdLabel, { color: colors.textSecondary }]}>
              {t("notifSettings.visitors.threshold")}
            </Text>
            <Text style={[styles.thresholdValue, { color: colors.foreground }]}>
              ≥ {prefs.visitorsThreshold}
            </Text>
            <Feather name="chevron-right" size={16} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>

      {/* WiFi signal */}
      <View style={[styles.card, { backgroundColor: colors.surface1 }]}>
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: "rgba(255,59,92,0.12)" }]}>
            <Feather name="wifi" size={16} color={colors.red} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.itemTitle, { color: colors.foreground }]}>
              {t("notifSettings.wifi.title")}
            </Text>
            <Text style={[styles.itemSub, { color: colors.textTertiary }]}>
              {t("notifSettings.wifi.sub")}
            </Text>
          </View>
          <Switch
            value={prefs.wifiEnabled}
            onValueChange={(v) => setPref("wifiEnabled", v)}
            thumbColor={colors.foreground}
            trackColor={{ true: colors.green, false: colors.surface2 }}
          />
        </View>
        {prefs.wifiEnabled && (
          <Pressable
            onPress={() => setPref("wifiThreshold", cycle(wifiSteps, prefs.wifiThreshold))}
            style={[styles.thresholdRow, { backgroundColor: colors.surface2 }]}
          >
            <Text style={[styles.thresholdLabel, { color: colors.textSecondary }]}>
              {t("notifSettings.wifi.threshold")}
            </Text>
            <Text style={[styles.thresholdValue, { color: colors.foreground }]}>
              ≤ {prefs.wifiThreshold} dBm
            </Text>
            <Feather name="chevron-right" size={16} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>

      {/* Alignment */}
      <View style={[styles.card, { backgroundColor: colors.surface1 }]}>
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: "rgba(0,200,224,0.12)" }]}>
            <Feather name="target" size={16} color={colors.cyan} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.itemTitle, { color: colors.foreground }]}>
              {t("notifSettings.alignment.title")}
            </Text>
            <Text style={[styles.itemSub, { color: colors.textTertiary }]}>
              {t("notifSettings.alignment.sub")}
            </Text>
          </View>
          <Switch
            value={prefs.alignmentEnabled}
            onValueChange={(v) => setPref("alignmentEnabled", v)}
            thumbColor={colors.foreground}
            trackColor={{ true: colors.green, false: colors.surface2 }}
          />
        </View>
      </View>

      <Text style={[styles.footnote, { color: colors.textTertiary }]}>
        {t("notifSettings.footnote")}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 10 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontWeight: "700", letterSpacing: -0.4 },
  headerSub: { fontSize: 11, marginTop: 2 },
  card: { borderRadius: 14, padding: 14, gap: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  itemTitle: { fontSize: 14, fontWeight: "700" },
  itemSub: { fontSize: 11, marginTop: 2, lineHeight: 15 },
  thresholdRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 10,
  },
  thresholdLabel: { fontSize: 12, flex: 1 },
  thresholdValue: { fontSize: 13, fontWeight: "700" },
  footnote: { fontSize: 10, textAlign: "center", marginTop: 8, lineHeight: 14 },
});
