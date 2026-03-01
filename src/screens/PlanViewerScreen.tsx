// Plan Viewer Screen — full-screen Skia tile viewer with top bar, sheet nav

import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import PlanViewerCanvas from "../components/PlanViewerCanvas";
import { fetchSheetForViewer } from "../lib/plans/api";
import type { RenderMeta } from "../lib/plans/types";

type Props = NativeStackScreenProps<RootStackParamList, "PlanViewer">;

export default function PlanViewerScreen({ route, navigation }: Props) {
  const {
    sheetId: initialSheetId,
    sheetNumber: initialSheetNumber,
    title: initialTitle,
    thumbnailUrl: initialThumbnailUrl,
    sortedIds,
    render: initialRender,
  } = route.params;

  // Current sheet state (can change via prev/next)
  const [currentIndex, setCurrentIndex] = useState(() =>
    sortedIds.indexOf(initialSheetId)
  );
  const [sheetNumber, setSheetNumber] = useState(initialSheetNumber);
  const [title, setTitle] = useState(initialTitle);
  const [thumbnailUrl, setThumbnailUrl] = useState(initialThumbnailUrl);
  const [renderMeta, setRenderMeta] = useState<RenderMeta | null>(
    initialRender
      ? {
          dzi_path: initialRender.dziPath,
          tile_format: initialRender.tileFormat,
          tile_size: initialRender.tileSize,
          overlap: initialRender.overlap,
          width_px: initialRender.widthPx,
          height_px: initialRender.heightPx,
          level_count: initialRender.levelCount,
        }
      : null
  );
  const [loadingSheet, setLoadingSheet] = useState(false);

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < sortedIds.length - 1;

  // Navigate to a different sheet in the sorted list
  const navigateToSheet = useCallback(
    async (newIndex: number) => {
      if (newIndex < 0 || newIndex >= sortedIds.length) return;

      const sheetId = sortedIds[newIndex];
      setLoadingSheet(true);
      setCurrentIndex(newIndex);

      try {
        const result = await fetchSheetForViewer(sheetId);
        if (result) {
          setSheetNumber(result.sheet.sheet_number);
          setTitle(result.sheet.title);
          setThumbnailUrl(result.sheet.thumbnail_url);
          setRenderMeta(result.renderMeta);
        }
      } catch (err) {
        console.error("Failed to load sheet:", err);
      } finally {
        setLoadingSheet(false);
      }
    },
    [sortedIds]
  );

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.6}
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={28}
            color="#94a3b8"
          />
        </TouchableOpacity>
        <View style={styles.titleArea}>
          {sheetNumber && (
            <Text style={styles.sheetNumber} numberOfLines={1}>
              {sheetNumber}
            </Text>
          )}
          {title && (
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          )}
        </View>
        <View style={styles.topBarRight}>
          {/* Future: search, kebab menu */}
        </View>
      </View>

      {/* Canvas area */}
      <View style={styles.canvasArea}>
        {loadingSheet ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#4a90d9" />
          </View>
        ) : renderMeta ? (
          <PlanViewerCanvas
            key={sortedIds[currentIndex]} // Force remount on sheet change
            renderMeta={renderMeta}
            thumbnailUrl={thumbnailUrl}
          />
        ) : (
          <View style={styles.loading}>
            <MaterialCommunityIcons
              name="file-document-outline"
              size={48}
              color="#475569"
            />
            <Text style={styles.noRenderText}>
              No tile data available for this sheet
            </Text>
          </View>
        )}
      </View>

      {/* Bottom bar — sheet nav */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomLeft}>
          <Text style={styles.sheetCounter}>
            {currentIndex + 1} of {sortedIds.length}
          </Text>
        </View>
        <View style={styles.bottomRight}>
          <TouchableOpacity
            style={[styles.navButton, !canGoPrev && styles.navButtonDisabled]}
            onPress={() => canGoPrev && navigateToSheet(currentIndex - 1)}
            activeOpacity={0.6}
            disabled={!canGoPrev}
          >
            <MaterialCommunityIcons
              name="chevron-up"
              size={24}
              color={canGoPrev ? "#e2e8f0" : "#475569"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navButton, !canGoNext && styles.navButtonDisabled]}
            onPress={() => canGoNext && navigateToSheet(currentIndex + 1)}
            activeOpacity={0.6}
            disabled={!canGoNext}
          >
            <MaterialCommunityIcons
              name="chevron-down"
              size={24}
              color={canGoNext ? "#e2e8f0" : "#475569"}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a2332",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 44,
    paddingHorizontal: 4,
    paddingBottom: 8,
    backgroundColor: "#131c27",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#2d3d50",
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  titleArea: {
    flex: 1,
    marginLeft: 2,
  },
  sheetNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#e2e8f0",
  },
  title: {
    fontSize: 13,
    color: "#94a3b8",
    marginTop: 1,
  },
  topBarRight: {
    width: 44,
  },
  canvasArea: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  noRenderText: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 12,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingBottom: 28, // Safe area
    backgroundColor: "#131c27",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#2d3d50",
  },
  bottomLeft: {},
  sheetCounter: {
    fontSize: 13,
    color: "#64748b",
  },
  bottomRight: {
    flexDirection: "row",
    gap: 4,
  },
  navButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#243040",
    borderRadius: 6,
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
});
