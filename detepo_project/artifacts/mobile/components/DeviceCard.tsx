import { View, Text, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import * as Haptics from "expo-haptics";
import type { CounterDevice } from "@/hooks/useDashboardData";

interface DeviceCardProps {
  device: CounterDevice;
}

export function DeviceCard({ device }: DeviceCardProps) {
  const colors = useColors();

  const handleReboot = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface1,
          borderColor: device.online
            ? "transparent"
            : "rgba(255,59,92,0.2)",
          borderWidth: device.online ? 0 : 1,
        },
      ]}
    >
      <View style={styles.head}>
        <View
          style={[
            styles.icon,
            {
              backgroundColor: device.online
                ? "rgba(0,229,160,0.1)"
                : "rgba(255,59,92,0.1)",
            },
          ]}
        >
          <Feather
            name={device.online ? "wifi" : "wifi-off"}
            size={16}
            color={device.online ? colors.green : colors.red}
          />
        </View>
        <View style={styles.nameBlock}>
          <Text style={[styles.name, { color: colors.foreground }]}>
            {device.name}
          </Text>
          <Text style={[styles.loc, { color: colors.textSecondary }]}>
            {device.location}
          </Text>
        </View>
        <View style={styles.statusBlock}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: device.online ? colors.green : colors.red,
                },
              ]}
            />
            <Text
              style={[
                styles.statusLbl,
                { color: device.online ? colors.green : colors.red },
              ]}
            >
              {device.online ? "Online" : "Offline"}
            </Text>
          </View>
          <Text style={[styles.lastSeen, { color: colors.textTertiary }]}>
            {device.lastSeen}
          </Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.infoBlock}>
        <InfoRow label="Apparaat-ID" value={device.id.split("-").pop() || device.id} colors={colors} />
        <InfoRow
          label="Firmware"
          value={device.firmware + (device.needsUpdate ? " · update!" : "")}
          valueColor={device.needsUpdate ? colors.amber : colors.green}
          colors={colors}
        />
        <InfoRow label="Batterij" value={`${device.battery}%`} valueColor={device.battery < 20 ? colors.amber : undefined} colors={colors} />
        <InfoRow label="Verbinding" value={device.connection} colors={colors} />
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <Pressable
        onPress={handleReboot}
        style={({ pressed }) => [
          styles.rebootBtn,
          { opacity: pressed ? 0.6 : 1 },
        ]}
      >
        <Feather name="refresh-cw" size={12} color={colors.amber} />
        <Text style={[styles.rebootText, { color: colors.amber }]}>
          Herstart op afstand
        </Text>
      </Pressable>
    </View>
  );
}

function InfoRow({
  label,
  value,
  valueColor,
  colors,
}: {
  label: string;
  value: string;
  valueColor?: string;
  colors: any;
}) {
  return (
    <View style={infoStyles.row}>
      <Text style={[infoStyles.key, { color: colors.textTertiary }]}>
        {label}
      </Text>
      <Text
        style={[
          infoStyles.val,
          { color: valueColor || colors.textSecondary },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    overflow: "hidden",
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 13,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  nameBlock: {
    flex: 1,
  },
  name: {
    fontSize: 13,
    fontWeight: "700",
  },
  loc: {
    fontSize: 10,
    marginTop: 1,
  },
  statusBlock: {
    alignItems: "flex-end",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLbl: {
    fontSize: 10,
    fontWeight: "500",
  },
  lastSeen: {
    fontSize: 9,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginHorizontal: 13,
  },
  infoBlock: {
    padding: 13,
    gap: 2,
  },
  rebootBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 11,
  },
  rebootText: {
    fontSize: 11,
    fontWeight: "600",
  },
});

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  key: {
    fontSize: 10,
  },
  val: {
    fontSize: 10,
  },
});
