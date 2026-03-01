// Plans System — Skia Plan Viewer Canvas
//
// Two-thread architecture:
// - UI thread (Reanimated worklets): Updates scale/translate shared values at 60fps.
//   Drives the Skia <Group> transform. Zero JS involvement.
// - JS thread (100ms throttled): Reads shared values, computes needed tiles,
//   triggers fetches via TileManager. NOT every frame.
//
// Progressive loading: thumbnail always rendered as blurry base layer,
// sharp tiles overlay on top as they load.

import { useEffect, useRef, useState, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import {
  Canvas,
  Image as SkiaImage,
  Group,
  useImage,
  type SkImage,
} from "@shopify/react-native-skia";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import {
  useSharedValue,
  useDerivedValue,
  runOnJS,
  withTiming,
} from "react-native-reanimated";
import { TileManager } from "../lib/plans/tile-manager";
import { fitToScreen, imageSizeAtLevel } from "../lib/plans/tile-math";
import { getAuthHeaders } from "../lib/plans/api";
import { VIEWPORT_SYNC_INTERVAL_MS } from "../lib/plans/constants";
import type { RenderMeta, Camera, Size, TileDescriptor } from "../lib/plans/types";

interface PlanViewerCanvasProps {
  renderMeta: RenderMeta;
  thumbnailUrl: string | null;
}

export default function PlanViewerCanvas({
  renderMeta,
  thumbnailUrl,
}: PlanViewerCanvasProps) {
  // Canvas size
  const [canvasSize, setCanvasSize] = useState<Size | null>(null);

  // Tile state — triggers re-render when tiles load
  const [tileVersion, setTileVersion] = useState(0);
  const [visibleTiles, setVisibleTiles] = useState<TileDescriptor[]>([]);

  // Refs
  const tileManagerRef = useRef<TileManager | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  // Shared values for UI thread transforms
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Gesture tracking (only needed for double-tap)
  const lastTapTime = useSharedValue(0);

  // Thumbnail as Skia image
  const thumbnail = useImage(thumbnailUrl);

  // Compute fit-to-screen camera once we know canvas size
  const fitCamera = canvasSize
    ? fitToScreen(canvasSize, renderMeta)
    : null;

  // Initialize camera to fit-to-screen
  useEffect(() => {
    if (fitCamera) {
      scale.value = fitCamera.scale;
      translateX.value = fitCamera.tx;
      translateY.value = fitCamera.ty;
    }
  }, [canvasSize !== null]); // Only run once when canvas size is first known

  // ── Tile Manager lifecycle ──────────────────────────────

  // Callback when a tile finishes loading — triggers React re-render
  const onTileLoaded = useCallback(() => {
    if (mountedRef.current) {
      setTileVersion((v) => v + 1);
    }
  }, []);

  // Create TileManager
  useEffect(() => {
    tileManagerRef.current = new TileManager(
      renderMeta,
      getAuthHeaders,
      onTileLoaded
    );

    return () => {
      tileManagerRef.current?.destroy();
      tileManagerRef.current = null;
    };
  }, [renderMeta, onTileLoaded]);

  // ── Viewport sync (JS thread, throttled) ────────────────

  const syncViewport = useCallback(() => {
    if (!canvasSize || !tileManagerRef.current || !mountedRef.current) return;

    const camera: Camera = {
      scale: scale.value,
      tx: translateX.value,
      ty: translateY.value,
    };

    const tiles = tileManagerRef.current.updateViewport(camera, canvasSize);
    setVisibleTiles(tiles);
  }, [canvasSize, scale, translateX, translateY]);

  // Start/stop the 100ms sync interval
  useEffect(() => {
    if (!canvasSize) return;

    // Initial sync
    syncViewport();

    // Periodic sync for catching up after gestures
    syncTimerRef.current = setInterval(syncViewport, VIEWPORT_SYNC_INTERVAL_MS);

    return () => {
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current);
        syncTimerRef.current = null;
      }
    };
  }, [canvasSize, syncViewport]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ── Gestures (UI thread) ────────────────────────────────

  const minScale = fitCamera?.scale ?? 0.1;
  const maxScale = 1; // 1:1 pixel

  // Pinch: uses onChange for incremental deltas (more reliable on Android
  // than onUpdate with saved values). Each frame applies a small scale change
  // and adjusts translation to keep the focal point fixed.
  const pinchGesture = Gesture.Pinch()
    .onChange((e) => {
      const oldScale = scale.value;
      const newScale = Math.max(
        minScale,
        Math.min(maxScale, oldScale * e.scaleChange)
      );

      if (newScale !== oldScale) {
        // Zoom toward focal point: keep the image point under focalX/Y fixed
        const ratio = newScale / oldScale;
        translateX.value = e.focalX - ratio * (e.focalX - translateX.value);
        translateY.value = e.focalY - ratio * (e.focalY - translateY.value);
        scale.value = newScale;
      }
    })
    .onEnd(() => {
      runOnJS(syncViewport)();
    });

  // Pan: single finger only (two-finger movement handled by pinch focal point).
  // Uses onChange for incremental deltas.
  const panGesture = Gesture.Pan()
    .minPointers(1)
    .maxPointers(1)
    .onChange((e) => {
      translateX.value += e.changeX;
      translateY.value += e.changeY;
    })
    .onEnd(() => {
      runOnJS(syncViewport)();
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onStart((e) => {
      if (!fitCamera) return;

      const isZoomedIn = scale.value > fitCamera.scale * 1.5;

      if (isZoomedIn) {
        // Zoom out to fit
        scale.value = withTiming(fitCamera.scale, { duration: 300 });
        translateX.value = withTiming(fitCamera.tx, { duration: 300 });
        translateY.value = withTiming(fitCamera.ty, { duration: 300 });
      } else {
        // Zoom to 2x at tap point
        const targetScale = Math.min(maxScale, fitCamera.scale * 2);
        const ratio = targetScale / scale.value;
        const newTx = e.x - ratio * (e.x - translateX.value);
        const newTy = e.y - ratio * (e.y - translateY.value);

        scale.value = withTiming(targetScale, { duration: 300 });
        translateX.value = withTiming(newTx, { duration: 300 });
        translateY.value = withTiming(newTy, { duration: 300 });
      }

      // Sync after animation
      setTimeout(() => runOnJS(syncViewport)(), 350);
    });

  const composedGesture = Gesture.Simultaneous(
    pinchGesture,
    panGesture,
    doubleTapGesture
  );

  // ── Layout handler ──────────────────────────────────────

  const onLayout = useCallback(
    (e: { nativeEvent: { layout: { width: number; height: number } } }) => {
      const { width, height } = e.nativeEvent.layout;
      if (width > 0 && height > 0) {
        setCanvasSize({ width, height });
      }
    },
    []
  );

  // ── Animated transform (UI thread, 60fps) ──────────────

  // Skia accepts Reanimated shared/derived values directly as props.
  // This drives the Group transform at 60fps on the UI thread,
  // instead of only updating on React re-renders (~10fps).
  const canvasTransform = useDerivedValue(() => [
    { translateX: translateX.value },
    { translateY: translateY.value },
    { scale: scale.value },
  ]);

  // ── Render ──────────────────────────────────────────────

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <View style={styles.canvas} onLayout={onLayout}>
          {canvasSize && (
            <Canvas style={{ width: canvasSize.width, height: canvasSize.height }}>
              <Group transform={canvasTransform}>
                {/* Base layer: thumbnail (always visible, blurry at zoom) */}
                {thumbnail && (
                  <SkiaImage
                    image={thumbnail}
                    x={0}
                    y={0}
                    width={renderMeta.width_px}
                    height={renderMeta.height_px}
                    fit="fill"
                  />
                )}

                {/* Tile overlay: sharp tiles on top */}
                {visibleTiles.map((tile) => {
                  const image = tileManagerRef.current?.getTile(tile.key);
                  if (!image) return null;

                  // Convert tile position from level coords to full-image coords
                  const maxLevel = renderMeta.level_count - 1;
                  const levelScale = Math.pow(2, maxLevel - tile.level);

                  return (
                    <SkiaImage
                      key={tile.key}
                      image={image}
                      x={tile.x * levelScale}
                      y={tile.y * levelScale}
                      width={tile.width * levelScale}
                      height={tile.height * levelScale}
                      fit="fill"
                    />
                  );
                })}
              </Group>
            </Canvas>
          )}
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  canvas: {
    flex: 1,
    backgroundColor: "#e8e8e8",
  },
});
