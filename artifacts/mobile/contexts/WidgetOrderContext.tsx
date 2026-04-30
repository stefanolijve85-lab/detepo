import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ScreenId = "home" | "insights" | "live";
type WidgetOrderMap = Record<ScreenId, string[]>;

const STORAGE_KEY = "detepo:widget_order_v2";

const DEFAULTS: WidgetOrderMap = {
  home: ["occupancy", "today", "last7", "last30", "chart"],
  insights: ["today_stat", "week_stat", "month_stat", "avg_stat", "live_stat", "peak_stat", "insight_chart", "insight_0", "insight_1", "insight_2", "insight_3", "insight_4"],
  live: ["live_count", "devices"],
};

interface WidgetOrderCtx {
  getOrder: (screen: ScreenId) => string[];
  setOrder: (screen: ScreenId, order: string[]) => void;
  resetOrder: (screen: ScreenId) => void;
}

const Ctx = createContext<WidgetOrderCtx>({
  getOrder: (s) => DEFAULTS[s],
  setOrder: () => {},
  resetOrder: () => {},
});

export function WidgetOrderProvider({ children }: { children: ReactNode }) {
  const [map, setMap] = useState<WidgetOrderMap>({ ...DEFAULTS });

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<WidgetOrderMap>;
          setMap((prev) => ({ ...prev, ...parsed }));
        }
      })
      .catch(() => {});
  }, []);

  const persist = useCallback((next: WidgetOrderMap) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const setOrder = useCallback(
    (screen: ScreenId, order: string[]) => {
      setMap((prev) => {
        const next = { ...prev, [screen]: order };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const resetOrder = useCallback(
    (screen: ScreenId) => {
      setMap((prev) => {
        const next = { ...prev, [screen]: DEFAULTS[screen] };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const getOrder = useCallback((screen: ScreenId) => map[screen] ?? DEFAULTS[screen], [map]);

  return <Ctx.Provider value={{ getOrder, setOrder, resetOrder }}>{children}</Ctx.Provider>;
}

export function useWidgetOrder(screen: ScreenId) {
  const { getOrder, setOrder, resetOrder } = useContext(Ctx);
  const order = getOrder(screen);

  const setFullOrder = useCallback(
    (newOrder: string[]) => setOrder(screen, newOrder),
    [screen, setOrder],
  );

  const reset = useCallback(() => resetOrder(screen), [screen, resetOrder]);

  return { order, setFullOrder, reset };
}
