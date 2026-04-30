import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Line, Text as SvgText, Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { useColors } from "@/hooks/useColors";

interface LineChartProps {
  data: { hour: string; inCount: number; outCount: number }[];
}

const CHART_H = 110;
const CHART_W = 300;
const PAD_L   = 8;
const PAD_R   = 8;
const PAD_T   = 12;
const PAD_B   = 22;
const INNER_W = CHART_W - PAD_L - PAD_R;
const INNER_H = CHART_H - PAD_T - PAD_B;

const X_LABELS     = ["00:00", "06:00", "12:00", "18:00", "23:00"];
const X_LABEL_HOURS = [0, 6, 12, 18, 23];

// Ingang = green, Uitgang = blue
const COLOR_IN  = "#00E5A0";
const COLOR_OUT = "#3D8EFF";

function buildPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  let d = `M ${first.x} ${first.y}`;
  for (const p of rest) {
    d += ` L ${p.x} ${p.y}`;
  }
  return d;
}

function toPoints(
  data: { hour: string; inCount: number; outCount: number }[],
  key: "inCount" | "outCount",
  maxVal: number
): { x: number; y: number }[] {
  if (data.length === 0) return [];
  return data.map((item) => {
    const h = parseInt(item.hour, 10);
    const x = PAD_L + (h / 23) * INNER_W;
    const val = item[key];
    const y = PAD_T + INNER_H - (maxVal > 0 ? (val / maxVal) * INNER_H : 0);
    return { x, y };
  });
}

export function LineChart({ data }: LineChartProps) {
  const colors = useColors();
  const maxVal    = Math.max(...data.map((d) => Math.max(d.inCount, d.outCount)), 1);
  const inPoints  = toPoints(data, "inCount", maxVal);
  const outPoints = toPoints(data, "outCount", maxVal);
  const inPath    = buildPath(inPoints);
  const outPath   = buildPath(outPoints);
  const hasData   = data.some((d) => d.inCount > 0 || d.outCount > 0);

  // Horizontal grid lines (3 levels)
  const gridLines = [0.25, 0.5, 0.75, 1].map((frac) => PAD_T + INNER_H * (1 - frac));

  return (
    <View style={[styles.card, { backgroundColor: colors.surface1 }]}>
      {/* Title + live dot */}
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.textTertiary }]}>
          UURLIJKSE STROOM — VANDAAG
        </Text>
        <View style={styles.livePill}>
          <View style={[styles.liveDot, { backgroundColor: colors.green }]} />
          <Text style={[styles.livePillText, { color: colors.green }]}>Live</Text>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: COLOR_IN }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Ingang</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: COLOR_OUT }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Uitgang</Text>
        </View>
      </View>

      {/* Chart */}
      <View style={styles.chartWrap}>
        <Svg width="100%" height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
          <Defs>
            <RadialGradient id="glowIn" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={COLOR_IN} stopOpacity="0.6" />
              <Stop offset="100%" stopColor={COLOR_IN} stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="glowOut" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={COLOR_OUT} stopOpacity="0.6" />
              <Stop offset="100%" stopColor={COLOR_OUT} stopOpacity="0" />
            </RadialGradient>
          </Defs>

          {/* Grid lines */}
          {gridLines.map((y, i) => (
            <Line
              key={i}
              x1={PAD_L}
              y1={y}
              x2={CHART_W - PAD_R}
              y2={y}
              stroke="rgba(255,255,255,0.04)"
              strokeWidth={1}
            />
          ))}

          {/* Baseline */}
          <Line
            x1={PAD_L}
            y1={PAD_T + INNER_H}
            x2={CHART_W - PAD_R}
            y2={PAD_T + INNER_H}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1}
          />

          {!hasData ? (
            <>
              <Path
                d={`M ${PAD_L} ${PAD_T + INNER_H} L ${CHART_W - PAD_R} ${PAD_T + INNER_H}`}
                stroke={COLOR_IN}
                strokeWidth={1.5}
                fill="none"
                opacity={0.3}
              />
              <Path
                d={`M ${PAD_L} ${PAD_T + INNER_H} L ${CHART_W - PAD_R} ${PAD_T + INNER_H}`}
                stroke={COLOR_OUT}
                strokeWidth={1.5}
                fill="none"
                opacity={0.3}
                strokeDasharray="4,3"
              />
            </>
          ) : (
            <>
              {/* ── Ingang (green) — glow + line ── */}
              {inPath ? (
                <>
                  {/* Outer glow */}
                  <Path
                    d={inPath}
                    stroke={COLOR_IN}
                    strokeWidth={8}
                    fill="none"
                    opacity={0.12}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {/* Inner glow */}
                  <Path
                    d={inPath}
                    stroke={COLOR_IN}
                    strokeWidth={4}
                    fill="none"
                    opacity={0.25}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {/* Main line */}
                  <Path
                    d={inPath}
                    stroke={COLOR_IN}
                    strokeWidth={2}
                    fill="none"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </>
              ) : null}

              {/* ── Uitgang (blue) — glow + line ── */}
              {outPath ? (
                <>
                  {/* Outer glow */}
                  <Path
                    d={outPath}
                    stroke={COLOR_OUT}
                    strokeWidth={8}
                    fill="none"
                    opacity={0.12}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {/* Inner glow */}
                  <Path
                    d={outPath}
                    stroke={COLOR_OUT}
                    strokeWidth={4}
                    fill="none"
                    opacity={0.25}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {/* Main line */}
                  <Path
                    d={outPath}
                    stroke={COLOR_OUT}
                    strokeWidth={2}
                    fill="none"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </>
              ) : null}

              {/* Ingang data points */}
              {inPoints.map((p, i) =>
                data[i]?.inCount > 0 ? (
                  <Circle key={`in-${i}`} cx={p.x} cy={p.y} r={3} fill={COLOR_IN} opacity={0.9} />
                ) : null
              )}
            </>
          )}

          {/* X axis labels */}
          {X_LABEL_HOURS.map((h, i) => {
            const x = PAD_L + (h / 23) * INNER_W;
            return (
              <SvgText
                key={h}
                x={x}
                y={CHART_H - 2}
                fontSize={8}
                fill="rgba(255,255,255,0.3)"
                textAnchor={i === 0 ? "start" : i === X_LABELS.length - 1 ? "end" : "middle"}
              >
                {X_LABELS[i]}
              </SvgText>
            );
          })}
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: 14, gap: 8 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 9, letterSpacing: 1.2, fontWeight: "500" },
  livePill: { flexDirection: "row", alignItems: "center", gap: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  livePillText: { fontSize: 9, fontWeight: "600" },
  legend: { flexDirection: "row", gap: 14 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendSwatch: { width: 18, height: 3, borderRadius: 2 },
  legendText: { fontSize: 10 },
  chartWrap: { height: CHART_H },
});
