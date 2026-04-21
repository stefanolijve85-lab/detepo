import colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";

/**
 * Returns the design tokens for the current theme (controlled via ThemeContext).
 */
export function useColors() {
  const { theme } = useTheme();
  const palette = theme === "light" ? colors.light : colors.dark;
  return { ...palette, radius: colors.radius };
}
