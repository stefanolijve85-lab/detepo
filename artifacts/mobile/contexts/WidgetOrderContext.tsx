import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ScreenId = "home" | "insights" | "live";

type WidgetOrderMap = Record<ScreenId, string[]>;

const STORAGE_KEY = "detepo:widget_order";

// Default widget orderings per screen
const DEFAULTS: WidgetOrderMap = {
  home: ["occupancy", "today", "periods", "chart"],
  insights: ["summary", "devices", "peakhour"],
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

  const move = useCallback(
    (id: string, direction: "up" | "down") => {
      const idx = order.indexOf(id);
      if (idx === -1) return;
      const next = [...order];
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= next.length) return;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      setOrder(screen, next);
    },
    [order, screen, setOrder],
  );

  const setFullOrder = useCallback(
    (newOrder: string[]) => setOrder(screen, newOrder),
    [screen, setOrder],
  );

  const reset = useCallback(() => resetOrder(screen), [screen, resetOrder]);

  return { order, move, setFullOrder, reset };
}
