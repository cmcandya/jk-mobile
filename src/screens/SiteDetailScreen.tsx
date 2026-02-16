import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Pressable,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "SiteDetail">;

const DRAWER_WIDTH = Dimensions.get("window").width * 0.75;

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

const MENU_ITEMS: { key: string; label: string; icon: IconName }[] = [
  { key: "plans", label: "Plans", icon: "view-grid" },
  { key: "specifications", label: "Specifications", icon: "format-list-text" },
  { key: "photos", label: "Photos", icon: "image" },
  { key: "crew", label: "Crew", icon: "account-group" },
  { key: "loto", label: "Lockout / Tagout", icon: "lock" },
];

export default function SiteDetailScreen({ route, navigation }: Props) {
  const { site } = route.params;
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [activeSection, setActiveSection] = useState("plans");
  const [drawerAnim] = useState(new Animated.Value(0));

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
    MENU_ITEMS.find((m) => m.key === activeSection)?.label || "Plans";

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
        <View style={styles.topBarRight} />
      </View>

      {/* Content area */}
      <View style={styles.content}>
        {activeSection === "plans" ? (
          <PlansView />
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

        {/* Menu items — lighter bg, with hairline separators */}
        <View style={styles.menuArea}>
          {MENU_ITEMS.map((item, index) => {
            const isActive = activeSection === item.key;
            return (
              <View key={item.key}>
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
        </View>
      </Animated.View>
    </View>
  );
}

function PlansView() {
  return (
    <View style={styles.plansContainer}>
      <Text style={styles.plansTitle}>Plans</Text>
      <Text style={styles.plansSubtitle}>All tasks on plans</Text>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color="#64748b"
          style={{ marginRight: 10 }}
        />
        <Text style={styles.searchPlaceholder}>Search plans</Text>
      </View>

      {/* Empty state */}
      <View style={styles.plansEmpty}>
        <Text style={styles.plansEmptyText}>No plans uploaded yet</Text>
        <Text style={styles.plansEmptySubtext}>
          Upload plans from the web app to view them here
        </Text>
      </View>
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
    backgroundColor: "#131c27",
  },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 12,
    backgroundColor: "#1a2332",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#2d3d50",
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

  // Drawer header — DARKER background, tight padding
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

  // Menu area — lighter bg than header
  menuArea: {
    flex: 1,
    backgroundColor: "#1e2a3a",
  },

  // Menu items — moderate padding, filled icons
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

  // Subtle dark separator between menu items
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#0a1018",
    marginLeft: 20,
    marginRight: 20,
  },

  // Plans view
  plansContainer: {
    flex: 1,
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  plansTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#e2e8f0",
  },
  plansSubtitle: {
    fontSize: 15,
    color: "#64748b",
    marginTop: 4,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2a3a4e",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 24,
  },
  searchPlaceholder: {
    fontSize: 15,
    color: "#64748b",
  },
  plansEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 100,
  },
  plansEmptyText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#475569",
  },
  plansEmptySubtext: {
    fontSize: 14,
    color: "#3b4c63",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
});
