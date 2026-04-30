import { useState, useCallback } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Platform,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useDashboard } from "@/contexts/DashboardContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWidgetOrder } from "@/contexts/WidgetOrderContext";
import { LiveDot } from "@/components/LiveDot";
import { LineChart } from "@/components/LineChart";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguagePicker } from "@/components/LanguagePicker";
import { PeriodPicker, PeriodMode } from "@/components/PeriodPicker";
import { PctBadge } from "@/components/PctBadge";
import { WidgetShell } from "@/components/WidgetShell";

function PeriodCard({
  label,
  value,
  previous,
  compareLabel,
  onPress,
}: {
  label: string;
  value: number;
  previous: number;
  compareLabel: string;
  onPress?: () => void;
}) {
  const colors = useColors();
  const { formatNumber } = useLanguage();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.statCard,
        { backgroundColor: pressed && onPress ? colors.surface2 : colors.surface1 },
      ]}
    >
      <View style={styles.periodHeaderRow}>
        <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{label}</Text>
        {onPress && <Feather name="chevron-down" size={11} color={colors.textTertiary} />}
      </View>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{formatNumber(value)}</Text>
      <PctBadge current={value} previous={previous} label={compareLabel} />
    </Pressable>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, loading, refresh, connectionError } = useDashboard();
  const { user, logout } = useAuth();
  const { t, formatNumber } = useLanguage();
  const isWeb = Platform.OS === "web";
  const { order, move, reset } = useWidgetOrder("home");

  const [pickerMode, setPickerMode] = useState<PeriodMode | null>(null);
  const [editMode, setEditMode] = useState(false);

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12
      ? t("home.greeting.morning")
      : hour < 18
      ? t("home.greeting.afternoon")
      : t("home.greeting.evening");

  // Build widget map
  const widgets: Record<string, React.ReactNode> = {
    occupancy: (
      <View style={[styles.heroCard, { backgroundColor: colors.surface1 }]}>
        <View style={styles.heroTop}>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
            {t("home.currentOccupancy")}
          </Text>
          <View style={[styles.livePill, { backgroundColor: "rgba(0,229,160,0.1)" }]}>
            <View style={[styles.liveDot, { backgroundColor: colors.green }]} />
            <Text style={[styles.livePillText, { color: colors.green }]}>{t("common.live")}</Text>
          </View>
        </View>
        <Text style={[styles.heroValue, { color: colors.foreground }]}>{data.liveTelling}</Text>
        <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
          {t("home.visitorsPresent")}
        </Text>
      </View>
    ),
    today: (
      <View style={[styles.statCard, { backgroundColor: colors.surface1 }]}>
        <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{t("home.today")}</Text>
        <View style={styles.statRow}>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {formatNumber(data.dagTotaalIn)}
          </Text>
          <PctBadge
            current={data.dagTotaalIn}
            previous={data.yesterdayDagTotaalIn}
            label={t("home.vsYesterday")}
            size="md"
          />
        </View>
        <View style={styles.inOutRow}>
          <View style={styles.inOutItem}>
            <View style={[styles.inOutDot, { backgroundColor: colors.green }]} />
            <Text style={[styles.inOutText, { color: colors.foreground }]}>
              {t("home.in")}: {data.dagTotaalIn}
            </Text>
          </View>
          <View style={styles.inOutItem}>
            <View style={[styles.inOutDot, { backgroundColor: "#3D8EFF" }]} />
            <Text style={[styles.inOutText, { color: colors.foreground }]}>
              {t("home.out")}: {data.dagTotaalOut}
            </Text>
          </View>
        </View>
      </View>
    ),
    periods: (
      <View style={styles.row}>
        <PeriodCard
          label={t("home.last7")}
          value={data.weekTotaal}
          previous={data.lastWeekTotaal}
          compareLabel={t("home.vsLastWeek")}
          onPress={!editMode ? () => setPickerMode("weeks") : undefined}
        />
        <PeriodCard
          label={t("home.last30")}
          value={data.maandTotaal}
          previous={data.lastMonthTotaal}
          compareLabel={t("home.vsLastMonth")}
          onPress={!editMode ? () => setPickerMode("months") : undefined}
        />
      </View>
    ),
    chart: <LineChart data={data.hourlyData} dailyHistory={data.dailyHistory} />,
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: isWeb ? 67 : insets.top + 10,
          paddingBottom: isWeb ? 34 + 84 : insets.bottom + 84,
        },
      ]}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.foreground} />
      }
      scrollEnabled={!editMode}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.greeting, { color: colors.textTertiary }]}>{greeting}</Text>
          <Text style={[styles.orgName, { color: colors.foreground }]}>
            {user?.org?.name ?? user?.name ?? "Detepo Dashboard"}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <LiveDot heartbeat={data.heartbeatOnline} />
          <View style={styles.headerActions}>
            <LanguagePicker />
            <ThemeToggle />
            <Pressable
              onPress={logout}
              style={[
                styles.logoutBtn,
                { backgroundColor: colors.surface1, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.logoutText, { color: colors.foreground }]}>
                {t("home.logout")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Connection error */}
      {connectionError && (
        <View
          style={[
            styles.errorBanner,
            { backgroundColor: colors.surface1, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.errorText, { color: colors.foreground }]}>
            {t("home.errorBanner")}
          </Text>
        </View>
      )}

      {/* Edit layout bar */}
      {editMode ? (
        <View style={[styles.editBar, { backgroundColor: colors.surface1, borderColor: colors.cyan }]}>
          <View style={styles.editBarLeft}>
            <Feather name="move" size={14} color={colors.cyan} />
            <Text style={[styles.editBarText, { color: colors.cyan }]}>
              {t("home.editLayout")}
            </Text>
          </View>
          <View style={styles.editBarRight}>
            <Pressable onPress={reset} hitSlop={6}>
              <Text style={[styles.editBarAction, { color: colors.textTertiary }]}>
                {t("home.resetLayout")}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setEditMode(false)}
              style={[styles.editDoneBtn, { backgroundColor: colors.cyan }]}
            >
              <Text style={[styles.editDoneText, { color: "#fff" }]}>{t("home.doneEditing")}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onLongPress={() => setEditMode(true)}
          delayLongPress={600}
          style={[styles.editHint, { backgroundColor: colors.surface1 }]}
        >
          <Feather name="move" size={12} color={colors.textTertiary} />
          <Text style={[styles.editHintText, { color: colors.textTertiary }]}>
            {t("home.longPressToEdit")}
          </Text>
        </Pressable>
      )}

      {/* Widgets in stored order */}
      {order.map((id) => {
        const widget = widgets[id];
        if (!widget) return null;
        return (
          <WidgetShell key={id} editMode={editMode} id={id} order={order} onMove={move}>
            {widget}
          </WidgetShell>
        );
      })}

      {/* Picker modal */}
      {pickerMode && (
        <PeriodPicker
          visible={pickerMode !== null}
          mode={pickerMode}
          onClose={() => setPickerMode(null)}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 8 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
    gap: 10,
  },
  greeting: { fontSize: 10, letterSpacing: 1.5, fontWeight: "500" },
  orgName: { fontSize: 18, fontWeight: "700", letterSpacing: -0.3, marginTop: 2 },
  headerRight: { alignItems: "flex-end", gap: 6 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  logoutBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  logoutText: { fontSize: 10, fontWeight: "600" },
  errorBanner: { borderRadius: 10, borderWidth: 1, padding: 10 },
  errorText: { fontSize: 11, textAlign: "center" },
  heroCard: { borderRadius: 14, padding: 16, gap: 4 },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  livePillText: { fontSize: 10, fontWeight: "600" },
  heroValue: { fontSize: 52, fontWeight: "700", letterSpacing: -2, lineHeight: 58 },
  heroSub: { fontSize: 11, marginTop: 2 },
  row: { flexDirection: "row", gap: 8 },
  statCard: { flex: 1, borderRadius: 14, padding: 14, gap: 6 },
  statLabel: { fontSize: 9, letterSpacing: 1.2, fontWeight: "500" },
  statValue: { fontSize: 36, fontWeight: "700", letterSpacing: -1, lineHeight: 40 },
  statRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  inOutRow: { flexDirection: "row", gap: 12 },
  inOutItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  inOutDot: { width: 6, height: 6, borderRadius: 3 },
  inOutText: { fontSize: 10 },
  periodHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  // Edit mode
  editBar: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  editBarLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  editBarText: { fontSize: 12, fontWeight: "700" },
  editBarRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  editBarAction: { fontSize: 11 },
  editDoneBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  editDoneText: { fontSize: 12, fontWeight: "700" },
  editHint: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-end",
  },
  editHintText: { fontSize: 10 },
});
