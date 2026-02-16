import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import PlansView from "../components/PlansView";

type Props = NativeStackScreenProps<RootStackParamList, "SiteDetail">;

const DRAWER_WIDTH = Dimensions.get("window").width * 0.75;

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
type ViewMode = "grid" | "list";

type MenuItem = { key: string; label: string; icon: IconName };

const MENU_ITEMS: MenuItem[] = [
  { key: "plans", label: "Plans", icon: "view-grid" },
  { key: "specifications", label: "Specifications", icon: "format-list-text" },
  { key: "photos", label: "Photos", icon: "image" },
  { key: "crew", label: "Crew", icon: "account-group" },
  { key: "loto", label: "Lockout / Tagout", icon: "lock" },
  { key: "forms", label: "Forms", icon: "clipboard-text" },
  { key: "documents", label: "Documents", icon: "file-document" },
  // --- Project Management folder inserted here ---
  { key: "punch-list", label: "Punch List", icon: "checkbox-marked" },
  { key: "inspections", label: "Inspections", icon: "clipboard-check" },
  { key: "meetings", label: "Meetings", icon: "calendar-clock" },
  { key: "schedule", label: "Schedule", icon: "calendar-month" },
  { key: "equipment", label: "Equipment", icon: "hammer-wrench" },
  { key: "incidents", label: "Incidents", icon: "alert-circle" },
  { key: "directory", label: "Directory", icon: "contacts" },
];

// Items inside the Project Management folder
const PM_ITEMS: MenuItem[] = [
  { key: "rfis", label: "RFIs", icon: "help-circle" },
  { key: "submittals", label: "Submittals", icon: "send" },
  { key: "change-orders", label: "Change Orders", icon: "swap-horizontal-circle" },
  { key: "budget", label: "Budget", icon: "currency-usd" },
];

// Index in MENU_ITEMS where PM folder gets inserted (after Documents)
const PM_FOLDER_INDEX = 7;

