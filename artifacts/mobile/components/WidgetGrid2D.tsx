/**
 * WidgetGrid2D — Apple-style 2-column draggable grid
 *
 * Layout model: rows (each row = 1 or 2 item IDs)
 *   row with 1 item  → item renders FULL width
 *   row with 2 items → each item renders HALF width
 *
 * Drag behaviour:
 *  • Hold any card 500ms → ALL cards start jiggling (iOS home screen style)
 *  • Ghost card appears under your finger
 *  • Drag over a SOLO ZONE (between rows or between a row and the edge)
 *    → card drops as a full-width row
 *  • Drag over a PAIR ZONE (left or right of a lone card)
 *    → card pairs with that card (both become half-width)
 *  • Cards that lose their partner become full-width automatically
 *  • LayoutAnimation makes every transition smooth (iOS spring feel)
 *
 * No measureInWindow drift bugs: only the container is measured (once at
 * drag-start); ghost position and hit-testing use pure math from row heights
 * tracked via onLayout on each row View.
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

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Public types ─────────────────────────────────────────────────────────────
export type GridRow = string[];           // 1 or 2 item IDs per row
export type GridLayout = GridRow[];

export interface GridItem {
  id: string;
  node: React.ReactNode;
}

interface Props {
  items: GridItem[];                       // all available items
  layout: GridLayout;                      // current arrangement as rows
  onLayoutChange: (next: GridLayout) => void;
  gap?: number;
  onEditModeChange?: (editing: boolean) => void;  // lets parent disable ScrollView scroll
}

const ND = Platform.OS !== "web";

// ── Jiggle ───────────────────────────────────────────────────────────────────
function JiggleCard({ children, active }: { children: React.ReactNode; active: boolean }) {
  const rot = useRef(new Animated.Value(0)).current;
  const loop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (active) {
      loop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(rot, { toValue: 1.4, duration: 85, useNativeDriver: ND }),
          Animated.timing(rot, { toValue: -1.4, duration: 85, useNativeDriver: ND }),
          Animated.timing(rot, { toValue: 0, duration: 85, useNativeDriver: ND }),
        ]),
      );
      loop.current.start();
    } else {
      loop.current?.stop();
      Animated.spring(rot, { toValue: 0, useNativeDriver: ND, overshootClamping: true }).start();
    }
    return () => { loop.current?.stop(); };
  }, [active, rot]);

  return (
    <Animated.View
      style={{ transform: [{ rotate: rot.interpolate({ inputRange: [-1.4, 1.4], outputRange: ["-1.4deg", "1.4deg"] }) }] }}
    >
      {children}
    </Animated.View>
  );
}

// ── Layout helpers ────────────────────────────────────────────────────────────
function removeFromLayout(layout: GridLayout, id: string): GridLayout {
  return layout
    .map((row) => row.filter((rid) => rid !== id))
    .filter((row) => row.length > 0);
}

type DropTarget =
  | { kind: "solo"; beforeRow: number; cx: number; cy: number }
  | { kind: "pairLeft"; rowIdx: number; cx: number; cy: number }
  | { kind: "pairRight"; rowIdx: number; cx: number; cy: number };

function computeTargets(
  rows: GridLayout,
  containerW: number,
  rowHeights: Map<number, number>,
  gap: number,
): DropTarget[] {
  const targets: DropTarget[] = [];
  const colW = (containerW - gap) / 2;
  let y = 0;

  // SOLO slot above everything
  targets.push({ kind: "solo", beforeRow: 0, cx: containerW / 2, cy: -gap });

  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri];
    const h = rowHeights.get(ri) ?? 80;
    const midY = y + h / 2;

    if (row.length === 1) {
      // Can pair on the left or right of this lone item
      targets.push({ kind: "pairLeft",  rowIdx: ri, cx: colW / 2,              cy: midY });
      targets.push({ kind: "pairRight", rowIdx: ri, cx: colW + gap + colW / 2, cy: midY });
    }
    // For paired rows: only the between-rows solo slots are offered

    y += h + gap;
    // SOLO slot after each row
    targets.push({ kind: "solo", beforeRow: ri + 1, cx: containerW / 2, cy: y - gap / 2 });
  }

  return targets;
}

function applyTarget(rows: GridLayout, dragId: string, target: DropTarget): GridLayout {
  const result = rows.map((r) => [...r]);

  if (target.kind === "solo") {
    result.splice(target.beforeRow, 0, [dragId]);
  } else if (target.kind === "pairLeft") {
    const existing = result[target.rowIdx][0];
    result[target.rowIdx] = [dragId, existing];
  } else {
    const existing = result[target.rowIdx][0];
    result[target.rowIdx] = [existing, dragId];
  }

  return result;
}

function layoutsEqual(a: GridLayout, b: GridLayout): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

const SPRING_CONFIG = {
  duration: 240,
  update: { type: "spring" as const, springDamping: 0.82 },
};

// ── Main grid ─────────────────────────────────────────────────────────────────
export function WidgetGrid2D({
  items,
  layout,
  onLayoutChange,
  gap = 8,
  onEditModeChange,
}: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [previewLayout, setPreviewLayout] = useState<GridLayout | null>(null);

  const ghostX     = useRef(new Animated.Value(0)).current;
  const ghostY     = useRef(new Animated.Value(0)).current;
  const ghostW     = useRef(new Animated.Value(100)).current;
  const ghostScale = useRef(new Animated.Value(1)).current;
  const ghostOp    = useRef(new Animated.Value(0)).current;

  // Dimensions tracked via onLayout (no measureInWindow drift)
  const containerRef   = useRef<View>(null);
  const containerW     = useRef(0);
  const containerAbsX  = useRef(0);
  const containerAbsY  = useRef(0);
  const rowHeights     = useRef<Map<number, number>>(new Map());

  const touchOffsetX   = useRef(0);
  const touchOffsetY   = useRef(0);
  const ghostNativeW   = useRef(100);
  const ghostNativeH   = useRef(80);

  // Snapshot of layout at drag-start (for building targets during move)
  const rowsWithoutRef = useRef<GridLayout>([]);

  const dragIdRef      = useRef<string | null>(null);
  const bestTargetRef  = useRef<DropTarget | null>(null);
  const layoutRef      = useRef(layout);
  layoutRef.current    = layout;

  // ── Start drag ───────────────────────────────────────────────────────────
  const beginDrag = useCallback(
    (id: string, absX: number, absY: number) => {
      dragIdRef.current = id;

      // Container absolute position (one-time measurement at drag start)
      containerRef.current?.measureInWindow((cx, cy) => {
        containerAbsX.current = cx;
        containerAbsY.current = cy;
      });

      const currentLayout = layoutRef.current;
      const without = removeFromLayout(currentLayout, id);
      rowsWithoutRef.current = without;

      // Compute initial ghost size from current layout
      const w = containerW.current;
      const g = gap;
      let ghostW_ = w;
      let ghostH_ = 80;
      let ghostRelX = 0;
      let ghostRelY = 0;
      let accY = 0;

      for (let ri = 0; ri < currentLayout.length; ri++) {
        const row = currentLayout[ri];
        const h = rowHeights.current.get(ri) ?? 80;
        if (row.includes(id)) {
          const ci = row.indexOf(id);
          ghostW_ = row.length === 1 ? w : (w - g) / 2;
          ghostH_ = h;
          ghostRelX = ci === 0 ? 0 : (w - g) / 2 + g;
          ghostRelY = accY;
          break;
        }
        accY += h + g;
      }

      touchOffsetX.current = absX - containerAbsX.current - ghostRelX;
      touchOffsetY.current = absY - containerAbsY.current - ghostRelY;
      ghostNativeW.current = ghostW_;
      ghostNativeH.current = ghostH_;

      ghostX.setValue(ghostRelX);
      ghostY.setValue(ghostRelY);
      ghostW.setValue(ghostW_);
      bestTargetRef.current = null;

      setDragId(id);
      setEditing(true);
      setPreviewLayout(null);
      onEditModeChange?.(true);

      Animated.parallel([
        Animated.spring(ghostScale, { toValue: 1.06, useNativeDriver: ND }),
        Animated.timing(ghostOp,    { toValue: 1, duration: 75, useNativeDriver: ND }),
      ]).start();
    },
    [gap, ghostOp, ghostScale, ghostW, ghostX, ghostY, onEditModeChange],
  );

  // ── Move drag ────────────────────────────────────────────────────────────
  const moveDrag = useCallback(
    (absX: number, absY: number) => {
      const id = dragIdRef.current;
      if (!id) return;

      const relX = absX - containerAbsX.current - touchOffsetX.current;
      const relY = absY - containerAbsY.current - touchOffsetY.current;
      ghostX.setValue(relX);
      ghostY.setValue(relY);

      const gcx = relX + ghostNativeW.current / 2;
      const gcy = relY + ghostNativeH.current / 2;

      const targets = computeTargets(rowsWithoutRef.current, containerW.current, rowHeights.current, gap);
      const best = targets.reduce<{ t: DropTarget; d: number }>(
        (acc, t) => {
          const d = Math.hypot(gcx - t.cx, gcy - t.cy);
          return d < acc.d ? { t, d } : acc;
        },
        { t: targets[0], d: Infinity },
      );

      const newTarget = best.t;
      if (JSON.stringify(newTarget) !== JSON.stringify(bestTargetRef.current)) {
        bestTargetRef.current = newTarget;

        // Update ghost width for the target slot type
        const newW = newTarget.kind === "solo"
          ? containerW.current
          : (containerW.current - gap) / 2;
        Animated.spring(ghostW, { toValue: newW, useNativeDriver: false }).start();
        ghostNativeW.current = newW;

        // Animate preview layout
        const preview = applyTarget(rowsWithoutRef.current, id, newTarget);
        LayoutAnimation.configureNext(SPRING_CONFIG);
        setPreviewLayout(preview);
      }
    },
    [gap, ghostW, ghostX, ghostY],
  );

  // ── End drag ─────────────────────────────────────────────────────────────
  const endDrag = useCallback(() => {
    const id = dragIdRef.current;
    if (!id) return;
    dragIdRef.current = null;

    Animated.parallel([
      Animated.spring(ghostScale, { toValue: 1, useNativeDriver: ND, overshootClamping: true }),
      Animated.timing(ghostOp,    { toValue: 0, duration: 100, useNativeDriver: ND }),
    ]).start(() => {
      setDragId(null);
      setEditing(false);
      setPreviewLayout(null);
      onEditModeChange?.(false);
    });

    const target = bestTargetRef.current;
    if (target) {
      const next = applyTarget(rowsWithoutRef.current, id, target);
      if (!layoutsEqual(next, layoutRef.current)) {
        LayoutAnimation.configureNext(SPRING_CONFIG);
        onLayoutChange(next);
      }
    }
    bestTargetRef.current = null;
  }, [ghostOp, ghostScale, onEditModeChange, onLayoutChange]);

  // ── Derive rendered rows (preview while dragging, else committed layout) ──
  const displayLayout = previewLayout ?? layout;
  const itemMap = Object.fromEntries(items.map((it) => [it.id, it]));
  const draggedItem = dragId ? itemMap[dragId] : null;

  return (
    <View
      ref={containerRef}
      style={styles.container}
      onLayout={(e) => { containerW.current = e.nativeEvent.layout.width; }}
    >
      {displayLayout.map((row, ri) => (
        <View
          key={ri}
          style={[styles.row, { gap, marginBottom: gap }]}
          onLayout={(e) => { rowHeights.current.set(ri, e.nativeEvent.layout.height); }}
        >
          {row.map((id) => {
            const item = itemMap[id];
            if (!item) return null;
            return (
              <GridCell
                key={id}
                item={item}
                isDragging={id === dragId}
                jiggling={editing && id !== dragId}
                onDragStart={(ax, ay) => beginDrag(id, ax, ay)}
                onDragMove={moveDrag}
                onDragEnd={endDrag}
              />
            );
          })}
        </View>
      ))}

      {/* Ghost card */}
      {draggedItem && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ghost,
            {
              left: ghostX,
              top:  ghostY,
              width: ghostW,
              height: ghostNativeH.current,
              opacity: ghostOp,
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
  onDragStart: (absX: number, absY: number) => void;
  onDragMove:  (absX: number, absY: number) => void;
  onDragEnd:   () => void;
}

function GridCell({ item, isDragging, jiggling, onDragStart, onDragMove, onDragEnd }: GridCellProps) {
  const endedRef = useRef(false);

  const gesture = Gesture.Pan()
    .activateAfterLongPress(500)
    .runOnJS(true)
    .onStart((e) => {
      endedRef.current = false;
      onDragStart(e.absoluteX, e.absoluteY);
    })
    .onUpdate((e) => { onDragMove(e.absoluteX, e.absoluteY); })
    .onEnd(() => {
      if (!endedRef.current) { endedRef.current = true; onDragEnd(); }
    })
    .onFinalize(() => {
      if (!endedRef.current) { endedRef.current = true; onDragEnd(); }
    });

  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.cell, isDragging && styles.cellHidden]}>
        <JiggleCard active={jiggling}>
          {!isDragging && item.node}
        </JiggleCard>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container:  { position: "relative" },
  row:        { flexDirection: "row" },
  cell:       { flex: 1, minHeight: 60 },
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
