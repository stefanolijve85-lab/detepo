/**
 * DraggableWidgetList
 * -------------------
 * iOS-style long-press-to-drag widget reordering.
 * - Long-press (500ms) any card to lift it
 * - Drag up/down to reorder; other cards slide out of the way
 * - Release to drop; order is persisted via onReorder()
 *
 * Approach: Pressable onLongPress starts the drag.
 * A full-screen transparent overlay then captures all subsequent
 * touch/pointer events until the finger is lifted.
 */
import React, { useRef, useState, useCallback } from "react";
import {
  View,
  Animated,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
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

export function DraggableWidgetList({ items, onReorder, gap = 8 }: Props) {
  const colors = useColors();

  // Which item ID is currently being dragged
  const [dragId, setDragId] = useState<string | null>(null);
  // Current hover target index (where the card will land)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Animated Y of the ghost card (absolute, relative to list container)
  const ghostAnim = useRef(new Animated.Value(0)).current;
  const ghostScale = useRef(new Animated.Value(1)).current;
  const ghostOpacity = useRef(new Animated.Value(0)).current;

  // Stores {y, height} for each item, keyed by id
  const itemLayouts = useRef<Map<string, { y: number; height: number }>>(new Map());
  // Absolute Y of the list container on screen
  const containerAbsY = useRef(0);
  const containerRef = useRef<View>(null);

  // How far inside the card the finger initially touched
  const touchOffset = useRef(0);
  // Refs so overlay callbacks can always read current values
  const dragIdRef = useRef<string | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Re-measure container absolute Y whenever layout changes
  const measureContainer = useCallback(() => {
    if (!containerRef.current) return;
    (containerRef.current as View).measureInWindow((_x, y) => {
      containerAbsY.current = y;
    });
  }, []);

  // Compute which list index the dragged card should occupy given current touch Y
  const computeHoverIndex = useCallback(
    (absY: number, dragging: string): number => {
      const current = itemsRef.current;
      const relY = absY - containerAbsY.current;
      const midpoints = current
        .filter((it) => it.id !== dragging)
        .map((it) => {
          const l = itemLayouts.current.get(it.id);
          return { id: it.id, mid: l ? l.y + l.height / 2 : Infinity };
        })
        .sort((a, b) => a.mid - b.mid);

      let insertAt = midpoints.length;
      for (let i = 0; i < midpoints.length; i++) {
        if (relY < midpoints[i].mid) {
          insertAt = i;
          break;
        }
      }

      // Map insertAt among "others" back to full list index
      const others = current.filter((it) => it.id !== dragging);
      const spliced = [...others];
      const draggedItem = current.find((it) => it.id === dragging)!;
      spliced.splice(insertAt, 0, draggedItem);
      return spliced.findIndex((it) => it.id === dragging);
    },
    [],
  );

  const startDrag = useCallback(
    (id: string, pageY: number) => {
      measureContainer();
      const lay = itemLayouts.current.get(id);
      if (!lay) return;
      dragIdRef.current = id;

      const ghostStartY = lay.y;
      touchOffset.current = pageY - containerAbsY.current - lay.y;
      ghostAnim.setValue(ghostStartY);

      setDragId(id);
      setHoverIndex(itemsRef.current.findIndex((it) => it.id === id));

      Animated.parallel([
        Animated.spring(ghostScale, { toValue: 1.04, useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(ghostOpacity, { toValue: 1, duration: 100, useNativeDriver: Platform.OS !== "web" }),
      ]).start();
    },
    [ghostAnim, ghostOpacity, ghostScale, measureContainer],
  );

  const onOverlayMove = useCallback(
    (pageY: number) => {
      const id = dragIdRef.current;
      if (!id) return;
      const lay = itemLayouts.current.get(id);
      const rawY = pageY - containerAbsY.current - touchOffset.current;
      const maxY = lay ? (itemLayouts.current.size > 0
        ? Math.max(...Array.from(itemLayouts.current.values()).map((l) => l.y + l.height)) - lay.height
        : 9999) : 9999;
      const clampedY = Math.max(0, Math.min(rawY, maxY));
      ghostAnim.setValue(clampedY);
      const midY = clampedY + (lay?.height ?? 60) / 2;
      setHoverIndex(computeHoverIndex(midY + containerAbsY.current, id));
    },
    [ghostAnim, computeHoverIndex],
  );

  const onOverlayEnd = useCallback(() => {
    const id = dragIdRef.current;
    dragIdRef.current = null;

    Animated.parallel([
      Animated.spring(ghostScale, { toValue: 1, useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(ghostOpacity, { toValue: 0, duration: 100, useNativeDriver: Platform.OS !== "web" }),
    ]).start(() => {
      setDragId(null);
      setHoverIndex(null);
    });

    if (id !== null && hoverIndex !== null) {
      const ids = itemsRef.current.map((it) => it.id);
      const fromIdx = ids.indexOf(id);
      if (fromIdx !== hoverIndex) {
        const next = [...ids];
        next.splice(fromIdx, 1);
        next.splice(hoverIndex, 0, id);
        onReorder(next);
      }
    }
  }, [hoverIndex, ghostOpacity, ghostScale, onReorder]);

  // Build the displayed list — swap positions to show drop target
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
          <Pressable
            key={item.id}
            onLongPress={(e) => startDrag(item.id, e.nativeEvent.pageY)}
            delayLongPress={500}
            style={[
              styles.itemWrap,
              { marginBottom: gap },
              isDragging && { opacity: 0, minHeight: itemLayouts.current.get(item.id)?.height },
            ]}
            onLayout={(e) => {
              itemLayouts.current.set(item.id, {
                y: e.nativeEvent.layout.y,
                height: e.nativeEvent.layout.height,
              });
            }}
          >
            <Animated.View
              style={[
                isDragging ? { opacity: 0 } : undefined,
              ]}
            >
              {item.node}
            </Animated.View>
          </Pressable>
        );
      })}

      {/* Ghost card floating above everything */}
      {draggedItem && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ghost,
            {
              top: ghostAnim,
              opacity: ghostOpacity,
              transform: [{ scale: ghostScale }],
              shadowColor: colors.foreground,
            },
          ]}
        >
          {draggedItem.node}
        </Animated.View>
      )}

      {/* Full-screen touch capture overlay — active only while dragging */}
      {dragId && (
        <View
          style={styles.overlay}
          onTouchMove={(e) => onOverlayMove(e.nativeEvent.pageY)}
          onTouchEnd={() => onOverlayEnd()}
          onTouchCancel={() => onOverlayEnd()}
        />
      )}
    </View>
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
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 998,
    // Transparent but captures events
  },
});
