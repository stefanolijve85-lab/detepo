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
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!authLoading && isAuthenticated) {
    return <Redirect href="/" />;
  }

  const submit = async () => {
    if (!email.trim() || !password) {
      setError("Vul je e-mailadres en wachtwoord in.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await login(email, password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inloggen mislukt.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 20 }]}
    >
      <View style={styles.glowTop} />
      <View style={styles.card}>
        <Image source={detepoLogo} style={styles.logoImage} contentFit="contain" />
        <Text style={[styles.title, { color: colors.foreground }]}>Detepo Insights</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Log in met dezelfde gegevens als op het Detepo dashboard.
        </Text>

        <View style={styles.form}>
          <View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>E-mailadres</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              placeholder="naam@bedrijf.nl"
              placeholderTextColor={colors.textTertiary}
              style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.surface2 }]}
            />
          </View>
          <View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Wachtwoord</Text>
            <View style={[styles.passwordWrap, { borderColor: colors.border, backgroundColor: colors.surface2 }]}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                textContentType="password"
                placeholder="Dashboard wachtwoord"
                placeholderTextColor={colors.textTertiary}
                style={[styles.passwordInput, { color: colors.foreground }]}
                onSubmitEditing={submit}
              />
              <Pressable onPress={() => setShowPassword((value) => !value)} hitSlop={10} style={styles.eyeButton}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={[styles.errorText, { color: colors.red }]}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={submit}
            disabled={submitting || authLoading}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.blue, opacity: pressed || submitting || authLoading ? 0.72 : 1 },
            ]}
          >
            {submitting || authLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Inloggen</Text>
            )}
          </Pressable>
        </View>

        <Text style={[styles.footer, { color: colors.textTertiary }]}>
          Verbinding: https://dashboard.detepo.com:443
        </Text>
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
  glowTop: {
    position: "absolute",
    top: -130,
    right: -110,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(61,142,255,0.14)",
  },
  card: {
    backgroundColor: "rgba(17,30,53,0.94)",
    borderColor: "rgba(255,255,255,0.06)",
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
    backgroundColor: "rgba(255,59,92,0.08)",
    borderColor: "rgba(255,59,92,0.18)",
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
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  footer: {
    fontSize: 10,
    textAlign: "center",
    marginTop: 8,
  },
});