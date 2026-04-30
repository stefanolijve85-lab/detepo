import { useMemo, useState, useEffect, useCallback } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  StyleSheet,
  Platform,
  Pressable,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useDashboard } from "@/contexts/DashboardContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguagePicker } from "@/components/LanguagePicker";
import { CollapsibleDevice } from "@/components/CollapsibleDevice";
import type { CounterDevice } from "@/hooks/useDashboardData";

const NAMES_KEY = "detepo:location_names";

interface LocationGroup {
  originalName: string;
  displayName: string;
  counters: CounterDevice[];
  onlineCount: number;
}

export default function LocationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data } = useDashboard();
  const { t } = useLanguage();
  const isWeb = Platform.OS === "web";
  const [openLoc, setOpenLoc] = useState<Record<string, boolean>>({});
  // Custom display names keyed by originalName
  const [customNames, setCustomNames] = useState<Record<string, string>>({});
  // Which location is currently being edited
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Load persisted names
  useEffect(() => {
    AsyncStorage.getItem(NAMES_KEY)
      .then((raw) => {
        if (raw) setCustomNames(JSON.parse(raw) as Record<string, string>);
      })
      .catch(() => {});
  }, []);

  const persistNames = useCallback((next: Record<string, string>) => {
    AsyncStorage.setItem(NAMES_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const startEdit = (original: string) => {
    setEditingName(original);
    setEditValue(customNames[original] ?? original);
  };

  const commitEdit = () => {
    if (editingName === null) return;
    const trimmed = editValue.trim();
    const next = { ...customNames };
    if (trimmed && trimmed !== editingName) {
      next[editingName] = trimmed;
    } else {
      delete next[editingName]; // revert to original
    }
    setCustomNames(next);
    persistNames(next);
    setEditingName(null);
  };

  const cancelEdit = () => setEditingName(null);

  const groups: LocationGroup[] = useMemo(() => {
    const map = new Map<string, CounterDevice[]>();
    data.counters.forEach((c) => {
      const key = (c.location ?? "").trim() || "—";
      const list = map.get(key) ?? [];
      list.push(c);
      map.set(key, list);
    });
    return Array.from(map.entries())
      .map(([originalName, counters]) => ({
        originalName,
        displayName: customNames[originalName] ?? originalName,
        counters,
        onlineCount: counters.filter((c) => c.online).length,
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [data.counters, customNames]);

  const totalCounters = data.counters.length;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: isWeb ? 67 : insets.top + 10,
            paddingBottom: isWeb ? 34 + 84 : insets.bottom + 84,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>{t("locations.title")}</Text>
            <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
              {t("locations.subtitle", { count: groups.length, counters: totalCounters })}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <LanguagePicker />
            <ThemeToggle />
          </View>
        </View>

        {groups.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface1 }]}>
            <Feather name="map-pin" size={22} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {t("locations.empty.title")}
            </Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              {t("locations.empty.sub")}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {groups.map((g) => {
              const isOpen = openLoc[g.originalName] !== false;
              const isEditing = editingName === g.originalName;
              const hasCustomName = !!customNames[g.originalName];

              return (
                <View
                  key={g.originalName}
                  style={[styles.locationCard, { backgroundColor: colors.surface1 }]}
                >
                  {/* Location header */}
                  <View style={styles.locationHead}>
                    <View style={[styles.locIcon, { backgroundColor: "rgba(61,142,255,0.12)" }]}>
                      <Feather name="map-pin" size={16} color={colors.blue} />
                    </View>

                    <View style={{ flex: 1 }}>
                      {isEditing ? (
                        /* Inline name edit */
                        <View style={styles.editRow}>
                          <TextInput
                            value={editValue}
                            onChangeText={setEditValue}
                            onBlur={commitEdit}
                            onSubmitEditing={commitEdit}
                            autoFocus
                            selectTextOnFocus
                            style={[
                              styles.nameInput,
                              {
                                color: colors.foreground,
                                borderColor: colors.cyan,
                                backgroundColor: colors.surface2,
                              },
                            ]}
                            returnKeyType="done"
                            maxLength={40}
                          />
                          <Pressable onPress={cancelEdit} hitSlop={8} style={styles.editIconBtn}>
                            <Feather name="x" size={16} color={colors.textTertiary} />
                          </Pressable>
                          <Pressable
                            onPress={commitEdit}
                            hitSlop={8}
                            style={[styles.editIconBtn, { backgroundColor: "rgba(0,200,224,0.12)" }]}
                          >
                            <Feather name="check" size={16} color={colors.cyan} />
                          </Pressable>
                        </View>
                      ) : (
                        /* Name + sub */
                        <View style={styles.nameBlock}>
                          <View style={styles.nameRow}>
                            <Text
                              style={[styles.locName, { color: colors.foreground }]}
                              numberOfLines={1}
                            >
                              {g.displayName}
                            </Text>
                            {hasCustomName && (
                              <Text style={[styles.originalTag, { color: colors.textTertiary }]}>
                                ({g.originalName})
                              </Text>
                            )}
                          </View>
                          <Text style={[styles.locSub, { color: colors.textTertiary }]}>
                            {g.counters.length === 1
                              ? t("locations.counter")
                              : t("locations.counters", { n: g.counters.length })}
                            {" · "}
                            {g.onlineCount}/{g.counters.length}{" "}
                            {t("common.online").toLowerCase()}
                          </Text>
                        </View>
                      )}
                    </View>

                    {!isEditing && (
                      <View style={styles.headBtns}>
                        {/* Rename button — tap pencil to give this location a custom name */}
                        <Pressable
                          onPress={() => startEdit(g.originalName)}
                          hitSlop={10}
                          style={[styles.iconBtn, { backgroundColor: colors.surface2 }]}
                        >
                          <Feather name="edit-2" size={15} color={colors.textSecondary} />
                        </Pressable>
                        <Pressable
                          onPress={() =>
                            setOpenLoc((prev) => ({ ...prev, [g.originalName]: !isOpen }))
                          }
                          hitSlop={10}
                          style={styles.chevronBtn}
                        >
                          <Feather
                            name={isOpen ? "chevron-up" : "chevron-down"}
                            size={18}
                            color={colors.textTertiary}
                          />
                        </Pressable>
                      </View>
                    )}
                  </View>

                  {/* Counters list */}
                  {isOpen && !isEditing && (
                    <View style={styles.countersList}>
                      {g.counters.map((device) => (
                        <CollapsibleDevice key={device.id} device={device} />
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 10 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  title: { fontSize: 22, fontWeight: "700", letterSpacing: -0.4 },
  subtitle: { fontSize: 11, marginTop: 2 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  list: { gap: 10 },
  locationCard: { borderRadius: 14, padding: 12, gap: 10 },
  locationHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  locIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  nameBlock: { gap: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  locName: { fontSize: 14, fontWeight: "700" },
  originalTag: { fontSize: 10, fontStyle: "italic" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  locSub: { fontSize: 11 },
  renameChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  renameChipText: { fontSize: 10, fontWeight: "600" },
  headBtns: { flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 0 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  chevronBtn: { padding: 6, marginTop: -2 },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  nameInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 36,
  },
  editIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  countersList: { gap: 8 },
  emptyCard: {
    borderRadius: 14,
    padding: 28,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: { fontSize: 14, fontWeight: "700", marginTop: 2 },
  emptySub: { fontSize: 11, textAlign: "center", lineHeight: 16 },
});
