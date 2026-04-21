import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export const DETEPO_API_BASE = "https://dashboard.detepo.com/api";

export interface DetepoUser {
  id?: string | number;
  email?: string;
  name?: string;
  role?: string;
  org?: {
    id?: string | number;
    name?: string;
  };
}

interface AuthContextType {
  user: DetepoUser | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const STORAGE_KEY = "detepo_auth";
const AuthContext = createContext<AuthContextType | null>(null);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function extractToken(value: unknown): string | null {
  if (!isRecord(value)) return null;
  for (const key of ["token", "jwt", "accessToken", "access_token", "idToken", "id_token"]) {
    const found = value[key];
    if (typeof found === "string" && found.trim()) return found;
  }
  for (const nested of Object.values(value)) {
    const found = extractToken(nested);
    if (found) return found;
  }
  return null;
}

function extractUser(value: unknown): DetepoUser | null {
  if (!isRecord(value)) return null;
  if (isRecord(value.user)) return value.user as DetepoUser;
  if (isRecord(value.data) && isRecord(value.data.user)) return value.data.user as DetepoUser;
  if (isRecord(value.account)) return value.account as DetepoUser;
  if (typeof value.email === "string" || typeof value.id === "string" || typeof value.id === "number") {
    return value as DetepoUser;
  }
  return null;
}

function extractError(value: unknown): string | null {
  if (!isRecord(value)) return null;
  for (const key of ["error", "message"]) {
    const found = value[key];
    if (typeof found === "string" && found.trim()) return found;
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DetepoUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!mounted || !raw) return;
        const saved = JSON.parse(raw) as { user?: DetepoUser; token?: string | null };
        if (saved.user) {
          setUser(saved.user);
          setToken(saved.token ?? null);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch(`${DETEPO_API_BASE}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    const result = await response.json();
    const nextUser = extractUser(result);
    const nextToken = extractToken(result);
    if (!response.ok || !nextUser) {
      throw new Error(extractError(result) || "Inloggen mislukt. Controleer je Detepo dashboardgegevens.");
    }
    setUser(nextUser);
    setToken(nextToken);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ user: nextUser, token: nextToken }));
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
    await AsyncStorage.removeItem("detepo_user");
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(user),
      login,
      logout,
    }),
    [user, token, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}