/**
 * DraggableWidgetList
 * -------------------
 * iOS-style long-press-to-drag reordering.
 * Uses react-native-gesture-handler v2's Pan.activateAfterLongPress(ms)
 * which works correctly on real devices inside a ScrollView.
 */
import React, { useRef, useState, useCallback } from "react";
import { View, Animated, StyleSheet, Platform } from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { useColors } from "@/hooks/useColors";

export interface DraggableItem {
  id: string;
  node: React.ReactNode;
}

interface Props {
  items: DraggableItem[];
  onReorder: (newIds: string[]) => void;
  gap?: number;
}

const ND = Platform.OS !== "web";

export function DraggableWidgetList({ items, onReorder, gap = 8 }: Props) {
  const colors = useColors();

  const [dragId, setDragId] = useState<string | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const ghostY = useRef(new Animated.Value(0)).current;
  const ghostScale = useRef(new Animated.Value(1)).current;
  const ghostOpacity = useRef(new Animated.Value(0)).current;

  const itemLayouts = useRef<Map<string, { y: number; height: number }>>(new Map());
  const containerAbsY = useRef(0);
  const containerRef = useRef<View>(null);
  const touchOffsetY = useRef(0);

  const dragIdRef = useRef<string | null>(null);
  const hoverIndexRef = useRef<number | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const measureContainer = useCallback(() => {
    containerRef.current?.measureInWindow((_x, y) => {
      containerAbsY.current = y;
    });
  }, []);

  const computeHoverIndex = useCallback((relY: number, dragging: string): number => {
    const current = itemsRef.current;
    const midpoints = current
      .filter((it) => it.id !== dragging)
      .map((it) => {
        const l = itemLayouts.current.get(it.id);
        return { id: it.id, mid: l ? l.y + l.height / 2 : Infinity };
      })
      .sort((a, b) => a.mid - b.mid);

    let insertAt = midpoints.length;
    for (let i = 0; i < midpoints.length; i++) {
      if (relY < midpoints[i].mid) { insertAt = i; break; }
    }

    const others = current.filter((it) => it.id !== dragging);
    const dragged = current.find((it) => it.id === dragging)!;
    const spliced = [...others];
    spliced.splice(insertAt, 0, dragged);
    return spliced.findIndex((it) => it.id === dragging);
  }, []);

  const beginDrag = useCallback((id: string, absoluteY: number) => {
    measureContainer();
    const lay = itemLayouts.current.get(id);
    if (!lay) return;
    dragIdRef.current = id;
    const relY = absoluteY - containerAbsY.current;
    touchOffsetY.current = relY - lay.y;
    ghostY.setValue(lay.y);
    const idx = itemsRef.current.findIndex((it) => it.id === id);
    hoverIndexRef.current = idx;
    setDragId(id);
    setHoverIndex(idx);
    Animated.parallel([
      Animated.spring(ghostScale, { toValue: 1.05, useNativeDriver: ND }),
      Animated.timing(ghostOpacity, { toValue: 1, duration: 100, useNativeDriver: ND }),
    ]).start();
  }, [ghostOpacity, ghostScale, ghostY, measureContainer]);

  const moveDrag = useCallback((absoluteY: number) => {
    const id = dragIdRef.current;
    if (!id) return;
    const lay = itemLayouts.current.get(id);
    const relY = absoluteY - containerAbsY.current - touchOffsetY.current;
    const heights = Array.from(itemLayouts.current.values());
    const totalH = heights.reduce((s, l) => s + l.height + gap, 0);
    const maxY = Math.max(totalH - (lay?.height ?? 60), 0);
    const clampedY = Math.max(0, Math.min(relY, maxY));
    ghostY.setValue(clampedY);
    const midY = clampedY + (lay?.height ?? 60) / 2;
    const hi = computeHoverIndex(midY, id);
    hoverIndexRef.current = hi;
    setHoverIndex(hi);
  }, [ghostY, gap, computeHoverIndex]);

  const endDrag = useCallback(() => {
    const id = dragIdRef.current;
    const hi = hoverIndexRef.current;
    dragIdRef.current = null;
    hoverIndexRef.current = null;

    Animated.parallel([
      Animated.spring(ghostScale, { toValue: 1, useNativeDriver: ND }),
      Animated.timing(ghostOpacity, { toValue: 0, duration: 80, useNativeDriver: ND }),
    ]).start(() => {
      setDragId(null);
      setHoverIndex(null);
    });

    if (id && hi !== null) {
      const ids = itemsRef.current.map((it) => it.id);
      const fromIdx = ids.indexOf(id);
      if (fromIdx !== hi) {
        const next = [...ids];
        next.splice(fromIdx, 1);
        next.splice(hi, 0, id);
        onReorder(next);
      }
    }
  }, [ghostOpacity, ghostScale, onReorder]);

  // Build displayed list with hover position applied
  const displayItems = items.slice();
  if (dragId !== null && hoverIndex !== null) {
    const fromIdx = displayItems.findIndex((it) => it.id === dragId);
    if (fromIdx !== -1 && fromIdx !== hoverIndex) {
      const [moved] = displayItems.splice(fromIdx, 1);
      displayItems.splice(hoverIndex, 0, moved);
    }
  }

  const draggedItem = dragId ? items.find((it) => it.id === dragId) : null;

  return (
    <View ref={containerRef} style={styles.container} onLayout={measureContainer}>
      {displayItems.map((item) => {
        const isDragging = item.id === dragId;
        return (
          <ItemRow
            key={item.id}
            item={item}
            isDragging={isDragging}
            gap={gap}
            ghostHeight={isDragging ? (itemLayouts.current.get(item.id)?.height ?? 60) : 60}
            onLayout={(y, h) => itemLayouts.current.set(item.id, { y, height: h })}
            onDragStart={beginDrag}
            onDragMove={moveDrag}
            onDragEnd={endDrag}
          />
        );
      })}

      {/* Floating ghost */}
      {draggedItem && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ghost,
            {
              top: ghostY,
              opacity: ghostOpacity,
              transform: [{ scale: ghostScale }],
              shadowColor: colors.foreground,
            },
          ]}
        >
          {draggedItem.node}
        </Animated.View>
      )}
    </View>
  );
}

