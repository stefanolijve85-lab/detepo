import { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/contexts/LanguageContext";
import type { CounterDevice } from "@/hooks/useDashboardData";
import { formatLastSeen } from "@/hooks/useDashboardData";
import { rssiQuality } from "@/components/SignalBars";
import { WifiIcon } from "@/components/WifiIcon";

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
          <View style={styles.headSignal}>
            <WifiIcon rssi={device.wifiRssi} size={18} />
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
          {/* Top stats: in / out / battery */}
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

          {/* Extras row aligned with the three columns above:
              col1 = WiFi signal | col2 = (spacer) | col3 = Alignment button */}
          <View style={styles.extrasGrid}>
            {/* WiFi column */}
            <View style={styles.extrasCell}>
              <WifiIcon rssi={device.wifiRssi} size={26} />
              <Text style={[styles.extraLabel, { color: colors.textTertiary }]}>
                {t("device.wifiSignal")}
              </Text>
              <Text style={[styles.extraValue, { color: qualityColor }]} numberOfLines={1}>
                {device.wifiRssi != null
                  ? `${t(`signal.quality.${quality}` as const)} · ${device.wifiRssi} dBm`
                  : t("signal.quality.none")}
              </Text>
            </View>

            {/* Spacer (matches divider/middle column) */}
            <View style={styles.extrasSpacer} />

            {/* Alignment column */}
            <View style={styles.extrasCell}>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/alignment-check",
                    params: { uuid: device.uuid, name: device.name },
                  })
                }
                style={[styles.alignBtn, { borderColor: colors.cyan, backgroundColor: "rgba(0,200,224,0.08)" }]}
                hitSlop={6}
              >
                <Feather name="target" size={13} color={colors.cyan} />
                <Text style={[styles.alignBtnText, { color: colors.cyan }]} numberOfLines={1}>
                  {t("device.checkAlignment")}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.meta}>
            <Text style={[styles.metaText, { color: colors.textTertiary }]}>
              {t("device.firmware")}: {device.firmware}
            </Text>
            <Text style={[styles.metaText, { color: colors.textTertiary }]}>
              {t("device.heartbeat")}: {formatLastSeen(device.lastHeartbeat, t)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: 14, gap: 12 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  deviceName: { fontSize: 13, fontWeight: "700" },
  deviceSub: { fontSize: 10, marginTop: 1 },
  headSignal: { marginRight: 6 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: "600" },
  expanded: { gap: 12 },
  statsGrid: { flexDirection: "row", alignItems: "center" },
  statCell: { flex: 1, alignItems: "center" },
  statVal: { fontSize: 22, fontWeight: "700", letterSpacing: -0.5 },
  statLabel: { fontSize: 8, letterSpacing: 0.8, marginTop: 2 },
  dividerV: { width: 1, height: 36 },
  extrasGrid: { flexDirection: "row", alignItems: "center" },
  extrasCell: { flex: 1, alignItems: "center", gap: 4, paddingHorizontal: 4 },
  extrasSpacer: { width: 1 },
  extraLabel: { fontSize: 8, letterSpacing: 0.8, marginTop: 2 },
  extraValue: { fontSize: 11, fontWeight: "700", textAlign: "center" },
  alignBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  alignBtnText: { fontSize: 11, fontWeight: "700" },
  meta: { flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
  metaText: { fontSize: 10 },
});
