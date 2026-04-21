import { Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useColors } from "@/hooks/useColors";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const { t } = useLanguage();
  const colors = useColors();
  const isDark = theme === "dark";

  return (
    <Pressable
      onPress={toggle}
      hitSlop={8}
      accessibilityLabel={isDark ? t("theme.toLight") : t("theme.toDark")}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed ? colors.surface2 : colors.surface1,
          borderColor: colors.border,
        },
      ]}
    >
      <Feather name={isDark ? "sun" : "moon"} size={14} color={colors.foreground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
});
