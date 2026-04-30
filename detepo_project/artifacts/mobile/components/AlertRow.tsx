import { View, Text, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import * as Haptics from "expo-haptics";
import type { Alert } from "@/hooks/useDashboardData";

interface AlertRowProps {
  alert: Alert;
  onPress: (id: string) => void;
}

export function AlertRow({ alert, onPress }: AlertRowProps) {
  const colors = useColors();

  const iconName: keyof typeof Feather.glyphMap =
    alert.type === "error"
      ? "alert-triangle"
      : alert.type === "warning"
        ? "alert-circle"
        : "info";

  const iconColor =
    alert.type === "error"
      ? colors.red
      : alert.type === "warning"
        ? colors.amber
        : colors.blue;

  const iconBg =
    alert.type === "error"
      ? "rgba(255,59,92,0.1)"
      : alert.type === "warning"
        ? "rgba(255,176,32,0.1)"
        : "rgba(61,142,255,0.1)";

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress(alert.id);
      }}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.surface1,
          borderColor: alert.read ? "transparent" : "rgba(61,142,255,0.2)",
          borderWidth: alert.read ? 0 : 1,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Feather name={iconName} size={14} color={iconColor} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.msg, { color: colors.foreground }]}>
          {alert.message}
        </Text>
        <Text style={[styles.time, { color: colors.textTertiary }]}>
          {alert.time}
        </Text>
      </View>
      {!alert.read && <View style={[styles.dot, { backgroundColor: colors.blue }]} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 12,
    padding: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
  },
  msg: {
    fontSize: 11,
    lineHeight: 16,
  },
  time: {
    fontSize: 9,
    marginTop: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
});
