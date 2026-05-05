import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { ProductDTO } from "../../shared/types";

interface Props {
  alternatives: ProductDTO[];
  onPick: (alt: ProductDTO) => void;
}

export function AlternativesRow({ alternatives, onPick }: Props) {
  if (alternatives.length === 0) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.label}>Or try</Text>
      <View style={styles.items}>
        {alternatives.map((a) => (
          <Pressable
            key={a.id}
            onPress={() => onPick(a)}
            style={({ pressed }) => [styles.alt, pressed && { opacity: 0.7 }]}
          >
            <Image source={{ uri: a.imageUrl }} style={styles.thumb} />
            <View style={styles.altText}>
              <Text style={styles.altTitle} numberOfLines={1}>
                {a.title}
              </Text>
              <Text style={styles.altPrice}>
                {a.currency === "EUR" ? "€" : ""}
                {a.price.toFixed(2)}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8 },
  label: { color: "#8B8B97", fontSize: 12, letterSpacing: 0.5, textTransform: "uppercase" },
  items: { flexDirection: "row", gap: 10 },
  alt: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#15151B",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#23232C",
    padding: 8,
  },
  thumb: { width: 48, height: 48, borderRadius: 8, backgroundColor: "#23232C" },
  altText: { flex: 1 },
  altTitle: { color: "#E8E8F0", fontSize: 13, fontWeight: "600" },
  altPrice: { color: "#8B8B97", fontSize: 12, marginTop: 2 },
});
