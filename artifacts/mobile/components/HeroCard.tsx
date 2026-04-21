import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";
import { StatusBadge } from "./StatusBadge";

interface HeroCardProps {
  liveTelling: number;
  status: "calm" | "busy" | "critical";
}

export function HeroCard({ liveTelling, status }: HeroCardProps) {
  const colors = useColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface1 }]}>
      <View style={styles.top}>
        <Text style={[styles.label, { color: colors.textTertiary }]}>
          LIVE TELLING
        </Text>
        <StatusBadge status={status} />
      </View>
      <Text style={[styles.bigNumber, { color: colors.cyan }]}>
        {liveTelling}
      </Text>
      <Text style={[styles.sub, { color: colors.textSecondary }]}>
        personen nu aanwezig
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 16,
    gap: 4,
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  label: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "500",
  },
  bigNumber: {
    fontSize: 64,
    fontWeight: "700",
    letterSpacing: -4,
    lineHeight: 68,
  },
  sub: {
    fontSize: 12,
    marginBottom: 4,
  },
});
