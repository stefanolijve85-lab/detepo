import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View, FlatList } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/contexts/LanguageContext";
import { LANGUAGES } from "@/i18n/translations";

export function LanguagePicker() {
  const colors = useColors();
  const { language, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);

  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityLabel={t("lang.choose")}
        style={({ pressed }) => [
          styles.btn,
          {
            backgroundColor: pressed ? colors.surface2 : colors.surface1,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={styles.flag}>{current.flag}</Text>
        <Text style={[styles.code, { color: colors.foreground }]}>
          {language.toUpperCase()}
        </Text>
      </Pressable>

      <Modal
        visible={open}
        animationType="fade"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}
          >
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <Text style={[styles.title, { color: colors.foreground }]}>{t("lang.title")}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10} style={[styles.close, { backgroundColor: colors.surface1 }]}>
                <Feather name="x" size={14} color={colors.foreground} />
              </Pressable>
            </View>
            <FlatList
              data={LANGUAGES}
              keyExtractor={(item) => item.code}
              contentContainerStyle={{ padding: 8 }}
              renderItem={({ item }) => {
                const selected = item.code === language;
                return (
                  <Pressable
                    onPress={() => {
                      setLanguage(item.code);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.row,
                      {
                        backgroundColor: pressed
                          ? colors.surface2
                          : selected
                          ? colors.surface1
                          : "transparent",
                      },
                    ]}
                  >
                    <Text style={styles.flagLg}>{item.flag}</Text>
                    <Text style={[styles.label, { color: colors.foreground }]}>{item.label}</Text>
                    {selected && <Feather name="check" size={16} color={colors.green} />}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  flag: { fontSize: 13 },
  code: { fontSize: 10, fontWeight: "700", letterSpacing: 0.4 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  sheet: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 15, fontWeight: "700" },
  close: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 10,
  },
  flagLg: { fontSize: 22 },
  label: { fontSize: 14, fontWeight: "500", flex: 1 },
});
