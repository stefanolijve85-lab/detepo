/**
 * WidgetGrid2D
 * ─────────────────────────────────────────────────────
 * Apple-style draggable widget grid.
 *
 * • Long-press any card → ALL cards jiggle (Apple iOS home screen style)
 * • Drag the held card freely — left/right AND up/down
 * • Other cards shift in real-time to preview new position
 * • Release → snap to new slot, jiggle stops
 * • Works on real devices (uses RNGH Pan.activateAfterLongPress)
 * • 2-column grid: span=2 → full width, span=1 → half width (paired)
 */
import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  createContext,
  useContext,
} from "react";
import {
  View,
  Animated,
  StyleSheet,
  Platform,
} from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";

export interface GridItem {
  id: string;
  span: 1 | 2;
  node: React.ReactNode;
}

interface Props {
  items: GridItem[];
  onReorder: (newIds: string[]) => void;
  gap?: number;
}

const ND = Platform.OS !== "web";

// ── Jiggle animation context ─────────────────────────────────────────────────
const JiggleCtx = createContext(false);

function JiggleCard({
  children,
  jiggling,
}: {
  children: React.ReactNode;
  jiggling: boolean;
}) {
  const rot = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (jiggling) {
      animRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(rot, { toValue: 2.5, duration: 80, useNativeDriver: ND }),
          Animated.timing(rot, { toValue: -2.5, duration: 80, useNativeDriver: ND }),
          Animated.timing(rot, { toValue: 0, duration: 80, useNativeDriver: ND }),
        ]),
      );
      animRef.current.start();
    } else {
      animRef.current?.stop();
      Animated.spring(rot, { toValue: 0, useNativeDriver: ND }).start();
    }
    return () => { animRef.current?.stop(); };
  }, [jiggling, rot]);

  return (
    <Animated.View
      style={{
        transform: [
          {
            rotate: rot.interpolate({
              inputRange: [-2.5, 2.5],
              outputRange: ["-2.5deg", "2.5deg"],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

// ── Grid layout helpers ──────────────────────────────────────────────────────
/**
 * Build rows from a flat array.
 *   span=2 → own row (full width)
 *   span=1 + span=1 → shared row
 *   lone span=1 → own row (half width, left-aligned)
 */
function buildRows(items: GridItem[]): GridItem[][] {
  const rows: GridItem[][] = [];
  let i = 0;
  while (i < items.length) {
    const item = items[i];
    if (item.span === 2) {
      rows.push([item]);
      i++;
    } else if (i + 1 < items.length && items[i + 1].span === 1) {
      rows.push([items[i], items[i + 1]]);
      i += 2;
    } else {
      rows.push([items[i]]);
      i++;
    }
  }
  return rows;
}

function insertAt(arr: GridItem[], item: GridItem, idx: number): GridItem[] {
  const next = [...arr];
  next.splice(Math.max(0, Math.min(idx, arr.length)), 0, item);
  return next;
}

// ── Absolute cell layout ─────────────────────────────────────────────────────
interface CellLayout { x: number; y: number; w: number; h: number }

// ── Main grid ────────────────────────────────────────────────────────────────
export function WidgetGrid2D({ items, onReorder, gap = 8 }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [jiggling, setJiggling] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const ghostX = useRef(new Animated.Value(0)).current;
  const ghostY = useRef(new Animated.Value(0)).current;
  const ghostScale = useRef(new Animated.Value(1)).current;
  const ghostOpacity = useRef(new Animated.Value(0)).current;

  // Absolute screen positions of each cell (from measureInWindow)
  const cellLayouts = useRef<Map<string, CellLayout>>(new Map());
  const containerRef = useRef<View>(null);
  const containerAbs = useRef({ x: 0, y: 0 });
  const touchOffset = useRef({ x: 0, y: 0 });

  const dragIdRef = useRef<string | null>(null);
  const hoverIdxRef = useRef<number | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const measureContainer = useCallback(() => {
    containerRef.current?.measureInWindow((x, y) => {
      containerAbs.current = { x, y };
    });
  }, []);

  /**
   * Find the best flat-array index to insert the dragged card.
   * Uses absolute screen coordinates stored in cellLayouts.
   */
  const computeHoverIdx = useCallback(
    (absGhostCX: number, absGhostCY: number, dragging: string): number => {
      const current = itemsRef.current;
      let bestIdx = 0;
      let bestDist = Infinity;

      current.forEach((item, idx) => {
        if (item.id === dragging) return;
        const lay = cellLayouts.current.get(item.id);
        if (!lay) return;
        const cx = lay.x + lay.w / 2;
        const cy = lay.y + lay.h / 2;
        const dist = Math.hypot(absGhostCX - cx, absGhostCY - cy);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = idx;
        }
      });

      const bestItem = current[bestIdx];
      const lay = bestItem ? cellLayouts.current.get(bestItem.id) : null;
      if (!lay) return bestIdx;

      const cx = lay.x + lay.w / 2;
      const cy = lay.y + lay.h / 2;
      const sameRow = Math.abs(absGhostCY - cy) < lay.h * 0.6;
      if (sameRow) {
        return absGhostCX < cx ? bestIdx : bestIdx + 1;
      }
      return absGhostCY < cy ? bestIdx : bestIdx + 1;
    },
    [],
  );

  const beginDrag = useCallback(
    (id: string, absX: number, absY: number) => {
      measureContainer();
      const lay = cellLayouts.current.get(id);
      if (!lay) return;

      dragIdRef.current = id;
      // Ghost starts at cell position relative to container
      const relX = lay.x - containerAbs.current.x;
      const relY = lay.y - containerAbs.current.y;
      touchOffset.current = { x: absX - lay.x, y: absY - lay.y };
      ghostX.setValue(relX);
      ghostY.setValue(relY);

      const origIdx = itemsRef.current.findIndex((it) => it.id === id);
      hoverIdxRef.current = origIdx;

      setDragId(id);
      setJiggling(true);
      setHoverIdx(origIdx);

      Animated.parallel([
        Animated.spring(ghostScale, { toValue: 1.08, useNativeDriver: ND }),
        Animated.timing(ghostOpacity, { toValue: 1, duration: 80, useNativeDriver: ND }),
      ]).start();
    },
    [ghostOpacity, ghostScale, ghostX, ghostY, measureContainer],
  );

  const moveDrag = useCallback(
    (absX: number, absY: number) => {
      const id = dragIdRef.current;
      if (!id) return;
      const lay = cellLayouts.current.get(id);

      // Ghost position relative to container
      const relX = absX - containerAbs.current.x - touchOffset.current.x;
      const relY = absY - containerAbs.current.y - touchOffset.current.y;
      ghostX.setValue(relX);
      ghostY.setValue(relY);

      // Absolute center of ghost for hit-testing
      const absCX = absX - touchOffset.current.x + (lay?.w ?? 80) / 2;
      const absCY = absY - touchOffset.current.y + (lay?.h ?? 60) / 2;
      const hi = computeHoverIdx(absCX, absCY, id);
      hoverIdxRef.current = hi;
      setHoverIdx(hi);
    },
    [ghostX, ghostY, computeHoverIdx],
  );

  const endDrag = useCallback(() => {
    const id = dragIdRef.current;
    const hi = hoverIdxRef.current;
    if (!id) return;
    dragIdRef.current = null;
    hoverIdxRef.current = null;

    Animated.parallel([
      Animated.spring(ghostScale, { toValue: 1, useNativeDriver: ND }),
      Animated.timing(ghostOpacity, { toValue: 0, duration: 80, useNativeDriver: ND }),
    ]).start(() => {
      setDragId(null);
      setJiggling(false);
      setHoverIdx(null);
    });

    if (id && hi !== null) {
      const current = itemsRef.current;
      const fromIdx = current.findIndex((it) => it.id === id);
      if (fromIdx === -1) return;
      const dragged = current[fromIdx];
      const without = current.filter((it) => it.id !== id);
      const adjHi = hi > fromIdx ? hi - 1 : hi;
      const next = insertAt(without, dragged, adjHi);
      const newIds = next.map((it) => it.id);
      if (JSON.stringify(newIds) !== JSON.stringify(current.map((it) => it.id))) {
        onReorder(newIds);
      }
    }
  }, [ghostOpacity, ghostScale, onReorder]);

  // Derive display order (preview while dragging)
  let displayItems = items.slice();
  if (dragId !== null && hoverIdx !== null) {
    const fromIdx = displayItems.findIndex((it) => it.id === dragId);
    if (fromIdx !== -1) {
      const dragged = displayItems[fromIdx];
      const without = displayItems.filter((it) => it.id !== dragId);
      const adjHi = hoverIdx > fromIdx ? hoverIdx - 1 : hoverIdx;
      displayItems = insertAt(without, dragged, adjHi);
    }
  }

  const rows = buildRows(displayItems);
  const draggedItem = dragId ? items.find((it) => it.id === dragId) : null;
  const draggedLayout = dragId ? cellLayouts.current.get(dragId) : null;

  return (
    <View ref={containerRef} style={styles.container} onLayout={measureContainer}>
      {rows.map((row, rowIdx) => (
        <View key={rowIdx} style={[styles.row, { gap, marginBottom: gap }]}>
          {row.map((item) => (
            <GridCell
              key={item.id}
              item={item}
              isDragging={item.id === dragId}
              jiggling={jiggling && item.id !== dragId}
              onMeasure={(x, y, w, h) => cellLayouts.current.set(item.id, { x, y, w, h })}
              onDragStart={beginDrag}
              onDragMove={moveDrag}
              onDragEnd={endDrag}
            />
          ))}
        </View>
      ))}

      {/* Floating ghost follows finger */}
      {draggedItem && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ghost,
            {
              width: draggedLayout?.w,
              height: draggedLayout?.h,
              left: ghostX,
              top: ghostY,
              opacity: ghostOpacity,
              transform: [{ scale: ghostScale }],
            },
          ]}
        >
          {draggedItem.node}
        </Animated.View>
      )}
    </View>
  );
}

// ── Grid cell ────────────────────────────────────────────────────────────────
interface GridCellProps {
  item: GridItem;
  isDragging: boolean;
  jiggling: boolean;
  onMeasure: (x: number, y: number, w: number, h: number) => void;
  onDragStart: (id: string, absX: number, absY: number) => void;
  onDragMove: (absX: number, absY: number) => void;
  onDragEnd: () => void;
}

function GridCell({
  item,
  isDragging,
  jiggling,
  onMeasure,
  onDragStart,
  onDragMove,
  onDragEnd,
}: GridCellProps) {
  const ref = useRef<View>(null);

  const measureSelf = useCallback(() => {
    // Use measureInWindow for accurate absolute coordinates
    ref.current?.measureInWindow((x, y, w, h) => {
      if (w > 0 && h > 0) onMeasure(x, y, w, h);
    });
  }, [onMeasure]);

  const gesture = Gesture.Pan()
    .activateAfterLongPress(500)
    .runOnJS(true)
    .onStart((e) => {
      // Re-measure right before drag for freshest coords
      ref.current?.measureInWindow((x, y, w, h) => {
        if (w > 0 && h > 0) onMeasure(x, y, w, h);
        onDragStart(item.id, e.absoluteX, e.absoluteY);
      });
    })
    .onUpdate((e) => {
      onDragMove(e.absoluteX, e.absoluteY);
    })
    .onEnd(() => { onDragEnd(); })
    .onFinalize(() => { onDragEnd(); });

  return (
    <GestureDetector gesture={gesture}>
      <View
        ref={ref}
        style={[
          styles.cell,
          item.span === 2 ? styles.cellFull : styles.cellHalf,
          isDragging && styles.cellHidden,
        ]}
        onLayout={measureSelf}
      >
        <JiggleCard jiggling={jiggling}>
          {!isDragging && item.node}
        </JiggleCard>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: { position: "relative" },
  row: { flexDirection: "row" },
  cell: { minHeight: 60 },
  cellFull: { flex: 1 },
  cellHalf: { flex: 1 },
  cellHidden: { opacity: 0 },
  ghost: {
    position: "absolute",
    zIndex: 999,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 20,
  },
});
