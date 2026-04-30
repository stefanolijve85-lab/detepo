import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";

interface LiveDotProps {
  heartbeat?: boolean;
}

export function LiveDot({ heartbeat = true }: LiveDotProps) {
  const colors = useColors();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (heartbeat) {
      opacity.value = withRepeat(withTiming(0.4, { duration: 1000 }), -1, true);
    } else {
      opacity.value = 0.4;
    }
  }, [heartbeat]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={[styles.badge, { backgroundColor: colors.surface1 }]}>
      <Animated.View
        style={[
          styles.dot,
          { backgroundColor: heartbeat ? colors.green : colors.red },
          animStyle,
        ]}
      />
      <Text style={[styles.text, { color: colors.textSecondary }]}>
        {heartbeat ? "Live" : "Offline"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 12,
    fontWeight: "500",
  },
});
