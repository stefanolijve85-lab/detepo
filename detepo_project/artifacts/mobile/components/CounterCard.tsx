import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { CounterDevice } from "@/hooks/useDashboardData";
import { formatLastSeen } from "@/hooks/useDashboardData";

interface CounterCardProps {
  counter: CounterDevice;
}

export function CounterCard({ counter }: CounterCardProps) {
  const colors = useColors();
  const bezet = Math.max(0, counter.countIn - counter.countOut);
  const capacity = 100;
  const bezettingPct = Math.min(100, Math.round((bezet / capacity) * 100));

  return (
    <View style={[styles.card, { backgroundColor: colors.surface1 }]}>
      {/* Header */}
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: colors.foreground }]}>{counter.name}</Text>
          <Text style={[styles.location, { color: colors.textSecondary }]}>
            {counter.location === "Hoofdingang" && !counter.location ? "Geen locatie" : counter.location || "Geen locatie"}
          </Text>
        </View>
        <View
          style={[
            styles.onlinePill,
            {
              backgroundColor: counter.online ? "rgba(0,229,160,0.15)" : "rgba(255,59,92,0.15)",
              borderColor: counter.online ? "rgba(0,229,160,0.3)" : "rgba(255,59,92,0.3)",
            },
          ]}
        >
          <View
            style={[styles.onlineDot, { backgroundColor: counter.online ? colors.green : colors.red }]}
          />
          <Text style={[styles.onlineText, { color: counter.online ? colors.green : colors.red }]}>
            {counter.online ? "Online" : "Offline"}
          </Text>
        </View>
      </View>

      {/* In / Uit / Bezet */}
      <View style={styles.ioRow}>
        <View style={styles.ioCell}>
          <Text style={[styles.ioNum, { color: colors.foreground }]}>{counter.countIn}</Text>
          <Text style={[styles.ioLabel, { color: colors.textTertiary }]}>In</Text>
        </View>
        <View style={[styles.ioDivider, { backgroundColor: "rgba(255,255,255,0.06)" }]} />
        <View style={styles.ioCell}>
          <Text style={[styles.ioNum, { color: colors.foreground }]}>{counter.countOut}</Text>
          <Text style={[styles.ioLabel, { color: colors.textTertiary }]}>Uit</Text>
        </View>
        <View style={[styles.ioDivider, { backgroundColor: "rgba(255,255,255,0.06)" }]} />
        <View style={styles.ioCell}>
          <Text style={[styles.ioNum, { color: colors.foreground }]}>{bezet}</Text>
          <Text style={[styles.ioLabel, { color: colors.textTertiary }]}>Bezet</Text>
        </View>
      </View>

      {/* Capacity bar */}
      <View style={styles.capRow}>
        <Text style={[styles.capText, { color: colors.textSecondary }]}>
          Bezetting {bezettingPct}% van capaciteit ({capacity})
        </Text>
        <View style={[styles.capBg, { backgroundColor: colors.surface2 }]}>
          <View
            style={[
              styles.capFill,
              {
                width: `${bezettingPct}%`,
                backgroundColor: bezettingPct > 80 ? colors.red : bezettingPct > 50 ? colors.amber : colors.cyan,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  head: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  name: { fontSize: 14, fontWeight: "700" },
  location: { fontSize: 11, marginTop: 2 },
  onlinePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  onlineDot: { width: 6, height: 6, borderRadius: 3 },
  onlineText: { fontSize: 11, fontWeight: "600" },
  ioRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ioCell: { flex: 1, alignItems: "center", gap: 4 },
  ioNum: { fontSize: 28, fontWeight: "700", letterSpacing: -1 },
  ioLabel: { fontSize: 10, fontWeight: "500" },
  ioDivider: { width: 1, height: 40 },
  capRow: { gap: 6 },
  capText: { fontSize: 10 },
  capBg: { height: 4, borderRadius: 2, overflow: "hidden" },
  capFill: { height: "100%", borderRadius: 2 },
});
