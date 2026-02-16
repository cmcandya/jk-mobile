import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Dimensions,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { plans, folders, type Plan } from "../data/plans";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_GAP = 10;
const HORIZONTAL_PAD = 16;
const NUM_COLUMNS = 2;
const CARD_WIDTH =
  (SCREEN_WIDTH - HORIZONTAL_PAD * 2 - CARD_GAP * (NUM_COLUMNS - 1)) /
  NUM_COLUMNS;
const THUMB_HEIGHT = CARD_WIDTH * 0.7;

type ViewMode = "grid" | "list";

type PlansViewProps = {
  viewMode: ViewMode;
  allCollapsed: boolean;
  collapseToggleCount: number;
};

const ALL_FOLDER_IDS = ["unfiled", ...folders.map((f) => f.id)];

export default function PlansView({
  viewMode,
  allCollapsed,
  collapseToggleCount,
}: PlansViewProps) {
  const [search, setSearch] = useState("");
  const [collapsedFolders, setCollapsedFolders] = useState<
    Record<string, boolean>
  >({});

  // Sync collapse state when parent toggles all
  const lastToggle = useRef(collapseToggleCount);
  useEffect(() => {
    if (collapseToggleCount !== lastToggle.current) {
      lastToggle.current = collapseToggleCount;
      const newState: Record<string, boolean> = {};
      for (const id of ALL_FOLDER_IDS) {
        newState[id] = allCollapsed;
      }
      setCollapsedFolders(newState);
    }
  }, [allCollapsed, collapseToggleCount]);

  const toggleFolder = (folderId: string) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  const filteredPlans = search.trim()
    ? plans.filter(
        (p) =>
          p.sheetNumber.toLowerCase().includes(search.toLowerCase()) ||
          p.title.toLowerCase().includes(search.toLowerCase())
      )
    : plans;

  // Group plans by folder
  const unfiledPlans = filteredPlans.filter((p) => p.folderId === null);
  const folderGroups = folders
    .map((folder) => ({
      folder,
      plans: filteredPlans.filter((p) => p.folderId === folder.id),
    }))
    .filter((g) => g.plans.length > 0);

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
      >
        {/* Unfiled plans */}
        {unfiledPlans.length > 0 && (
          <FolderSection
            label="Unfiled plans"
            count={unfiledPlans.length}
            plans={unfiledPlans}
            collapsed={collapsedFolders["unfiled"] || false}
            onToggle={() => toggleFolder("unfiled")}
            viewMode={viewMode}
          />
        )}

        {/* Folder sections */}
        {folderGroups.map(({ folder, plans: folderPlans }) => (
          <FolderSection
            key={folder.id}
            label={folder.name}
            count={folderPlans.length}
            plans={folderPlans}
            collapsed={collapsedFolders[folder.id] || false}
            onToggle={() => toggleFolder(folder.id)}
            viewMode={viewMode}
          />
        ))}
      </ScrollView>

      {/* FAB — Add plan */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.8}>
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

function FolderSection({
  label,
  count,
  plans,
  collapsed,
  onToggle,
  viewMode,
}: {
  label: string;
  count: number;
  plans: Plan[];
  collapsed: boolean;
  onToggle: () => void;
  viewMode: ViewMode;
}) {
  // Build rows of 2 for grid
  const rows: Plan[][] = [];
  for (let i = 0; i < plans.length; i += NUM_COLUMNS) {
    rows.push(plans.slice(i, i + NUM_COLUMNS));
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
                {row.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} />
                ))}
                {row.length < NUM_COLUMNS && (
                  <View style={{ width: CARD_WIDTH }} />
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.listContainer}>
            {plans.map((plan, index) => (
              <TouchableOpacity
                key={plan.id}
                style={styles.listRow}
                activeOpacity={0.6}
              >
                <MaterialCommunityIcons
                  name="file-document-outline"
                  size={20}
                  color="#64748b"
                  style={{ marginRight: 12 }}
                />
                <Text style={styles.listSheet}>{plan.sheetNumber}</Text>
                <Text style={styles.listTitle} numberOfLines={1}>
                  {plan.title}
                </Text>
                {index < plans.length - 1 && (
                  <View style={styles.listDivider} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
    </View>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.7}>
      {/* Thumbnail area */}
      <View style={styles.cardThumb}>
        <MaterialCommunityIcons
          name="file-document-outline"
          size={40}
          color="#475569"
        />
      </View>

      {/* Info below thumbnail */}
      <View style={styles.cardInfo}>
        <Text style={styles.cardSheet} numberOfLines={1}>
          {plan.sheetNumber}
        </Text>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {plan.title}
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

  // Title row
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: HORIZONTAL_PAD,
    paddingTop: 14,
    paddingBottom: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: "#e2e8f0",
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

  // FAB
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4a90d9",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
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
