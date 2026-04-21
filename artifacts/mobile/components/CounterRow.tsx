import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import type { CounterDevice } from "@/hooks/useDashboardData";
import { formatLastSeen } from "@/hooks/useDashboardData";

interface CounterRowProps {
  counter: CounterDevice;
}

export function CounterRow({ counter }: CounterRowProps) {
  const colors = useColors();

  return (
    <View style={[styles.row, { backgroundColor: colors.surface1 }]}>
      <View
        style={[
          styles.icon,
          {
            backgroundColor: counter.online
              ? "rgba(0,229,160,0.1)"
              : "rgba(255,59,92,0.1)",
          },
        ]}
      >
        <Feather
          name={counter.online ? "wifi" : "wifi-off"}
          size={14}
          color={counter.online ? colors.green : colors.red}
        />
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground }]}>
          {counter.name}
        </Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          {counter.online ? formatLastSeen(counter.lastHeartbeat) : `Offline · ${formatLastSeen(counter.lastHeartbeat)}`}
        </Text>
      </View>
      <View style={styles.countCol}>
        <Text style={[styles.countIn, { color: colors.foreground }]}>
          <Text style={{ color: colors.green }}>↑ </Text>{counter.countIn}
        </Text>
        <Text style={[styles.countOut, { color: colors.foreground }]}>
          <Text style={{ color: "#3D8EFF" }}>↓ </Text>{counter.countOut}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    padding: 11,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 12,
    fontWeight: "600",
  },
  sub: {
    fontSize: 10,
    marginTop: 1,
  },
  countCol: {
    alignItems: "flex-end",
    gap: 2,
  },
  countIn: {
    fontSize: 13,
    fontWeight: "700",
  },
  countOut: {
    fontSize: 13,
    fontWeight: "700",
  },
});
