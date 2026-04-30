import { useMemo, useState, useRef } from "react";
import { View, Text, StyleSheet, Pressable, PanResponder, LayoutChangeEvent } from "react-native";
import Svg, { Path, Line, Text as SvgText, Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/contexts/LanguageContext";

type ChartMode = "day" | "week" | "month";

interface LineChartProps {
  data: { hour: string; inCount: number; outCount: number }[];
  dailyHistory?: { date: string; inCount: number; outCount: number }[];
}

const CHART_H = 140;
const CHART_W = 320;
const PAD_L = 8;
const PAD_R = 8;
const PAD_T = 12;
const PAD_B = 22;
const INNER_W = CHART_W - PAD_L - PAD_R;
const INNER_H = CHART_H - PAD_T - PAD_B;

const COLOR_IN = "#00E5A0";
const COLOR_OUT = "#3D8EFF";

interface Point {
  label: string;
  fullLabel: string;
  inCount: number;
  outCount: number;
}

function buildPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  let d = `M ${first.x} ${first.y}`;
  for (const p of rest) d += ` L ${p.x} ${p.y}`;
  return d;
}

function xFor(index: number, total: number): number {
  if (total <= 1) return PAD_L + INNER_W / 2;
  return PAD_L + (index / (total - 1)) * INNER_W;
}

function yFor(value: number, max: number): number {
  return PAD_T + INNER_H - (max > 0 ? (value / max) * INNER_H : 0);
}

