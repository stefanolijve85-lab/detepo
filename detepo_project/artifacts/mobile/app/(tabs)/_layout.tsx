import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Redirect, Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "square.grid.2x2", selected: "square.grid.2x2.fill" }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="live">
        <Icon sf={{ default: "wifi", selected: "wifi" }} />
        <Label>Live</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="insights">
        <Icon sf={{ default: "chart.xyaxis.line", selected: "chart.xyaxis.line" }} />
        <Label>Inzichten</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="devices">
        <Icon sf={{ default: "sensor", selected: "sensor.fill" }} />
        <Label>Apparaten</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="alerts">
        <Icon sf={{ default: "bell", selected: "bell.fill" }} />
        <Label>Meldingen</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = true;
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.textTertiary,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background },
              ]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <Feather name="grid" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="live"
        options={{
          title: "Live",
          tabBarIcon: ({ color }) => <Feather name="wifi" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: "Inzichten",
          tabBarIcon: ({ color }) => <Feather name="activity" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="devices"
        options={{
          title: "Apparaten",
          tabBarIcon: ({ color }) => <Feather name="cpu" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: "Meldingen",
          tabBarIcon: ({ color }) => <Feather name="bell" size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Redirect href="/login" />;
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
