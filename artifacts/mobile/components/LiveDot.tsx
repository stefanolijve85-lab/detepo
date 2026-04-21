import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/contexts/LanguageContext";

interface LiveDotProps {
  heartbeat: boolean;
}

export function LiveDot({ heartbeat }: LiveDotProps) {
  const colors = useColors();
  const { t } = useLanguage();

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: heartbeat
            ? "rgba(0,229,160,0.1)"
            : "rgba(255,59,92,0.1)",
        },
      ]}
    >
      <View
        style={[
          styles.dot,
          { backgroundColor: heartbeat ? colors.green : colors.red },
        ]}
      />
      <Text
        style={[
          styles.text,
          { color: heartbeat ? colors.green : colors.red },
        ]}
      >
        {heartbeat ? t("common.live") : t("common.offline")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 10,
    fontWeight: "600",
  },
});
