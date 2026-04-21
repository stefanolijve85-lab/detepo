import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface PctBadgeProps {
  current: number;
  previous: number;
  /** Label suffix shown after the percentage, e.g. "vs gisteren" */
  label: string;
  /** Compact variant uses a smaller font */
  size?: "xs" | "sm" | "md";
}

/**
 * Shows a percentage delta between two numbers, color-coded:
 * green = up, red = down. Returns null when previous is 0 or unknown.
 */
export function PctBadge({ current, previous, label, size = "sm" }: PctBadgeProps) {
  const colors = useColors();
  if (previous <= 0) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  const up = pct >= 0;
  const color = up ? colors.green : colors.red;
  const bg = up ? "rgba(0,229,160,0.12)" : "rgba(255,59,92,0.12)";
  const iconSize = size === "md" ? 11 : size === "sm" ? 9 : 8;
  const textStyle = size === "md" ? styles.textMd : size === "sm" ? styles.textSm : styles.textXs;
  return (
    <View style={[styles.badge, size === "xs" && styles.badgeXs, { backgroundColor: bg }]}>
      <Feather name={up ? "arrow-up" : "arrow-down"} size={iconSize} color={color} />
      <Text style={[textStyle, { color }]} numberOfLines={1}>
        {Math.abs(pct)}% {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  badgeXs: { paddingHorizontal: 4, paddingVertical: 2, gap: 2, borderRadius: 8 },
  textXs: { fontSize: 8, fontWeight: "600" },
  textSm: { fontSize: 9, fontWeight: "600" },
  textMd: { fontSize: 11, fontWeight: "600" },
});
