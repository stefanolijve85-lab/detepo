import { ScrollView, View, Text, StyleSheet, Platform, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useDashboard } from "@/contexts/DashboardContext";
import { formatLastSeen } from "@/hooks/useDashboardData";

export default function DevicesScreen() {
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Apparaten</Text>
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: "rgba(0,229,160,0.1)" }]}>
            <Text style={[styles.badgeText, { color: colors.green }]}>{data.onlineCount} online</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: "rgba(255,59,92,0.1)" }]}>
            <Text style={[styles.badgeText, { color: colors.red }]}>{data.offlineCount} offline</Text>
          </View>
        </View>
      </View>

      {/* Apparaatstatus */}
      <View style={[styles.statusCard, { backgroundColor: colors.surface1 }]}>
        <Text style={[styles.statusTitle, { color: colors.textTertiary }]}>APPARAATSTATUS</Text>
        <View style={styles.statusBoxes}>
          <View style={[styles.statusBox, { backgroundColor: "rgba(0,229,160,0.08)", borderColor: "rgba(0,229,160,0.14)" }]}>
            <Text style={[styles.statusNum, { color: colors.green }]}>{data.onlineCount}</Text>
            <Text style={[styles.statusBoxLabel, { color: colors.green }]}>Online</Text>
          </View>
          <View style={[styles.statusBox, { backgroundColor: "rgba(255,176,32,0.08)", borderColor: "rgba(255,176,32,0.14)" }]}>
            <Text style={[styles.statusNum, { color: colors.amber }]}>{data.counters.filter((c) => c.battery > 0 && c.battery <= 40 && c.online).length}</Text>
            <Text style={[styles.statusBoxLabel, { color: colors.amber }]}>Waarschuwing</Text>
          </View>
          <View style={[styles.statusBox, { backgroundColor: "rgba(255,59,92,0.08)", borderColor: "rgba(255,59,92,0.14)" }]}>
            <Text style={[styles.statusNum, { color: colors.red }]}>{data.offlineCount}</Text>
            <Text style={[styles.statusBoxLabel, { color: colors.red }]}>Offline</Text>
          </View>
        </View>
      </View>

      {/* Device cards */}
      {data.counters.map((device) => (
        <View key={device.id} style={[styles.card, { backgroundColor: colors.surface1 }]}>
          {/* Header row */}
          <View style={styles.cardHead}>
            <View
              style={[
                styles.iconBox,
                { backgroundColor: device.online ? "rgba(0,229,160,0.1)" : "rgba(255,59,92,0.1)" },
              ]}
            >
              <Feather
                name={device.online ? "wifi" : "wifi-off"}
                size={16}
                color={device.online ? colors.green : colors.red}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.deviceName, { color: colors.foreground }]}>{device.name}</Text>
              <Text style={[styles.deviceSub, { color: colors.textTertiary }]}>
                {device.uuid} · {device.connection}
              </Text>
            </View>
            <View
              style={[
                styles.statusPill,
                { backgroundColor: device.online ? "rgba(0,229,160,0.12)" : "rgba(255,59,92,0.12)" },
              ]}
            >
              <Text style={[styles.statusText, { color: device.online ? colors.green : colors.red }]}>
                {device.online ? "Online" : "Offline"}
              </Text>
            </View>
          </View>

          {/* Stats grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCell}>
              <Text style={[styles.statVal, { color: colors.foreground }]}>{device.countIn}</Text>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]}>IN VANDAAG</Text>
            </View>
            <View style={[styles.dividerV, { backgroundColor: colors.border }]} />
            <View style={styles.statCell}>
              <Text style={[styles.statVal, { color: colors.foreground }]}>{device.countOut}</Text>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]}>UIT VANDAAG</Text>
            </View>
            <View style={[styles.dividerV, { backgroundColor: colors.border }]} />
            <View style={styles.statCell}>
              <Text style={[styles.statVal, { color: colors.foreground }]}>
                {device.battery}%
              </Text>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]}>BATTERIJ</Text>
            </View>
          </View>

          {/* Battery bar */}
          <View style={[styles.battBg, { backgroundColor: colors.surface2 }]}>
            <View
              style={[
                styles.battFill,
                {
                  width: `${Math.min(100, device.battery)}%`,
                  backgroundColor:
                    device.battery > 40
                      ? colors.green
                      : device.battery > 20
                      ? colors.amber
                      : colors.red,
                },
              ]}
            />
          </View>

          {/* Meta */}
          <View style={styles.meta}>
            <Text style={[styles.metaText, { color: colors.textTertiary }]}>
              Firmware: {device.firmware}
            </Text>
            <Text style={[styles.metaText, { color: colors.textTertiary }]}>
              Heartbeat: {formatLastSeen(device.lastHeartbeat)}
            </Text>
          </View>
        </View>
      ))}

      {data.counters.length === 0 && (
        <View style={[styles.emptyCard, { backgroundColor: colors.surface1 }]}>
          <Feather name="cpu" size={24} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Geen apparaten</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            Koppel je eerste Detepo teller via Bluetooth om te beginnen.
          </Text>
        </View>
      )}

      {/* ── Teller verbinden via Bluetooth ── */}
      <View style={[styles.bleSection, { borderTopColor: "rgba(255,255,255,0.06)" }]}>
        <Text style={[styles.bleSectionLabel, { color: colors.textTertiary }]}>TELLER TOEVOEGEN</Text>

        <Pressable
          onPress={() => router.push("/bluetooth-scan")}
          style={({ pressed }) => [
            styles.bleBtn,
            {
              backgroundColor: pressed ? "rgba(0,200,224,0.12)" : colors.surface1,
              borderColor: "rgba(0,200,224,0.2)",
            },
          ]}
        >
          <View style={[styles.bleBtnIcon, { backgroundColor: "rgba(0,200,224,0.1)" }]}>
            <Feather name="bluetooth" size={20} color={colors.cyan} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.bleBtnTitle, { color: colors.foreground }]}>
              Verbinden via Bluetooth
            </Text>
            <Text style={[styles.bleBtnSub, { color: colors.textSecondary }]}>
              Nieuwe FP111 teller koppelen en configureren
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.textTertiary} />
        </Pressable>

        <View style={[styles.bleInfoCard, { backgroundColor: colors.surface1, borderColor: "rgba(0,200,224,0.08)" }]}>
          <Feather name="info" size={12} color={colors.textTertiary} />
          <Text style={[styles.bleInfoText, { color: colors.textTertiary }]}>
            Houd de teller ingeschakeld en binnen 2 meter van je iPhone. De teller is zichtbaar als "FP111-xxxxxx" tijdens het koppelen.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  title: { fontSize: 22, fontWeight: "700", letterSpacing: -0.4 },
  badges: { flexDirection: "row", gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 10, fontWeight: "500" },
  card: { borderRadius: 14, padding: 14, gap: 10 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  deviceName: { fontSize: 13, fontWeight: "700" },
  deviceSub: { fontSize: 10, marginTop: 1 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: "600" },
  statsGrid: { flexDirection: "row", alignItems: "center" },
  statCell: { flex: 1, alignItems: "center" },
  statVal: { fontSize: 22, fontWeight: "700", letterSpacing: -0.5 },
  statLabel: { fontSize: 8, letterSpacing: 0.8, marginTop: 2 },
  dividerV: { width: 1, height: 36 },
  battBg: { height: 5, borderRadius: 3, overflow: "hidden" },
  battFill: { height: "100%", borderRadius: 3 },
  meta: { flexDirection: "row", justifyContent: "space-between" },
  metaText: { fontSize: 10 },
  emptyCard: {
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", marginTop: 4 },
  emptySub: { fontSize: 12, textAlign: "center", lineHeight: 18 },
  statusCard: { borderRadius: 14, padding: 14, gap: 10 },
  statusTitle: { fontSize: 9, letterSpacing: 1.5, fontWeight: "500" },
  statusBoxes: { flexDirection: "row", gap: 8 },
  statusBox: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 4,
  },
  statusNum: { fontSize: 26, fontWeight: "700", letterSpacing: -1 },
  statusBoxLabel: { fontSize: 9, fontWeight: "500", textAlign: "center" },
  bleSection: {
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 10,
    marginTop: 4,
  },
  bleSectionLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: "500",
  },
  bleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  bleBtnIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  bleBtnTitle: { fontSize: 14, fontWeight: "700" },
  bleBtnSub: { fontSize: 11, marginTop: 2 },
  bleInfoCard: {
    flexDirection: "row",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    alignItems: "flex-start",
  },
  bleInfoText: { fontSize: 10, lineHeight: 15, flex: 1 },
});
