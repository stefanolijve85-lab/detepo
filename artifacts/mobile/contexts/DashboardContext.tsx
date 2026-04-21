import React, { createContext, useContext } from "react";
import {
  useDashboardData,
  DashboardData,
  Alert,
} from "@/hooks/useDashboardData";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardContextType {
  data: DashboardData;
  alerts: Alert[];
  loading: boolean;
  connectionError: boolean;
  refresh: () => void;
  markAlertRead: (id: string) => void;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const { user, token, isAuthenticated } = useAuth();
  const value = useDashboardData(user, token, isAuthenticated);
  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}
