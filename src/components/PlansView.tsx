import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { fetchCurrentSheets } from "../lib/plans/api";
import type { PlanSheetForList, PlanFolder } from "../lib/plans/types";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_GAP = 10;
const HORIZONTAL_PAD = 16;
const NUM_COLUMNS = 2;
const CARD_WIDTH =
  (SCREEN_WIDTH - HORIZONTAL_PAD * 2 - CARD_GAP * (NUM_COLUMNS - 1)) /
  NUM_COLUMNS;
const THUMB_HEIGHT = CARD_WIDTH * 0.7;

type ViewMode = "grid" | "list";
type Nav = NativeStackNavigationProp<RootStackParamList>;

type PlansViewProps = {
  jobSiteId: string;
  viewMode: ViewMode;
  allCollapsed: boolean;
  collapseToggleCount: number;
};

export default function PlansView({
  jobSiteId,
  viewMode,
  allCollapsed,
  collapseToggleCount,
}: PlansViewProps) {
  const navigation = useNavigation<Nav>();
  const [sheets, setSheets] = useState<PlanSheetForList[]>([]);
  const [folders, setFolders] = useState<PlanFolder[]>([]);
  const [sortedIds, setSortedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [collapsedFolders, setCollapsedFolders] = useState<
    Record<string, boolean>
  >({});

  // Load data
  const loadData = useCallback(async () => {
    try {
      setError(null);
      const result = await fetchCurrentSheets(jobSiteId);
      setSheets(result.sheets);
      setFolders(result.folders);
      setSortedIds(result.sortedIds);
    } catch (err: any) {
      console.error("Failed to load plans:", err);
      setError(err.message || "Failed to load plans");
    }
  }, [jobSiteId]);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Sync collapse state when parent toggles all
  const lastToggle = useRef(collapseToggleCount);
  useEffect(() => {
    if (collapseToggleCount !== lastToggle.current) {
      lastToggle.current = collapseToggleCount;
      const allFolderIds = ["unfiled", ...folders.map((f) => f.id)];
      const newState: Record<string, boolean> = {};
      for (const id of allFolderIds) {
        newState[id] = allCollapsed;
      }
      setCollapsedFolders(newState);
    }
  }, [allCollapsed, collapseToggleCount, folders]);

  const toggleFolder = (folderId: string) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  // Navigate to plan viewer
  const openSheet = (sheet: PlanSheetForList) => {
    navigation.navigate("PlanViewer", {
      sheetId: sheet.id,
      sheetNumber: sheet.sheet_number,
      title: sheet.title,
      thumbnailUrl: sheet.thumbnail_url,
      sortedIds,
      render: sheet.render
        ? {
            dziPath: sheet.render.dzi_path,
            tileFormat: sheet.render.tile_format,
            tileSize: sheet.render.tile_size,
            overlap: sheet.render.overlap,
            widthPx: sheet.render.width_px,
            heightPx: sheet.render.height_px,
            levelCount: sheet.render.level_count,
          }
        : null,
    });
  };

  // Filter
  const filteredSheets = search.trim()
    ? sheets.filter(
        (s) =>
          (s.sheet_number || "").toLowerCase().includes(search.toLowerCase()) ||
          (s.title || "").toLowerCase().includes(search.toLowerCase())
      )
    : sheets;

  // Group by folder
  const unfiledSheets = filteredSheets.filter((s) => s.folder_id === null);
  const folderGroups = folders
    .map((folder) => ({
      folder,
      sheets: filteredSheets.filter((s) => s.folder_id === folder.id),
    }))
    .filter((g) => g.sheets.length > 0);

  // Loading state
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4a90d9" />
        <Text style={styles.loadingText}>Loading plans...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.centered}>
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={40}
          color="#64748b"
        />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setLoading(true);
            loadData().finally(() => setLoading(false));
          }}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Empty state
  if (sheets.length === 0) {
    return (
      <View style={styles.centered}>
        <MaterialCommunityIcons
          name="file-document-outline"
          size={48}
          color="#475569"
        />
        <Text style={styles.emptyText}>No plans yet</Text>
        <Text style={styles.emptySubtext}>
          Upload plans from the web app to view them here
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color="#64748b"
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search plans"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <MaterialCommunityIcons name="close" size={18} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4a90d9"
            colors={["#4a90d9"]}
            progressBackgroundColor="#1e293b"
          />
        }
      >
        {/* Unfiled plans */}
        {unfiledSheets.length > 0 && (
          <FolderSection
            label="Unfiled plans"
            count={unfiledSheets.length}
            sheets={unfiledSheets}
            collapsed={collapsedFolders["unfiled"] || false}
            onToggle={() => toggleFolder("unfiled")}
            viewMode={viewMode}
            onPressSheet={openSheet}
          />
        )}

        {/* Folder sections */}
        {folderGroups.map(({ folder, sheets: folderSheets }) => (
          <FolderSection
            key={folder.id}
            label={folder.name}
            count={folderSheets.length}
            sheets={folderSheets}
            collapsed={collapsedFolders[folder.id] || false}
            onToggle={() => toggleFolder(folder.id)}
            viewMode={viewMode}
            onPressSheet={openSheet}
          />
        ))}

        {/* No results from search */}
        {filteredSheets.length === 0 && search.trim().length > 0 && (
          <View style={styles.noResults}>
            <Text style={styles.noResultsText}>
              No plans match "{search}"
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function FolderSection({
  label,
  count,
  sheets,
  collapsed,
  onToggle,
  viewMode,
  onPressSheet,
}: {
  label: string;
  count: number;
  sheets: PlanSheetForList[];
  collapsed: boolean;
  onToggle: () => void;
  viewMode: ViewMode;
  onPressSheet: (sheet: PlanSheetForList) => void;
}) {
  // Build rows of 2 for grid
  const rows: PlanSheetForList[][] = [];
  for (let i = 0; i < sheets.length; i += NUM_COLUMNS) {
    rows.push(sheets.slice(i, i + NUM_COLUMNS));
  }

  return (
    <View style={styles.folderSection}>
      <TouchableOpacity
        style={styles.folderHeader}
        onPress={onToggle}
        activeOpacity={0.6}
      >
        <MaterialCommunityIcons
          name={collapsed ? "chevron-right" : "chevron-down"}
          size={22}
          color="#94a3b8"
        />
        <MaterialCommunityIcons
          name="folder-outline"
          size={18}
          color="#f59e0b"
          style={{ marginLeft: 4, marginRight: 8 }}
        />
        <Text style={styles.folderName}>{label}</Text>
        <Text style={styles.folderCount}>({count})</Text>
      </TouchableOpacity>

      {!collapsed &&
        (viewMode === "grid" ? (
          <View style={styles.grid}>
            {rows.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.gridRow}>
                {row.map((sheet) => (
                  <PlanCard
                    key={sheet.id}
                    sheet={sheet}
                    onPress={() => onPressSheet(sheet)}
                  />
                ))}
                {row.length < NUM_COLUMNS && (
                  <View style={{ width: CARD_WIDTH }} />
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.listContainer}>
            {sheets.map((sheet, index) => (
              <TouchableOpacity
                key={sheet.id}
                style={styles.listRow}
                activeOpacity={0.6}
                onPress={() => onPressSheet(sheet)}
              >
                <MaterialCommunityIcons
                  name="file-document-outline"
                  size={20}
                  color="#64748b"
                  style={{ marginRight: 12 }}
                />
                <Text style={styles.listSheet}>
                  {sheet.sheet_number || "-"}
                </Text>
                <Text style={styles.listTitle} numberOfLines={1}>
                  {sheet.title || "Untitled"}
                </Text>
                {index < sheets.length - 1 && (
                  <View style={styles.listDivider} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
    </View>
  );
}

function PlanCard({
  sheet,
  onPress,
}: {
  sheet: PlanSheetForList;
  onPress: () => void;
}) {
  const [thumbError, setThumbError] = useState(false);
  const hasThumb = sheet.thumbnail_url && !thumbError;

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={onPress}>
      {/* Thumbnail area */}
      <View style={styles.cardThumb}>
        {hasThumb ? (
          <Image
            source={{ uri: sheet.thumbnail_url! }}
            style={styles.cardThumbImage}
            resizeMode="contain"
            onError={() => setThumbError(true)}
          />
        ) : (
          <MaterialCommunityIcons
            name="file-document-outline"
            size={40}
            color="#475569"
          />
        )}
      </View>

      {/* Info below thumbnail */}
      <View style={styles.cardInfo}>
        <Text style={styles.cardSheet} numberOfLines={1}>
          {sheet.sheet_number || "-"}
        </Text>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {sheet.title || "Untitled"}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#162030",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#162030",
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 12,
  },
  errorText: {
    fontSize: 15,
    color: "#94a3b8",
    marginTop: 12,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: "#243040",
    borderRadius: 6,
  },
  retryText: {
    fontSize: 14,
    color: "#4a90d9",
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#475569",
    marginTop: 6,
    textAlign: "center",
  },
  noResults: {
    paddingTop: 40,
    alignItems: "center",
  },
  noResultsText: {
    fontSize: 15,
    color: "#64748b",
  },

  // Search
  searchRow: {
    paddingHorizontal: HORIZONTAL_PAD,
    paddingTop: 14,
    paddingBottom: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#243040",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#e2e8f0",
    padding: 0,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Folder section
  folderSection: {
    marginBottom: 4,
  },
  folderHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: HORIZONTAL_PAD,
    paddingVertical: 10,
  },
  folderName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#e2e8f0",
  },
  folderCount: {
    fontSize: 14,
    color: "#64748b",
    marginLeft: 6,
  },

  // Grid
  grid: {
    paddingHorizontal: HORIZONTAL_PAD,
  },
  gridRow: {
    flexDirection: "row",
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },

  // Plan card (grid mode)
  card: {
    width: CARD_WIDTH,
    backgroundColor: "#243040",
    borderRadius: 6,
    overflow: "hidden",
  },
  cardThumb: {
    width: "100%",
    height: THUMB_HEIGHT,
    backgroundColor: "#1e2a3a",
    alignItems: "center",
    justifyContent: "center",
  },
  cardThumbImage: {
    width: "100%",
    height: "100%",
  },
  cardInfo: {
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 8,
  },
  cardSheet: {
    fontSize: 14,
    fontWeight: "700",
    color: "#e2e8f0",
  },
  cardTitle: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
    textTransform: "uppercase",
  },

  // List mode
  listContainer: {
    paddingHorizontal: HORIZONTAL_PAD,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  listSheet: {
    fontSize: 14,
    fontWeight: "700",
    color: "#e2e8f0",
    width: 50,
  },
  listTitle: {
    flex: 1,
    fontSize: 13,
    color: "#94a3b8",
    textTransform: "uppercase",
  },
  listDivider: {
    position: "absolute",
    bottom: 0,
    left: 8,
    right: 8,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#2d3d50",
  },
});
