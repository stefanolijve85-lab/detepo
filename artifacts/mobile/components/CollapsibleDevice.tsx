import { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/contexts/LanguageContext";
import type { CounterDevice } from "@/hooks/useDashboardData";
import { formatLastSeen } from "@/hooks/useDashboardData";
import { SignalBars, rssiQuality } from "@/components/SignalBars";

interface Props {
  device: CounterDevice;
}

export function CollapsibleDevice({ device }: Props) {
  const colors = useColors();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  const quality = rssiQuality(device.wifiRssi);
  const qualityColor =
    quality === "excellent" || quality === "good"
      ? colors.green
      : quality === "fair"
      ? colors.amber
      : quality === "poor"
      ? colors.red
      : colors.textTertiary;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface1 }]}>
      <Pressable onPress={() => setOpen((o) => !o)} style={styles.cardHead}>
        <View
          style={[
            styles.iconBox,
            {
              backgroundColor: device.online ? "rgba(0,229,160,0.1)" : "rgba(255,59,92,0.1)",
            },
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
        {device.wifiRssi != null && (
          <View style={styles.signalCol}>
            <SignalBars rssi={device.wifiRssi} size="sm" />
          </View>
        )}
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: device.online ? "rgba(0,229,160,0.12)" : "rgba(255,59,92,0.12)",
            },
          ]}
        >
          <Text style={[styles.statusText, { color: device.online ? colors.green : colors.red }]}>
            {device.online ? t("common.online") : t("common.offline")}
          </Text>
        </View>
        <Feather
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.textTertiary}
          style={{ marginLeft: 4 }}
        />
      </Pressable>

      {open && (
        <View style={styles.expanded}>
          <View style={styles.statsGrid}>
            <View style={styles.statCell}>
              <Text style={[styles.statVal, { color: colors.foreground }]}>{device.countIn}</Text>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{t("device.todayIn")}</Text>
            </View>
            <View style={[styles.dividerV, { backgroundColor: colors.border }]} />
            <View style={styles.statCell}>
              <Text style={[styles.statVal, { color: colors.foreground }]}>{device.countOut}</Text>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{t("device.todayOut")}</Text>
            </View>
            <View style={[styles.dividerV, { backgroundColor: colors.border }]} />
            <View style={styles.statCell}>
              <Text style={[styles.statVal, { color: colors.foreground }]}>{device.battery}%</Text>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{t("device.battery")}</Text>
            </View>
          </View>

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

          {/* WiFi signal row */}
          <View style={[styles.signalRow, { backgroundColor: colors.surface2 }]}>
            <View style={styles.signalLeft}>
              <SignalBars rssi={device.wifiRssi} size="md" />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={[styles.signalLabel, { color: colors.textTertiary }]}>
                  {t("device.wifiSignal")}
                </Text>
                <Text style={[styles.signalValue, { color: qualityColor }]}>
                  {device.wifiRssi != null
                    ? `${device.wifiRssi} dBm · ${t(`signal.quality.${quality}` as const)}`
                    : t("signal.quality.none")}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/alignment-check",
                  params: { uuid: device.uuid, name: device.name },
                })
              }
              style={[styles.alignBtn, { borderColor: colors.border }]}
              hitSlop={6}
            >
              <Feather name="target" size={12} color={colors.cyan} />
              <Text style={[styles.alignBtnText, { color: colors.cyan }]}>{t("device.checkAlignment")}</Text>
            </Pressable>
          </View>

          <View style={styles.meta}>
            <Text style={[styles.metaText, { color: colors.textTertiary }]}>
              {t("device.firmware")}: {device.firmware}
            </Text>
            <Text style={[styles.metaText, { color: colors.textTertiary }]}>
              {t("device.heartbeat")}: {formatLastSeen(device.lastHeartbeat)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: 14, gap: 10 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  deviceName: { fontSize: 13, fontWeight: "700" },
  deviceSub: { fontSize: 10, marginTop: 1 },
  signalCol: { marginRight: 6 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: "600" },
  expanded: { gap: 10 },
  statsGrid: { flexDirection: "row", alignItems: "center" },
  statCell: { flex: 1, alignItems: "center" },
  statVal: { fontSize: 22, fontWeight: "700", letterSpacing: -0.5 },
  statLabel: { fontSize: 8, letterSpacing: 0.8, marginTop: 2 },
  dividerV: { width: 1, height: 36 },
  battBg: { height: 5, borderRadius: 3, overflow: "hidden" },
  battFill: { height: "100%", borderRadius: 3 },
  signalRow: {
    borderRadius: 10,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  signalLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  signalLabel: { fontSize: 9, letterSpacing: 0.8, fontWeight: "500" },
  signalValue: { fontSize: 12, fontWeight: "700", marginTop: 2 },
  alignBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  alignBtnText: { fontSize: 10, fontWeight: "700" },
  meta: { flexDirection: "row", justifyContent: "space-between" },
  metaText: { fontSize: 10 },
});