export default function SiteDetailScreen({ route, navigation }: Props) {
  const { site } = route.params;
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [activeSection, setActiveSection] = useState("plans");
  const [drawerAnim] = useState(new Animated.Value(0));
  const [pmFolderOpen, setPmFolderOpen] = useState(false);

  // Plans controls — lifted up so top bar can render the icons
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [allCollapsed, setAllCollapsed] = useState(false);
  const [collapseToggleCount, setCollapseToggleCount] = useState(0);

  const toggleViewMode = () =>
    setViewMode((m) => (m === "grid" ? "list" : "grid"));

  const toggleAllCollapsed = () => {
    setAllCollapsed((v) => !v);
    setCollapseToggleCount((c) => c + 1);
  };

  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.timing(drawerAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const closeDrawer = () => {
    Animated.timing(drawerAnim, {
      toValue: -DRAWER_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setDrawerOpen(false));
  };

  const selectSection = (key: string) => {
    setActiveSection(key);
    closeDrawer();
  };

  const goHome = () => {
    closeDrawer();
    navigation.goBack();
  };

  const activeLabel =
    MENU_ITEMS.find((m) => m.key === activeSection)?.label ||
    PM_ITEMS.find((m) => m.key === activeSection)?.label ||
    "Plans";

  return (
    <View style={styles.container}>
      {/* Status bar spacer */}
      <View style={styles.statusBarSpacer} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={openDrawer}
          activeOpacity={0.6}
        >
          <MaterialCommunityIcons name="menu" size={24} color="#e2e8f0" />
        </TouchableOpacity>
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle} numberOfLines={1}>
            {activeLabel}
          </Text>
        </View>

        {/* Right side icons — only show for Plans */}
        {activeSection === "plans" ? (
          <View style={styles.topBarActions}>
            <TouchableOpacity
              style={styles.topBarActionBtn}
              onPress={toggleAllCollapsed}
              activeOpacity={0.6}
            >
              <MaterialCommunityIcons
                name={
                  allCollapsed
                    ? "arrow-expand-vertical"
                    : "arrow-collapse-vertical"
                }
                size={22}
                color="#94a3b8"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.topBarActionBtn}
              onPress={toggleViewMode}
              activeOpacity={0.6}
            >
              <MaterialCommunityIcons
                name={
                  viewMode === "grid"
                    ? "view-agenda-outline"
                    : "view-grid-outline"
                }
                size={20}
                color="#94a3b8"
              />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.topBarRight} />
        )}
      </View>

      {/* Content area */}
      <View style={styles.content}>
        {activeSection === "plans" ? (
          <PlansView
            viewMode={viewMode}
            allCollapsed={allCollapsed}
            collapseToggleCount={collapseToggleCount}
          />
        ) : (
          <View style={styles.placeholderView}>
            <Text style={styles.placeholderText}>{activeLabel}</Text>
            <Text style={styles.placeholderSubtext}>Coming soon</Text>
          </View>
        )}
      </View>

      {/* Drawer overlay */}
      {drawerOpen && (
        <Pressable style={styles.overlay} onPress={closeDrawer} />
      )}

      {/* Drawer */}
      <Animated.View
        style={[
          styles.drawer,
          { transform: [{ translateX: drawerAnim }] },
        ]}
      >
        {/* Drawer header — darker bg, tight padding */}
        <View style={styles.drawerHeader}>
          <Text style={styles.drawerSiteName} numberOfLines={1}>
            {site.site_name}
          </Text>
          <TouchableOpacity
            style={styles.homeButton}
            onPress={goHome}
            activeOpacity={0.6}
          >
            <MaterialCommunityIcons
              name="home-outline"
              size={24}
              color="#8b9cb3"
            />
          </TouchableOpacity>
        </View>

        {/* Menu items — scrollable, with PM folder in the middle */}
        <ScrollView style={styles.menuArea} showsVerticalScrollIndicator={false}>
          {MENU_ITEMS.map((item, index) => {
            const isActive = activeSection === item.key;
            return (
              <View key={item.key}>
                {/* Insert PM folder before this index */}
                {index === PM_FOLDER_INDEX && (
                  <>
                    <TouchableOpacity
                      style={styles.folderRow}
                      onPress={() => setPmFolderOpen((v) => !v)}
                      activeOpacity={0.6}
                    >
                      <MaterialCommunityIcons
                        name={pmFolderOpen ? "chevron-down" : "chevron-right"}
                        size={20}
                        color="#94a3b8"
                      />
                      <MaterialCommunityIcons
                        name="folder-outline"
                        size={20}
                        color="#f59e0b"
                        style={{ marginLeft: 2, marginRight: 10 }}
                      />
                      <Text style={styles.folderLabel}>Project Management</Text>
                    </TouchableOpacity>
                    <View style={styles.menuDivider} />

                    {pmFolderOpen &&
                      PM_ITEMS.map((pmItem) => {
                        const pmActive = activeSection === pmItem.key;
                        return (
                          <View key={pmItem.key}>
                            <TouchableOpacity
                              style={[
                                styles.menuItem,
                                styles.menuItemIndented,
                                pmActive && styles.menuItemActive,
                              ]}
                              onPress={() => selectSection(pmItem.key)}
                              activeOpacity={0.6}
                            >
                              <MaterialCommunityIcons
                                name={pmItem.icon}
                                size={22}
                                color={pmActive ? "#fff" : "#e2e8f0"}
                                style={styles.menuItemIcon}
                              />
                              <Text
                                style={[
                                  styles.menuItemLabel,
                                  pmActive && styles.menuItemLabelActive,
                                ]}
                              >
                                {pmItem.label}
                              </Text>
                            </TouchableOpacity>
                            <View style={styles.menuDivider} />
                          </View>
                        );
                      })}
                  </>
                )}

                <TouchableOpacity
                  style={[styles.menuItem, isActive && styles.menuItemActive]}
                  onPress={() => selectSection(item.key)}
                  activeOpacity={0.6}
                >
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={24}
                    color={isActive ? "#fff" : "#e2e8f0"}
                    style={styles.menuItemIcon}
                  />
                  <Text
                    style={[
                      styles.menuItemLabel,
                      isActive && styles.menuItemLabelActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
                {index < MENU_ITEMS.length - 1 && (
                  <View style={styles.menuDivider} />
                )}
              </View>
            );
          })}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a2332",
  },

  // Status bar
  statusBarSpacer: {
    height: 38,
    backgroundColor: "#1e2a3a",
  },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 4,
    paddingHorizontal: 12,
    backgroundColor: "#131c27",
  },
  menuButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarCenter: {
    flex: 1,
    marginLeft: 4,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#e2e8f0",
  },
  topBarRight: {
    width: 44,
  },
  topBarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  topBarActionBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  // Content
  content: {
    flex: 1,
  },

  // Placeholder for non-Plans sections
  placeholderView: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#64748b",
  },
  placeholderSubtext: {
    fontSize: 15,
    color: "#475569",
    marginTop: 8,
  },

  // Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 10,
  },

  // Drawer
  drawer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: "#1e2a3a",
    zIndex: 20,
    paddingTop: 38,
  },

  // Drawer header
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 20,
    paddingRight: 8,
    paddingTop: 8,
    paddingBottom: 6,
    backgroundColor: "#131c27",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#2d3d50",
  },
  drawerSiteName: {
    fontSize: 19,
    fontWeight: "600",
    color: "#e2e8f0",
    flex: 1,
    marginRight: 8,
  },
  homeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  // Menu area
  menuArea: {
    flex: 1,
    backgroundColor: "#1e2a3a",
  },

  // Menu items
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  menuItemActive: {
    backgroundColor: "#5a9fd4",
  },
  menuItemIcon: {
    width: 32,
    textAlign: "center",
  },
  menuItemLabel: {
    fontSize: 16,
    color: "#e2e8f0",
    marginLeft: 16,
  },
  menuItemLabelActive: {
    color: "#fff",
    fontWeight: "500",
  },

  // Menu item indented (inside folder)
  menuItemIndented: {
    paddingLeft: 36,
  },

  // Folder row
  folderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  folderLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#94a3b8",
  },

  // Menu divider
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#0a1018",
    marginLeft: 20,
    marginRight: 20,
  },
});
