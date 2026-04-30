import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { GridLayout } from "@/components/WidgetGrid2D";

type FlatScreenId = "home" | "live";
const FLAT_KEY = "detepo:widget_order_v3";
const GRID_KEY = "detepo:widget_grid_v1";

// ── Flat order defaults (home uses DraggableWidgetList) ───────────────────────
const FLAT_DEFAULTS: Record<FlatScreenId, string[]> = {
  home: ["occupancy", "today", "periods", "chart"],
  live: [],
};

// ── Grid layout defaults (insights uses WidgetGrid2D) ────────────────────────
const GRID_DEFAULTS: GridLayout = [
  ["today_stat", "week_stat"],
  ["month_stat", "avg_stat"],
  ["live_stat",  "peak_stat"],
  ["insight_chart"],
  ["insight_0"],
  ["insight_1"],
  ["insight_2"],
  ["insight_3"],
  ["insight_4"],
];

interface WidgetOrderCtx {
  getFlatOrder:    (screen: FlatScreenId) => string[];
  setFlatOrder:    (screen: FlatScreenId, order: string[]) => void;
  getInsightGrid:  () => GridLayout;
  setInsightGrid:  (layout: GridLayout) => void;
}

const Ctx = createContext<WidgetOrderCtx>({
  getFlatOrder:   (s) => FLAT_DEFAULTS[s],
  setFlatOrder:   () => {},
  getInsightGrid: () => GRID_DEFAULTS,
  setInsightGrid: () => {},
});

export function WidgetOrderProvider({ children }: { children: ReactNode }) {
  const [flatMap,   setFlatMap]   = useState<Record<FlatScreenId, string[]>>({ ...FLAT_DEFAULTS });
  const [gridLayout, setGridLayout] = useState<GridLayout>(GRID_DEFAULTS);

  useEffect(() => {
    AsyncStorage.multiGet([FLAT_KEY, GRID_KEY]).then(([[, flatRaw], [, gridRaw]]) => {
      if (flatRaw) {
        try { setFlatMap((p) => ({ ...p, ...JSON.parse(flatRaw) })); } catch { /* ignore */ }
      }
      if (gridRaw) {
        try { setGridLayout(JSON.parse(gridRaw)); } catch { /* ignore */ }
      }
    });
  }, []);

  const setFlatOrder = useCallback((screen: FlatScreenId, order: string[]) => {
    setFlatMap((prev) => {
      const next = { ...prev, [screen]: order };
      AsyncStorage.setItem(FLAT_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const setInsightGrid = useCallback((layout: GridLayout) => {
    setGridLayout(layout);
    AsyncStorage.setItem(GRID_KEY, JSON.stringify(layout)).catch(() => {});
  }, []);

  return (
    <Ctx.Provider
      value={{
        getFlatOrder:   (s) => flatMap[s] ?? FLAT_DEFAULTS[s],
        setFlatOrder,
        getInsightGrid: () => gridLayout,
        setInsightGrid,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

// ── Hook for home/live (DraggableWidgetList) ──────────────────────────────────
export function useWidgetOrder(screen: FlatScreenId) {
  const { getFlatOrder, setFlatOrder } = useContext(Ctx);
  const order = getFlatOrder(screen);

  const setFullOrder = useCallback(
    (newOrder: string[]) => setFlatOrder(screen, newOrder),
    [screen, setFlatOrder],
  );

  return { order, setFullOrder };
}

// ── Hook for insights (WidgetGrid2D) ──────────────────────────────────────────
export function useInsightGrid() {
  const { getInsightGrid, setInsightGrid } = useContext(Ctx);
  return { layout: getInsightGrid(), setLayout: setInsightGrid };
}