export function LineChart({ data, dailyHistory = [] }: LineChartProps) {
  const colors = useColors();
  const { t, locale } = useLanguage();
  const [mode, setMode] = useState<ChartMode>("day");
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);
  const [chartWidth, setChartWidth] = useState(CHART_W);
  const widthRef = useRef(CHART_W);

  const points: Point[] = useMemo(() => {
    if (mode === "day") {
      const byHour = new Map<number, { inCount: number; outCount: number }>();
      data.forEach((d) => {
        const h = parseInt(d.hour, 10);
        if (!Number.isNaN(h)) byHour.set(h, { inCount: d.inCount, outCount: d.outCount });
      });
      return Array.from({ length: 24 }, (_, h) => {
        const v = byHour.get(h) ?? { inCount: 0, outCount: 0 };
        return {
          label: h % 6 === 0 || h === 23 ? `${String(h).padStart(2, "0")}:00` : "",
          fullLabel: `${String(h).padStart(2, "0")}:00`,
          inCount: v.inCount,
          outCount: v.outCount,
        };
      });
    }
    const slice = mode === "week" ? dailyHistory.slice(-7) : dailyHistory.slice(-30);
    return slice.map((d, i) => {
      const date = new Date(d.date);
      let label = "";
      let fullLabel = d.date;
      try {
        if (mode === "week") {
          label = date.toLocaleDateString(locale, { weekday: "short" });
          fullLabel = date.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "short" });
        } else {
          const dd = date.getDate();
          label = i % 5 === 0 || i === slice.length - 1 ? String(dd) : "";
          fullLabel = date.toLocaleDateString(locale, { day: "numeric", month: "short" });
        }
      } catch {
        label = mode === "week" ? d.date.slice(-2) : String(date.getDate());
      }
      return { label, fullLabel, inCount: d.inCount, outCount: d.outCount };
    });
  }, [mode, data, dailyHistory, locale]);

  const maxVal = Math.max(...points.map((p) => Math.max(p.inCount, p.outCount)), 1);
  const inPts = points.map((p, i) => ({ x: xFor(i, points.length), y: yFor(p.inCount, maxVal) }));
  const outPts = points.map((p, i) => ({ x: xFor(i, points.length), y: yFor(p.outCount, maxVal) }));
  const inPath = buildPath(inPts);
  const outPath = buildPath(outPts);
  const hasData = points.some((p) => p.inCount > 0 || p.outCount > 0);
  const gridLines = [0.25, 0.5, 0.75, 1].map((frac) => PAD_T + INNER_H * (1 - frac));

  const gridStroke = colors.border;
  const baselineStroke = colors.border;
  const labelFill = colors.textTertiary;

  const title =
    mode === "day"
      ? t("chart.titleDay")
      : mode === "week"
      ? t("chart.titleWeek")
      : t("chart.titleMonth");

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => updateScrub(e.nativeEvent.locationX),
      onPanResponderMove: (e) => updateScrub(e.nativeEvent.locationX),
      onPanResponderRelease: () => setScrubIndex(null),
      onPanResponderTerminate: () => setScrubIndex(null),
    }),
  ).current;

  const pointsCountRef = useRef(points.length);
  pointsCountRef.current = points.length;

  function updateScrub(touchX: number) {
    const w = widthRef.current;
    const ratio = (touchX - (PAD_L * w) / CHART_W) / ((INNER_W * w) / CHART_W);
    const total = pointsCountRef.current;
    if (total === 0) return;
    const idx = Math.round(ratio * (total - 1));
    setScrubIndex(Math.max(0, Math.min(total - 1, idx)));
  }

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    widthRef.current = w;
    setChartWidth(w);
  };

  const scrubPoint = scrubIndex !== null ? points[scrubIndex] : null;
  const scrubX = scrubIndex !== null ? xFor(scrubIndex, points.length) : 0;

  // Determine if the scrubber line is in the left or right half to pin the
  // indicator accordingly (avoids running off-screen)
  const scrubXPx = scrubIndex !== null ? (scrubX / CHART_W) * chartWidth : 0;
  const tooltipLeft = Math.max(4, Math.min(chartWidth - 120, scrubXPx - 60));

  return (
    <View style={[styles.card, { backgroundColor: colors.surface1 }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.textTertiary }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.livePill}>
          <View style={[styles.liveDot, { backgroundColor: colors.green }]} />
          <Text style={[styles.livePillText, { color: colors.green }]}>{t("common.live")}</Text>
        </View>
      </View>

      {/* Mode tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
        {(["day", "week", "month"] as const).map((m) => {
          const active = mode === m;
          return (
            <Pressable
              key={m}
              onPress={() => {
                setMode(m);
                setScrubIndex(null);
              }}
              style={[styles.tab, active && { backgroundColor: colors.surface1 }]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: active ? colors.foreground : colors.textTertiary },
                  active && { fontWeight: "700" },
                ]}
              >
                {t(`chart.tab.${m}` as const)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── Scrub info strip (always above SVG so finger never covers it) ── */}
      <View style={[styles.scrubStrip, { minHeight: 32 }]}>
        {scrubPoint ? (
          <>
            <Text style={[styles.scrubLabel, { color: colors.textTertiary }]} numberOfLines={1}>
              {scrubPoint.fullLabel}
            </Text>
            <View style={styles.scrubValues}>
              <View style={styles.scrubItem}>
                <View style={[styles.scrubDot, { backgroundColor: COLOR_IN }]} />
                <Text style={[styles.scrubVal, { color: colors.foreground }]}>
                  {t("chart.in")}: <Text style={{ fontWeight: "700" }}>{scrubPoint.inCount}</Text>
                </Text>
              </View>
              <View style={styles.scrubItem}>
                <View style={[styles.scrubDot, { backgroundColor: COLOR_OUT }]} />
                <Text style={[styles.scrubVal, { color: colors.foreground }]}>
                  {t("chart.out")}: <Text style={{ fontWeight: "700" }}>{scrubPoint.outCount}</Text>
                </Text>
              </View>
            </View>
          </>
        ) : (
          /* Legend shown when not scrubbing */
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: COLOR_IN }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>{t("chart.in")}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: COLOR_OUT }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>{t("chart.out")}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Chart with touch */}
      <View style={styles.chartWrap} onLayout={onLayout} {...panResponder.panHandlers}>
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
            <Line key={i} x1={PAD_L} y1={y} x2={CHART_W - PAD_R} y2={y} stroke={gridStroke} strokeWidth={1} />
          ))}

          {/* Baseline */}
          <Line
            x1={PAD_L}
            y1={PAD_T + INNER_H}
            x2={CHART_W - PAD_R}
            y2={PAD_T + INNER_H}
            stroke={baselineStroke}
            strokeWidth={1}
          />

          {!hasData ? (
            <>
              <Path d={`M ${PAD_L} ${PAD_T + INNER_H} L ${CHART_W - PAD_R} ${PAD_T + INNER_H}`} stroke={COLOR_IN} strokeWidth={1.5} fill="none" opacity={0.3} />
              <Path d={`M ${PAD_L} ${PAD_T + INNER_H} L ${CHART_W - PAD_R} ${PAD_T + INNER_H}`} stroke={COLOR_OUT} strokeWidth={1.5} fill="none" opacity={0.3} strokeDasharray="4,3" />
            </>
          ) : (
            <>
              {inPath ? (
                <>
                  <Path d={inPath} stroke={COLOR_IN} strokeWidth={8} fill="none" opacity={0.12} strokeLinejoin="round" strokeLinecap="round" />
                  <Path d={inPath} stroke={COLOR_IN} strokeWidth={4} fill="none" opacity={0.25} strokeLinejoin="round" strokeLinecap="round" />
                  <Path d={inPath} stroke={COLOR_IN} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
                </>
              ) : null}
              {outPath ? (
                <>
                  <Path d={outPath} stroke={COLOR_OUT} strokeWidth={8} fill="none" opacity={0.12} strokeLinejoin="round" strokeLinecap="round" />
                  <Path d={outPath} stroke={COLOR_OUT} strokeWidth={4} fill="none" opacity={0.25} strokeLinejoin="round" strokeLinecap="round" />
                  <Path d={outPath} stroke={COLOR_OUT} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
                </>
              ) : null}

              {points.length <= 24 &&
                inPts.map((p, i) =>
                  points[i].inCount > 0 ? (
                    <Circle key={`in-${i}`} cx={p.x} cy={p.y} r={2.5} fill={COLOR_IN} opacity={0.9} />
                  ) : null,
                )}
            </>
          )}

          {/* X axis labels */}
          {points.map((p, i) => {
            if (!p.label) return null;
            const x = xFor(i, points.length);
            return (
              <SvgText
                key={`xl-${i}`}
                x={x}
                y={CHART_H - 4}
                fontSize={9}
                fill={labelFill}
                textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
              >
                {p.label}
              </SvgText>
            );
          })}

          {/* Scrubber line + dots */}
          {scrubIndex !== null && scrubPoint && (
            <>
              <Line x1={scrubX} y1={PAD_T} x2={scrubX} y2={PAD_T + INNER_H} stroke={colors.foreground} strokeWidth={1} strokeDasharray="3,3" opacity={0.5} />
              <Circle cx={scrubX} cy={yFor(scrubPoint.inCount, maxVal)} r={5} fill={COLOR_IN} stroke={colors.surface1} strokeWidth={2} />
              <Circle cx={scrubX} cy={yFor(scrubPoint.outCount, maxVal)} r={5} fill={COLOR_OUT} stroke={colors.surface1} strokeWidth={2} />
            </>
          )}
        </Svg>

        {/* Vertical position hint — a faint pill at the bottom of the scrub line */}
        {scrubIndex !== null && scrubPoint && (
          <View
            pointerEvents="none"
            style={[
              styles.scrubPill,
              {
                left: tooltipLeft,
                backgroundColor: colors.surface2,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.scrubPillText, { color: colors.textTertiary }]} numberOfLines={1}>
              {scrubPoint.fullLabel}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: 14, gap: 8 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  title: { fontSize: 9, letterSpacing: 1.2, fontWeight: "500", flex: 1 },
  livePill: { flexDirection: "row", alignItems: "center", gap: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  livePillText: { fontSize: 9, fontWeight: "600" },
  tabs: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
  },
  tabText: { fontSize: 11, fontWeight: "500" },
  // Scrub info strip replaces the old floating tooltip
  scrubStrip: {
    flexDirection: "column",
    justifyContent: "center",
    gap: 2,
    minHeight: 32,
  },
  scrubLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 0.4 },
  scrubValues: { flexDirection: "row", gap: 14 },
  scrubItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  scrubDot: { width: 7, height: 7, borderRadius: 3.5 },
  scrubVal: { fontSize: 12 },
  // Legend (shown when not scrubbing, same height as scrub strip)
  legend: { flexDirection: "row", gap: 14, alignItems: "center", flex: 1 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendSwatch: { width: 18, height: 3, borderRadius: 2 },
  legendText: { fontSize: 10 },
  chartWrap: { height: CHART_H, position: "relative" },
  // Subtle pill at the bottom of the scrub line (just shows the label)
  scrubPill: {
    position: "absolute",
    bottom: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  scrubPillText: { fontSize: 8, fontWeight: "600" },
});
