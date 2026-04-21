import { Pressable, StyleSheet, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface HelpDotProps {
  title: string;
  message: string;
}

/**
 * Small "?" circle. Tap → shows an Alert with explanation text.
 */
export function HelpDot({ title, message }: HelpDotProps) {
  const colors = useColors();
  return (
    <Pressable
      onPress={() => Alert.alert(title, message, [{ text: "OK" }])}
      hitSlop={8}
      style={({ pressed }) => [
        styles.dot,
        {
          backgroundColor: pressed ? colors.surface2 : colors.surface1,
          borderColor: colors.border,
        },
      ]}
      accessibilityLabel={`Uitleg over ${title}`}
    >
      <Feather name="help-circle" size={11} color={colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
