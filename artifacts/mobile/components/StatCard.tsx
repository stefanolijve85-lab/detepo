import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  color: string;
}

export function StatCard({ label, value, sub, color }: StatCardProps) {
  const colors = useColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface1 }]}>
      <Text style={[styles.label, { color: colors.textTertiary }]}>
        {label}
      </Text>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={[styles.sub, { color: colors.textSecondary }]}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 12,
    flex: 1,
  },
  label: {
    fontSize: 9,
    letterSpacing: 1.2,
    fontWeight: "500",
    marginBottom: 4,
  },
  value: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: 10,
    marginTop: 2,
  },
});