// ── Per-item component ────────────────────────────────────────────────────────

interface ItemRowProps {
  item: DraggableItem;
  isDragging: boolean;
  gap: number;
  ghostHeight: number;
  onLayout: (y: number, h: number) => void;
  onDragStart: (id: string, absoluteY: number) => void;
  onDragMove: (absoluteY: number) => void;
  onDragEnd: () => void;
}

function ItemRow({
  item,
  isDragging,
  gap,
  ghostHeight,
  onLayout,
  onDragStart,
  onDragMove,
  onDragEnd,
}: ItemRowProps) {
  // Pan gesture that activates after a 500ms hold.
  // This is the recommended RNGH v2 pattern for drag-to-reorder inside ScrollViews.
  const gesture = Gesture.Pan()
    .activateAfterLongPress(500)
    .runOnJS(true)
    .onStart((e) => {
      onDragStart(item.id, e.absoluteY);
    })
    .onUpdate((e) => {
      onDragMove(e.absoluteY);
    })
    .onEnd(() => {
      onDragEnd();
    })
    .onFinalize(() => {
      onDragEnd();
    });

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={[
          styles.itemWrap,
          { marginBottom: gap },
          isDragging && { opacity: 0, minHeight: ghostHeight },
        ]}
        onLayout={(e) => {
          onLayout(e.nativeEvent.layout.y, e.nativeEvent.layout.height);
        }}
      >
        {!isDragging && item.node}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: { position: "relative" },
  itemWrap: { width: "100%" },
  ghost: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 999,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 20,
  },
});
