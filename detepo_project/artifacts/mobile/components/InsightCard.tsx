import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface InsightCardProps {
  title: string;
  body: string;
}

export function InsightCard({ title, body }: InsightCardProps) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface1,
          borderColor: "rgba(61,142,255,0.15)",
        },
      ]}
    >
      <View style={styles.head}>
        <View style={styles.iconWrap}>
          <Feather name="activity" size={13} color={colors.blue} />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {title}
        </Text>
        <View style={styles.chip}>
          <Text style={[styles.chipText, { color: colors.blue }]}>AI</Text>
        </View>
      </View>
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        {body}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    gap: 6,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: "rgba(61,142,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  chip: {
    backgroundColor: "rgba(61,142,255,0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  chipText: {
    fontSize: 9,
    fontWeight: "500",
  },
  body: {
    fontSize: 11,
    lineHeight: 17,
  },
});
