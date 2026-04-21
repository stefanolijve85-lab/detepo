import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Redirect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import detepoLogo from "@/assets/images/detepo-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useColors } from "@/hooks/useColors";
import { LanguagePicker } from "@/components/LanguagePicker";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LoginScreen() {
  const colors = useColors();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!authLoading && isAuthenticated) {
    return <Redirect href="/" />;
  }

  const isLight = theme === "light";

  // Light theme: brand blue card with white text. Dark theme: navy card.
  const cardBg = isLight ? "#3D8EFF" : "rgba(17,30,53,0.94)";
  const cardBorder = isLight ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)";
  const onCardText = "#FFFFFF";
  const onCardMuted = "rgba(234,234,234,0.85)";
  const onCardSubtle = "rgba(234,234,234,0.65)";
  const inputBg = isLight ? "rgba(255,255,255,0.18)" : "#172540";
  const inputBorder = isLight ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)";
  const inputText = "#FFFFFF";
  const inputPlaceholder = "rgba(234,234,234,0.55)";
  const buttonBg = isLight ? "#FFFFFF" : "#3D8EFF";
  const buttonText = isLight ? "#1E40AF" : "#FFFFFF";
  const glowColor = isLight ? "rgba(61,142,255,0.22)" : "rgba(61,142,255,0.14)";

  const submit = async () => {
    if (!email.trim() || !password) {
      setError(t("login.errorRequired"));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await login(email, password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login.errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 20 }]}
    >
      <View style={[styles.topActions, { top: insets.top + 12 }]}>
        <ThemeToggle />
        <LanguagePicker />
      </View>
      <View style={[styles.glowTop, { backgroundColor: glowColor }]} />
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <Image
          source={detepoLogo}
          style={styles.logoImage}
          contentFit="contain"
          tintColor="#FFFFFF"
        />
        <Text style={[styles.title, { color: onCardText }]}>Detepo</Text>
        <Text style={[styles.subtitle, { color: onCardMuted }]}>
          {t("login.subtitle")}
        </Text>

        <View style={styles.form}>
          <View>
            <Text style={[styles.label, { color: onCardMuted }]}>{t("login.email")}</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              placeholder={t("login.emailPlaceholder")}
              placeholderTextColor={inputPlaceholder}
              style={[styles.input, { borderColor: inputBorder, color: inputText, backgroundColor: inputBg }]}
            />
          </View>
          <View>
            <Text style={[styles.label, { color: onCardMuted }]}>{t("login.password")}</Text>
            <View style={[styles.passwordWrap, { borderColor: inputBorder, backgroundColor: inputBg }]}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                textContentType="password"
                placeholder={t("login.passwordPlaceholder")}
                placeholderTextColor={inputPlaceholder}
                style={[styles.passwordInput, { color: inputText }]}
                onSubmitEditing={submit}
              />
              <Pressable onPress={() => setShowPassword((value) => !value)} hitSlop={10} style={styles.eyeButton}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={onCardMuted} />
              </Pressable>
            </View>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={[styles.errorText, { color: "#FFD2D8" }]}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={submit}
            disabled={submitting || authLoading}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: buttonBg, opacity: pressed || submitting || authLoading ? 0.72 : 1 },
            ]}
          >
            {submitting || authLoading ? (
              <ActivityIndicator color={buttonText} />
            ) : (
              <Text style={[styles.buttonText, { color: buttonText }]}>{t("login.submit")}</Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
  },
  topActions: {
    position: "absolute",
    right: 16,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  glowTop: {
    position: "absolute",
    top: -130,
    right: -110,
    width: 320,
    height: 320,
    borderRadius: 160,
  },
  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    gap: 12,
  },
  logoImage: {
    width: 86,
    height: 86,
    alignSelf: "center",
    marginBottom: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 12,
  },
  form: {
    gap: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
  },
  passwordWrap: {
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 14,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorBox: {
    borderRadius: 12,
    backgroundColor: "rgba(255,59,92,0.18)",
    borderColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    padding: 10,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 17,
  },
  button: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
