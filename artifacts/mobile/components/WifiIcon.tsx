import { View, StyleSheet } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { useColors } from "@/hooks/useColors";
import { rssiToBars } from "@/components/SignalBars";

interface Props {
  rssi: number | null;
  size?: number;
}

/**
 * Dynamic WiFi icon: number of arcs lit up matches signal strength
 * (0..3 arcs + dot). Color also reflects quality.
 */
export function WifiIcon({ rssi, size = 22 }: Props) {
  const colors = useColors();
  const bars = rssiToBars(rssi); // 0..4
  const tint =
    bars >= 3
      ? colors.green
      : bars === 2
      ? colors.amber
      : bars === 1
      ? colors.red
      : colors.textTertiary;
  const dim = colors.surface2;

  const stroke = size * 0.11;
  const cx = size / 2;
  // Three concentric arcs at radii r1 < r2 < r3
  const r1 = size * 0.18;
  const r2 = size * 0.32;
  const r3 = size * 0.46;
  const cy = size * 0.66;

  const arcPath = (r: number) => {
    const sx = cx - r;
    const sy = cy;
    const ex = cx + r;
    const ey = cy;
    return `M ${sx} ${sy} A ${r} ${r} 0 0 1 ${ex} ${ey}`;
  };

  // Bars to lit arcs:
  //   0 → none lit, dot dim
  //   1 → dot lit
  //   2 → dot + arc1
  //   3 → dot + arc1 + arc2
  //   4 → all (dot + 3 arcs)
  const dotLit = bars >= 1;
  const a1Lit = bars >= 2;
  const a2Lit = bars >= 3;
  const a3Lit = bars >= 4;

  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Path
          d={arcPath(r3)}
          stroke={a3Lit ? tint : dim}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d={arcPath(r2)}
          stroke={a2Lit ? tint : dim}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d={arcPath(r1)}
          stroke={a1Lit ? tint : dim}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
        />
        <Circle cx={cx} cy={cy} r={size * 0.07} fill={dotLit ? tint : dim} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "center", justifyContent: "center" },
});
