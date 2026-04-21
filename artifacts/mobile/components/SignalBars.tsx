import { View, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  rssi: number | null;
  size?: "sm" | "md";
}

/**
 * Convert RSSI (dBm, typically -30 strong .. -90 unusable) to bars 0..4.
 */
export function rssiToBars(rssi: number | null): number {
  if (rssi == null || !Number.isFinite(rssi)) return 0;
  if (rssi >= -55) return 4;
  if (rssi >= -65) return 3;
  if (rssi >= -75) return 2;
  if (rssi >= -85) return 1;
  return 0;
}

export function rssiQuality(
  rssi: number | null,
): "excellent" | "good" | "fair" | "poor" | "none" {
  const b = rssiToBars(rssi);
  if (b === 4) return "excellent";
  if (b === 3) return "good";
  if (b === 2) return "fair";
  if (b === 1) return "poor";
  return "none";
}

export function SignalBars({ rssi, size = "sm" }: Props) {
  const colors = useColors();
  const bars = rssiToBars(rssi);
  const heights = size === "sm" ? [4, 7, 10, 13] : [6, 10, 14, 18];
  const width = size === "sm" ? 3 : 4;
  const tint =
    bars >= 3 ? colors.green : bars === 2 ? colors.amber : bars === 1 ? colors.red : colors.surface2;
  return (
    <View style={styles.row}>
      {heights.map((h, i) => (
        <View
          key={i}
          style={[
            styles.bar,
            {
              width,
              height: h,
              backgroundColor: i < bars ? tint : colors.surface2,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", gap: 2 },
  bar: { borderRadius: 1 },
});
