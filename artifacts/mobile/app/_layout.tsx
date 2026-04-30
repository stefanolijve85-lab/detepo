import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, Redirect } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { DashboardProvider } from "@/contexts/DashboardContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// 🔥 FORCE START → BLE SCREEN
function StartRedirect() {
  return <Redirect href="/bluetooth-scan" />;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* 👇 force entry point */}
      <Stack.Screen name="index" options={{ headerShown: false }} />

      {/* 👇 jouw BLE scherm */}
      <Stack.Screen name="bluetooth-scan" options={{ headerShown: false }} />

      {/* overige */}
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="alignment-check" options={{ presentation: "modal" }} />
      <Stack.Screen name="notification-settings" options={{ presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <LanguageProvider>
              <AuthProvider>
                <NotificationsProvider>
                  <DashboardProvider>
                    <GestureHandlerRootView style={{ flex: 1 }}>
                      <KeyboardProvider>
                        <RootLayoutNav />
                      </KeyboardProvider>
                    </GestureHandlerRootView>
                  </DashboardProvider>
                </NotificationsProvider>
              </AuthProvider>
            </LanguageProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}