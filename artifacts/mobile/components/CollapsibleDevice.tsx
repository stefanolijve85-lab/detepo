import { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/contexts/LanguageContext";
import type { CounterDevice } from "@/hooks/useDashboardData";
import { formatLastSeen } from "@/hooks/useDashboardData";

interface Props {
  device: CounterDevice;
}

export function CollapsibleDevice({ device }: Props) {
  const colors = useColors();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

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
  meta: { flexDirection: "row", justifyContent: "space-between" },
  metaText: { fontSize: 10 },
});
