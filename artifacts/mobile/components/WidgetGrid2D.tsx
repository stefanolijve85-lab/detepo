/**
 * WidgetGrid2D — Apple-style widget grid
 *
 * Behaviour matches iOS home screen:
 *  - Hold any card ~0.5s → gentle jiggle starts on ALL cards
 *  - Drag freely (left/right AND up/down)
 *  - Other cards slide smoothly to preview the new position (LayoutAnimation)
 *  - Release → spring-snap to correct slot, jiggle stops
 *
 * Grid rules:
 *  span=2 → full width (own row)
 *  span=1 + span=1 → side by side (paired row)
 *  lone span=1 → own row, half width
 *
 * Coord bug fix: cellLayouts are SNAPSHOTTED at drag-start and that
 * snapshot is used for hit-testing throughout. Layout-updates during
 * drag (caused by live preview reordering) are ignored.
 */

import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
} from "react";
import {
  View,
  Animated,
  StyleSheet,
  Platform,
  LayoutAnimation,
  UIManager,
} from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

// ── Jiggle card ──────────────────────────────────────────────────────────────
// Very subtle rotation (±1.5°) matching iOS exactly.
function JiggleCard({
  children,
  active,
}: {
  children: React.ReactNode;
  active: boolean;
}) {
  const rot = useRef(new Animated.Value(0)).current;
  const loop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (active) {
      loop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(rot, { toValue: 1.5, duration: 90, useNativeDriver: ND }),
          Animated.timing(rot, { toValue: -1.5, duration: 90, useNativeDriver: ND }),
          Animated.timing(rot, { toValue: 0, duration: 90, useNativeDriver: ND }),
        ]),
      );
      loop.current.start();
    } else {
      loop.current?.stop();
      Animated.spring(rot, { toValue: 0, useNativeDriver: ND, overshootClamping: true }).start();
    }
    return () => { loop.current?.stop(); };
  }, [active, rot]);

  const rotStr = rot.interpolate({
    inputRange: [-1.5, 1.5],
    outputRange: ["-1.5deg", "1.5deg"],
  });

  return (
    <Animated.View style={{ transform: [{ rotate: rotStr }] }}>
      {children}
    </Animated.View>
  );
}

// ── Grid layout helpers ───────────────────────────────────────────────────────
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

function reorder(items: GridItem[], dragId: string, rawHoverIdx: number): GridItem[] {
  const fromIdx = items.findIndex((it) => it.id === dragId);
  if (fromIdx === -1) return items;
  const dragged = items[fromIdx];
  const without = items.filter((it) => it.id !== dragId);
  const adjHi = Math.max(0, Math.min(rawHoverIdx > fromIdx ? rawHoverIdx - 1 : rawHoverIdx, without.length));
  const next = [...without];
  next.splice(adjHi, 0, dragged);
  return next;
}

// ── Cell layout type ──────────────────────────────────────────────────────────
interface CellLayout { x: number; y: number; w: number; h: number }

