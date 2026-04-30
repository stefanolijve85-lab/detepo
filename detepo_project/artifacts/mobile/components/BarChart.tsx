import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

interface BarChartProps {
  data: { hour: string; inCount: number; outCount: number }[];
}

export function BarChart({ data }: BarChartProps) {
  const colors = useColors();
  const maxCount = Math.max(...data.map((d) => Math.max(d.inCount, d.outCount)), 1);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface1 }]}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.textTertiary }]}>
          UURLIJKSE STROOM
        </Text>
        <View style={styles.legend}>
          <View style={[styles.legendDot, { backgroundColor: colors.cyan }]} />
          <Text style={[styles.legendText, { color: colors.textTertiary }]}>Ingang</Text>
          <View style={[styles.legendDot, { backgroundColor: colors.amber }]} />
          <Text style={[styles.legendText, { color: colors.textTertiary }]}>Uitgang</Text>
        </View>
      </View>
      <View style={styles.chart}>
        {data.map((item) => (
          <View key={item.hour} style={styles.barWrap}>
            <View style={styles.barContainer}>
              <View
                style={[
                  styles.barOut,
                  {
                    height: `${(item.outCount / maxCount) * 100}%`,
                    backgroundColor: colors.amber,
                    opacity: 0.6,
                  },
                ]}
              />
              <View
                style={[
                  styles.bar,
                  {
                    height: `${(item.inCount / maxCount) * 100}%`,
                    backgroundColor: colors.cyan,
                  },
                ]}
              />
            </View>
            <Text style={[styles.label, { color: colors.textTertiary }]}>
              {item.hour}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 14,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: "500",
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 8,
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 90,
    gap: 3,
  },
  barWrap: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    height: "100%",
    justifyContent: "flex-end",
  },
  barContainer: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-end",
    flexDirection: "row",
    gap: 1,
  },
  bar: {
    flex: 1,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    minHeight: 2,
  },
  barOut: {
    flex: 1,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    minHeight: 2,
  },
  label: {
    fontSize: 7,
  },
});
