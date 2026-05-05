import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Link } from "expo-router";
import { ProductCard } from "../components/ProductCard";
import { AlternativesRow } from "../components/AlternativesRow";
import { fetchFeed, postInteract } from "../lib/api";
import type { FeedResponse, ProductDTO } from "../../shared/types";

// Hard-coded user id from the seed (we look it up via /users for the demo).
const DEMO_USER_ID = "demo-user";

export default function FeedScreen() {
  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchFeed(DEMO_USER_ID);
      setFeed(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onSwipeBuy = useCallback(async () => {
    if (!feed?.primary) return;
    await postInteract({
      userId: DEMO_USER_ID,
      productId: feed.primary.id,
      recommendationId: feed.recommendationId ?? undefined,
      action: "SWIPE_BUY",
    });
    await load();
  }, [feed, load]);

  const onSwipeSkip = useCallback(async () => {
    if (!feed?.primary) return;
    await postInteract({
      userId: DEMO_USER_ID,
      productId: feed.primary.id,
      recommendationId: feed.recommendationId ?? undefined,
      action: "SWIPE_SKIP",
    });
    await load();
  }, [feed, load]);

  const onPickAlt = useCallback(
    async (alt: ProductDTO) => {
      await postInteract({
        userId: DEMO_USER_ID,
        productId: alt.id,
        recommendationId: feed?.recommendationId ?? undefined,
        action: "ALT_CHOSEN",
      });
      await load();
    },
    [feed, load],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Couldn't load feed</Text>
        <Text style={styles.errorBody}>{error}</Text>
        <Pressable style={styles.retry} onPress={load}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          tintColor="#fff"
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
        />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.headerCity}>{feed?.context.city}</Text>
          <Text style={styles.headerWeather}>
            {feed?.context.weather.conditions} ·{" "}
            {feed?.context.weather.temperatureC}°C
          </Text>
        </View>
        <Link href="/settings" asChild>
          <Pressable style={styles.settingsBtn}>
            <Text style={styles.settingsText}>Settings</Text>
          </Pressable>
        </Link>
      </View>

      {feed?.decisionKill || !feed?.primary ? (
        <View style={styles.killCard}>
          <Text style={styles.killTitle}>Nothing to recommend right now</Text>
          <Text style={styles.killBody}>{feed?.reasoningShort}</Text>
          <Pressable style={styles.retry} onPress={load}>
            <Text style={styles.retryText}>Refresh</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ProductCard
            product={feed.primary}
            reasoningShort={feed.reasoningShort}
            confidence={feed.confidence}
            antiBuy={feed.antiBuy}
            onSwipeBuy={onSwipeBuy}
            onSwipeSkip={onSwipeSkip}
          />
          <AlternativesRow alternatives={feed.alternatives} onPick={onPickAlt} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16, backgroundColor: "#0B0B0F", flexGrow: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  headerCity: { color: "#fff", fontSize: 18, fontWeight: "700" },
  headerWeather: { color: "#8B8B97", fontSize: 13, marginTop: 2 },
  settingsBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#15151B",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#23232C",
  },
  settingsText: { color: "#E8E8F0", fontSize: 13, fontWeight: "600" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B0B0F",
    padding: 24,
    gap: 12,
  },
  errorTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  errorBody: { color: "#8B8B97", textAlign: "center" },
  retry: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: "#1FB57A",
    borderRadius: 12,
  },
  retryText: { color: "#0B0B0F", fontWeight: "800" },
  killCard: {
    backgroundColor: "#15151B",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#23232C",
    gap: 8,
    alignItems: "center",
  },
  killTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  killBody: { color: "#8B8B97", textAlign: "center" },
});
