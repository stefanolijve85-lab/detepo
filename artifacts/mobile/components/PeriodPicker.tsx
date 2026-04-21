import React, { useMemo, useState, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth, DETEPO_API_BASE } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

export type PeriodMode = "weeks" | "months";

interface PeriodPickerProps {
  visible: boolean;
  mode: PeriodMode;
  onClose: () => void;
}

interface PeriodOption {
  key: string;
  label: string;
  sub: string;
  from: string;
  to: string;
}

function pad(n: number) { return String(n).padStart(2, "0"); }
function ymd(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const diff = (d.getTime() - firstThursday.getTime()) / 86400000;
  return 1 + Math.round((diff - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
}

export function PeriodPicker({ visible, mode, onClose }: PeriodPickerProps) {
  const colors = useColors();
  const { user, token } = useAuth();
  const { t, months, monthsShort, formatNumber } = useLanguage();
  const [values, setValues] = useState<Record<string, { loading: boolean; total?: number; error?: boolean }>>({});

  const options = useMemo<PeriodOption[]>(() => {
    const out: PeriodOption[] = [];
    const today = new Date();
    if (mode === "weeks") {
      const dayOfWeek = (today.getDay() + 6) % 7;
      const thisMonday = new Date(today);
      thisMonday.setHours(0, 0, 0, 0);
      thisMonday.setDate(today.getDate() - dayOfWeek);
      for (let i = 0; i < 52; i++) {
        const start = new Date(thisMonday);
        start.setDate(thisMonday.getDate() - i * 7);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        const weekNum = getISOWeek(start);
        const label = i === 0
          ? t("period.thisWeek", { n: weekNum })
          : t("period.weekN", { n: weekNum, y: start.getFullYear() });
        const sub = `${start.getDate()} ${monthsShort[start.getMonth()]} – ${end.getDate()} ${monthsShort[end.getMonth()]}`;
        out.push({ key: `w-${start.toISOString()}`, label, sub, from: ymd(start), to: ymd(end) });
      }
    } else {
      for (let i = 0; i < 12; i++) {
        const start = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const end = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
        const label = i === 0
          ? t("period.thisMonth", { m: months[start.getMonth()] })
          : t("period.monthY", { m: months[start.getMonth()], y: start.getFullYear() });
        const sub = `${start.getDate()} ${monthsShort[start.getMonth()]} – ${end.getDate()} ${monthsShort[end.getMonth()]}`;
        out.push({ key: `m-${start.toISOString()}`, label, sub, from: ymd(start), to: ymd(end) });
      }
    }
    return out;
  }, [mode, t, months, monthsShort]);

  const fetchValue = useCallback(
    async (opt: PeriodOption) => {
      setValues((v) => ({ ...v, [opt.key]: { loading: true } }));
      try {
        const orgId = user?.role !== "platform_admin" ? user?.org?.id : null;
        const params = new URLSearchParams({
          from: opt.from,
          to: opt.to,
          _: String(Date.now()),
        });
        if (orgId) params.set("org_id", String(orgId));
        const headers: Record<string, string> = { Accept: "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(`${DETEPO_API_BASE}/overview?${params}`, { headers });
        if (!res.ok) throw new Error(String(res.status));
        const json: { totalIn?: number; weekTotal?: number; monthTotal?: number } = await res.json();
        const total = Number(json.totalIn ?? json.weekTotal ?? json.monthTotal ?? 0);
        setValues((v) => ({ ...v, [opt.key]: { loading: false, total: Number.isFinite(total) ? total : 0 } }));
      } catch {
        setValues((v) => ({ ...v, [opt.key]: { loading: false, error: true } }));
      }
    },
    [token, user?.role, user?.org?.id]
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {mode === "weeks" ? t("period.weeks") : t("period.months")}
          </Text>
          <Pressable onPress={onClose} hitSlop={10} style={[styles.closeBtn, { backgroundColor: colors.surface1 }]}>
            <Feather name="x" size={16} color={colors.foreground} />
          </Pressable>
        </View>
        <View style={[styles.note, { backgroundColor: colors.surface1, borderColor: colors.border }]}>
          <Feather name="info" size={11} color={colors.textTertiary} />
          <Text style={[styles.noteText, { color: colors.textTertiary }]}>{t("period.tip")}</Text>
        </View>
        <FlatList
          data={options}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ padding: 16, gap: 6, paddingBottom: Platform.OS === "ios" ? 40 : 24 }}
          renderItem={({ item }) => {
            const state = values[item.key];
            return (
              <Pressable
                onPress={() => fetchValue(item)}
                style={({ pressed }) => [
                  styles.item,
                  {
                    backgroundColor: pressed ? colors.surface2 : colors.surface1,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemLabel, { color: colors.foreground }]}>{item.label}</Text>
                  <Text style={[styles.itemSub, { color: colors.textTertiary }]}>{item.sub}</Text>
                </View>
                <View style={styles.valueWrap}>
                  {state?.loading ? (
                    <ActivityIndicator size="small" color={colors.foreground} />
                  ) : state?.error ? (
                    <Text style={[styles.itemValue, { color: colors.textTertiary }]}>—</Text>
                  ) : state?.total != null ? (
                    <Text style={[styles.itemValue, { color: colors.foreground }]}>
                      {formatNumber(state.total)}
                    </Text>
                  ) : (
                    <Feather name="chevron-right" size={16} color={colors.textTertiary} />
                  )}
                </View>
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 17, fontWeight: "700", letterSpacing: -0.3 },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: "center", justifyContent: "center",
  },
  item: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 12, borderWidth: 1,
  },
  itemLabel: { fontSize: 13, fontWeight: "600" },
  itemSub: { fontSize: 11, marginTop: 2 },
  valueWrap: { minWidth: 60, alignItems: "flex-end" },
  itemValue: { fontSize: 16, fontWeight: "700", letterSpacing: -0.3 },
  note: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    margin: 16, marginBottom: 0, padding: 10,
    borderRadius: 10, borderWidth: 1,
  },
  noteText: { fontSize: 11, lineHeight: 15, flex: 1 },
});
