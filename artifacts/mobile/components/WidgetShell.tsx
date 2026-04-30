/**
 * WidgetShell — wraps any card in an optional "edit mode" overlay
 * that shows up/down reorder arrows.
 */
import { ReactNode } from "react";
import { View, Pressable, StyleSheet, Animated } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface Props {
  children: ReactNode;
  editMode: boolean;
  id: string;
  order: string[];
  onMove: (id: string, dir: "up" | "down") => void;
}

export function WidgetShell({ children, editMode, id, order, onMove }: Props) {
  const colors = useColors();
  const idx = order.indexOf(id);
  const canUp = idx > 0;
  const canDown = idx < order.length - 1;

  return (
    <View style={editMode ? [styles.editWrap, { borderColor: colors.cyan }] : undefined}>
      {children}
      {editMode && (
        <View style={[styles.controls, { backgroundColor: colors.surface2 }]}>
          <Pressable
            onPress={() => onMove(id, "up")}
            disabled={!canUp}
            style={[styles.arrow, !canUp && styles.arrowDisabled]}
            hitSlop={6}
          >
            <Feather name="chevron-up" size={16} color={canUp ? colors.cyan : colors.textTertiary} />
          </Pressable>
          <Pressable
            onPress={() => onMove(id, "down")}
            disabled={!canDown}
            style={[styles.arrow, !canDown && styles.arrowDisabled]}
            hitSlop={6}
          >
            <Feather name="chevron-down" size={16} color={canDown ? colors.cyan : colors.textTertiary} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  editWrap: {
    borderWidth: 1.5,
    borderRadius: 16,
    borderStyle: "dashed",
  },
  controls: {
    position: "absolute",
    top: 6,
    right: 6,
    flexDirection: "row",
    borderRadius: 8,
    overflow: "hidden",
    gap: 0,
  },
  arrow: {
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowDisabled: { opacity: 0.3 },
});