// ── Main grid ─────────────────────────────────────────────────────────────────
export function WidgetGrid2D({ items, onReorder, gap = 8 }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);      // all cards jiggle
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // Ghost animation
  const ghostX = useRef(new Animated.Value(0)).current;
  const ghostY = useRef(new Animated.Value(0)).current;
  const ghostScale = useRef(new Animated.Value(1)).current;
  const ghostOpacity = useRef(new Animated.Value(0)).current;

  // Absolute positions of cells — only updated when NOT dragging
  const cellLayouts = useRef<Map<string, CellLayout>>(new Map());
  // Snapshot taken at drag-start (used for hit-testing during drag)
  const layoutSnap = useRef<Map<string, CellLayout>>(new Map());

  const containerRef = useRef<View>(null);
  const containerAbs = useRef({ x: 0, y: 0 });
  const touchOffset = useRef({ x: 0, y: 0 });

  // Refs to avoid stale closures in gesture callbacks
  const dragIdRef = useRef<string | null>(null);
  const hoverIdxRef = useRef<number | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const isDraggingRef = useRef(false);

  const measureContainer = useCallback(() => {
    containerRef.current?.measureInWindow((x, y) => {
      containerAbs.current = { x, y };
    });
  }, []);

  // ── Hover index calculation (uses snapshot, not live layouts) ──────────────
  const computeHoverIdx = useCallback(
    (absGhostCX: number, absGhostCY: number, dragging: string): number => {
      const current = itemsRef.current;
      const snap = layoutSnap.current;

      let bestIdx = 0;
      let bestDist = Infinity;

      current.forEach((item, idx) => {
        if (item.id === dragging) return;
        const lay = snap.get(item.id);
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
      const lay = bestItem ? snap.get(bestItem.id) : null;
      if (!lay) return bestIdx;

      const cx = lay.x + lay.w / 2;
      const cy = lay.y + lay.h / 2;
      const sameRow = Math.abs(absGhostCY - cy) < lay.h * 0.6;
      return sameRow
        ? (absGhostCX < cx ? bestIdx : bestIdx + 1)
        : (absGhostCY < cy ? bestIdx : bestIdx + 1);
    },
    [],
  );

  // ── Drag lifecycle ────────────────────────────────────────────────────────
  const beginDrag = useCallback(
    (id: string, absX: number, absY: number) => {
      isDraggingRef.current = true;
      measureContainer();

      // Snapshot current layouts so they don't drift during drag
      layoutSnap.current = new Map(cellLayouts.current);

      const lay = layoutSnap.current.get(id);
      if (!lay) return;

      dragIdRef.current = id;
      const relX = lay.x - containerAbs.current.x;
      const relY = lay.y - containerAbs.current.y;
      touchOffset.current = { x: absX - lay.x, y: absY - lay.y };

      ghostX.setValue(relX);
      ghostY.setValue(relY);

      const origIdx = itemsRef.current.findIndex((it) => it.id === id);
      hoverIdxRef.current = origIdx;

      setDragId(id);
      setEditing(true);
      setHoverIdx(origIdx);

      Animated.parallel([
        Animated.spring(ghostScale, { toValue: 1.06, useNativeDriver: ND }),
        Animated.timing(ghostOpacity, { toValue: 1, duration: 80, useNativeDriver: ND }),
      ]).start();
    },
    [ghostOpacity, ghostScale, ghostX, ghostY, measureContainer],
  );

  const moveDrag = useCallback(
    (absX: number, absY: number) => {
      const id = dragIdRef.current;
      if (!id) return;
      const lay = layoutSnap.current.get(id);

      const relX = absX - containerAbs.current.x - touchOffset.current.x;
      const relY = absY - containerAbs.current.y - touchOffset.current.y;
      ghostX.setValue(relX);
      ghostY.setValue(relY);

      const absCX = absX - touchOffset.current.x + (lay?.w ?? 80) / 2;
      const absCY = absY - touchOffset.current.y + (lay?.h ?? 60) / 2;
      const hi = computeHoverIdx(absCX, absCY, id);

      if (hi !== hoverIdxRef.current) {
        hoverIdxRef.current = hi;
        // Animate card rearrangement (LayoutAnimation makes other cards slide)
        LayoutAnimation.configureNext({
          duration: 220,
          update: { type: "spring", springDamping: 0.85 },
        });
        setHoverIdx(hi);
      }
    },
    [ghostX, ghostY, computeHoverIdx],
  );

  const endDrag = useCallback(() => {
    const id = dragIdRef.current;
    const hi = hoverIdxRef.current;
    if (!id) return;

    dragIdRef.current = null;
    hoverIdxRef.current = null;
    isDraggingRef.current = false;

    Animated.parallel([
      Animated.spring(ghostScale, { toValue: 1, useNativeDriver: ND, overshootClamping: true }),
      Animated.timing(ghostOpacity, { toValue: 0, duration: 100, useNativeDriver: ND }),
    ]).start(() => {
      setDragId(null);
      setEditing(false);
      setHoverIdx(null);
    });

    if (id && hi !== null) {
      const current = itemsRef.current;
      const next = reorder(current, id, hi);
      const newIds = next.map((it) => it.id);
      const oldIds = current.map((it) => it.id);
      if (JSON.stringify(newIds) !== JSON.stringify(oldIds)) {
        LayoutAnimation.configureNext({
          duration: 260,
          update: { type: "spring", springDamping: 0.8 },
        });
        onReorder(newIds);
      }
    }
  }, [ghostOpacity, ghostScale, onReorder]);

  // ── Build display order (live preview during drag) ────────────────────────
  const displayItems = dragId !== null && hoverIdx !== null
    ? reorder(items, dragId, hoverIdx)
    : items;

  const rows = buildRows(displayItems);
  const draggedItem = dragId ? items.find((it) => it.id === dragId) : null;
  const draggedLayout = dragId ? layoutSnap.current.get(dragId) : null;

  return (
    <View ref={containerRef} style={styles.container} onLayout={measureContainer}>
      {rows.map((row, rowIdx) => (
        <View key={rowIdx} style={[styles.row, { gap, marginBottom: gap }]}>
          {row.map((item) => (
            <GridCell
              key={item.id}
              item={item}
              isDragging={item.id === dragId}
              jiggling={editing && item.id !== dragId}
              isDraggingRef={isDraggingRef}
              onMeasure={(lay) => {
                cellLayouts.current.set(item.id, lay);
              }}
              onDragStart={(absX, absY) => {
                // Re-measure right before drag to get freshest coords
                beginDrag(item.id, absX, absY);
              }}
              onDragMove={moveDrag}
              onDragEnd={endDrag}
            />
          ))}
        </View>
      ))}

      {/* Floating ghost card */}
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

// ── Grid cell ──────────────────────────────────────────────────────────────
interface GridCellProps {
  item: GridItem;
  isDragging: boolean;
  jiggling: boolean;
  isDraggingRef: React.RefObject<boolean>;
  onMeasure: (lay: CellLayout) => void;
  onDragStart: (absX: number, absY: number) => void;
  onDragMove: (absX: number, absY: number) => void;
  onDragEnd: () => void;
}

function GridCell({
  item,
  isDragging,
  jiggling,
  isDraggingRef,
  onMeasure,
  onDragStart,
  onDragMove,
  onDragEnd,
}: GridCellProps) {
  const ref = useRef<View>(null);

  const doMeasure = useCallback(() => {
    // Only update live layouts when NOT in the middle of a drag
    if (!isDraggingRef.current) {
      ref.current?.measureInWindow((x, y, w, h) => {
        if (w > 0 && h > 0) onMeasure({ x, y, w, h });
      });
    }
  }, [isDraggingRef, onMeasure]);

  const gesture = Gesture.Pan()
    .activateAfterLongPress(500)
    .runOnJS(true)
    .onStart((e) => {
      // Snapshot this cell right now before drag mutates the layout
      ref.current?.measureInWindow((x, y, w, h) => {
        if (w > 0 && h > 0) onMeasure({ x, y, w, h });
        onDragStart(e.absoluteX, e.absoluteY);
      });
    })
    .onUpdate((e) => { onDragMove(e.absoluteX, e.absoluteY); })
    .onEnd(() => { onDragEnd(); })
    .onFinalize(() => { onDragEnd(); });

  return (
    <GestureDetector gesture={gesture}>
      <View
        ref={ref}
        style={[
          styles.cell,
          item.span === 1 ? styles.cellHalf : styles.cellFull,
          isDragging && styles.cellHidden,
        ]}
        onLayout={doMeasure}
      >
        <JiggleCard active={jiggling}>
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
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 16,
  },
});
