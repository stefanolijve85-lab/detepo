import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

interface StatusBadgeProps {
  status: "calm" | "busy" | "critical";
}

const STATUS_LABELS = {
  calm: "Rustig",
  busy: "Druk",
  critical: "Kritiek",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const colors = useColors();

  const statusColor =
    status === "calm"
      ? colors.green
      : status === "busy"
        ? colors.amber
        : colors.red;

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: `${statusColor}12`,
          borderColor: `${statusColor}33`,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: statusColor }]} />
      <Text style={[styles.label, { color: statusColor }]}>
        {STATUS_LABELS[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
});
