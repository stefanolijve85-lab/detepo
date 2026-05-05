import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { getUser, patchUser, type UserDTO } from "../lib/api";

const DEMO_USER_ID = "demo-user";

export default function SettingsScreen() {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [budgetText, setBudgetText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getUser(DEMO_USER_ID).then((u) => {
      setUser(u);
      setBudgetText(u.budgetLimit.toFixed(2));
    });
  }, []);

  if (!user) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  const toggleAutoBuy = async (value: boolean) => {
    setSaving(true);
    const updated = await patchUser(DEMO_USER_ID, { autoBuyEnabled: value });
    setUser(updated);
    setSaving(false);
  };

  const togglePriceDrop = async (value: boolean) => {
    setSaving(true);
    const prefs = { ...(user.preferences ?? {}), priceDropAlertsEnabled: value };
    const updated = await patchUser(DEMO_USER_ID, { preferences: prefs });
    setUser(updated);
    setSaving(false);
  };

  const saveBudget = async () => {
    const n = Number(budgetText);
    if (!Number.isFinite(n) || n <= 0) return;
    setSaving(true);
    const updated = await patchUser(DEMO_USER_ID, { budgetLimit: n });
    setUser(updated);
    setSaving(false);
  };

  const priceDropEnabled = Boolean(
    (user.preferences as Record<string, unknown> | null)?.["priceDropAlertsEnabled"],
  );

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Auto-Buy</Text>
          <Text style={styles.help}>
            Let FlowBuy auto-purchase a high-confidence pick within budget.
          </Text>
        </View>
        <Switch value={user.autoBuyEnabled} onValueChange={toggleAutoBuy} />
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Price Drop Alerts</Text>
          <Text style={styles.help}>
            Notify when an Anti-Buy item drops below its 6-month average.
          </Text>
        </View>
        <Switch value={priceDropEnabled} onValueChange={togglePriceDrop} />
      </View>

      <View>
        <Text style={styles.label}>Budget Limit (EUR)</Text>
        <View style={styles.budgetRow}>
          <TextInput
            value={budgetText}
            onChangeText={setBudgetText}
            keyboardType="decimal-pad"
            style={styles.input}
            placeholderTextColor="#5A5A66"
          />
          <Pressable onPress={saveBudget} style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>{saving ? "..." : "Save"}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B0B0F", padding: 16, gap: 16 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B0B0F",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#15151B",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#23232C",
    padding: 14,
  },
  label: { color: "#fff", fontSize: 15, fontWeight: "700" },
  help: { color: "#8B8B97", fontSize: 12, marginTop: 4 },
  budgetRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  input: {
    flex: 1,
    backgroundColor: "#15151B",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#23232C",
    color: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  saveBtn: {
    paddingHorizontal: 18,
    backgroundColor: "#1FB57A",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: { color: "#0B0B0F", fontWeight: "800" },
});
