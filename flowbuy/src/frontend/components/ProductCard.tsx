import React from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import type { ProductDTO } from "../../shared/types";

interface Props {
  product: ProductDTO;
  reasoningShort: string;
  confidence: number;
  antiBuy: { triggered: boolean; warning: string | null };
  onSwipeBuy: () => void;
  onSwipeSkip: () => void;
}

const SWIPE_THRESHOLD = 120;

export function ProductCard({
  product,
  reasoningShort,
  confidence,
  antiBuy,
  onSwipeBuy,
  onSwipeSkip,
}: Props) {
  const { width } = useWindowDimensions();
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const rotation = useSharedValue(0);

  const reset = () => {
    tx.value = withSpring(0);
    ty.value = withSpring(0);
    rotation.value = withSpring(0);
  };

  const fly = (dir: 1 | -1, after: () => void) => {
    tx.value = withTiming(dir * width * 1.2, { duration: 220 });
    rotation.value = withTiming(dir * 12, { duration: 220 }, () => {
      runOnJS(after)();
    });
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY * 0.4;
      rotation.value = (e.translationX / width) * 12;
    })
    .onEnd(() => {
      if (tx.value > SWIPE_THRESHOLD) {
        fly(1, onSwipeBuy);
      } else if (tx.value < -SWIPE_THRESHOLD) {
        fly(-1, onSwipeSkip);
      } else {
        reset();
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const buyHintStyle = useAnimatedStyle(() => ({ opacity: Math.max(0, tx.value / SWIPE_THRESHOLD) }));
  const skipHintStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, -tx.value / SWIPE_THRESHOLD),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.card, cardStyle]}>
        <Image source={{ uri: product.imageUrl }} style={styles.image} />

        <Animated.View style={[styles.cornerHint, styles.buyHint, buyHintStyle]}>
          <Text style={styles.cornerHintText}>BUY</Text>
        </Animated.View>
        <Animated.View style={[styles.cornerHint, styles.skipHint, skipHintStyle]}>
          <Text style={styles.cornerHintText}>SKIP</Text>
        </Animated.View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.brand} numberOfLines={1}>
              {product.brand ?? ""}
            </Text>
            <ConfidencePill confidence={confidence} />
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {product.title}
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>
              {formatPrice(product.price, product.currency)}
            </Text>
            {antiBuy.triggered ? (
              <View style={styles.antiBuyTag}>
                <Text style={styles.antiBuyTagText}>ANTI-BUY</Text>
              </View>
            ) : null}
          </View>

          <ReasoningBubble text={reasoningShort} />

          {antiBuy.triggered && antiBuy.warning ? (
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>Wait — don't buy yet</Text>
              <Text style={styles.warningBody}>{antiBuy.warning}</Text>
            </View>
          ) : (
            <Pressable
              onPress={onSwipeBuy}
              style={({ pressed }) => [styles.buyButton, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.buyButtonText}>Buy</Text>
            </Pressable>
          )}

          <Text style={styles.swipeHint}>
            Swipe right to buy · left to skip
          </Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

function ConfidencePill({ confidence }: { confidence: number }) {
  const tone =
    confidence >= 85 ? "#1FB57A" : confidence >= 70 ? "#E0B040" : "#E25A5A";
  return (
    <View style={[styles.pill, { borderColor: tone }]}>
      <View style={[styles.pillDot, { backgroundColor: tone }]} />
      <Text style={[styles.pillText, { color: tone }]}>
        Confidence {confidence}
      </Text>
    </View>
  );
}

function ReasoningBubble({ text }: { text: string }) {
  return (
    <View style={styles.bubble}>
      <Text style={styles.bubbleLabel}>Why this?</Text>
      <Text style={styles.bubbleText}>{text}</Text>
    </View>
  );
}

function formatPrice(price: number, currency: string): string {
  const symbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : `${currency} `;
  return `${symbol}${price.toFixed(2)}`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#15151B",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#23232C",
  },
  image: { width: "100%", height: 360, backgroundColor: "#23232C" },
  cornerHint: {
    position: "absolute",
    top: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 2,
  },
  buyHint: { right: 24, borderColor: "#1FB57A" },
  skipHint: { left: 24, borderColor: "#E25A5A" },
  cornerHintText: { color: "#fff", fontWeight: "800", letterSpacing: 1 },
  body: { padding: 20, gap: 12 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { color: "#8B8B97", fontSize: 13, letterSpacing: 0.5, textTransform: "uppercase" },
  title: { color: "#fff", fontSize: 22, fontWeight: "700" },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  price: { color: "#fff", fontSize: 28, fontWeight: "800" },
  antiBuyTag: {
    backgroundColor: "rgba(226,90,90,0.15)",
    borderColor: "#E25A5A",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  antiBuyTagText: { color: "#E25A5A", fontWeight: "800", letterSpacing: 1, fontSize: 11 },
  bubble: {
    backgroundColor: "#1E1E27",
    padding: 14,
    borderRadius: 14,
    borderColor: "#2A2A36",
    borderWidth: 1,
  },
  bubbleLabel: { color: "#8B8B97", fontSize: 12, marginBottom: 4, letterSpacing: 0.5 },
  bubbleText: { color: "#E8E8F0", fontSize: 15, lineHeight: 21 },
  warningBox: {
    backgroundColor: "rgba(226,90,90,0.08)",
    borderColor: "rgba(226,90,90,0.5)",
    borderWidth: 1,
    padding: 14,
    borderRadius: 14,
  },
  warningTitle: { color: "#E25A5A", fontWeight: "800", marginBottom: 4 },
  warningBody: { color: "#FFB4B4", fontSize: 14, lineHeight: 20 },
  buyButton: {
    backgroundColor: "#1FB57A",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  buyButtonText: { color: "#0B0B0F", fontSize: 16, fontWeight: "800", letterSpacing: 0.5 },
  swipeHint: { color: "#5A5A66", fontSize: 12, textAlign: "center" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 12, fontWeight: "700" },
});
