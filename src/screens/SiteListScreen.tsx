import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type Site = {
  id: string;
  site_name: string;
  job_number: string | null;
  address: string | null;
  status: string | null;
};

type Props = {
  session: Session;
};

export default function SiteListScreen({ session }: Props) {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<string>("admin");

  const loadSites = useCallback(async () => {
    const userId = session.user.id;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    const userRole = profile?.role || "admin";
    setRole(userRole);

    let siteData: Site[] = [];

    if (userRole === "admin") {
      const { data } = await supabase
        .from("job_sites")
        .select("id, site_name, job_number, address, status")
        .neq("status", "archived")
        .order("site_name");
      siteData = (data as Site[]) || [];
    } else {
      const { data } = await supabase
        .from("user_job_sites")
        .select("job_sites(id, site_name, job_number, address, status)")
        .eq("user_id", userId)
        .eq("archived", false);

      siteData =
        (data || [])
          .map((row: any) => row.job_sites)
          .filter(Boolean)
          .filter((s: Site) => s.status !== "archived") || [];

      siteData.sort((a, b) => a.site_name.localeCompare(b.site_name));
    }

    setSites(siteData);
  }, [session]);

  useEffect(() => {
    loadSites().finally(() => setLoading(false));
  }, [loadSites]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSites();
    setRefreshing(false);
  }, [loadSites]);

  const filtered = search.trim()
    ? sites.filter(
        (s) =>
          s.site_name.toLowerCase().includes(search.toLowerCase()) ||
          s.job_number?.toLowerCase().includes(search.toLowerCase())
      )
    : sites;

  const renderSite = ({ item, index }: { item: Site; index: number }) => (
    <TouchableOpacity style={styles.row} activeOpacity={0.6}>
      <Text style={styles.siteName} numberOfLines={1}>
        {item.site_name}
      </Text>
      {item.job_number ? (
        <Text style={styles.jobNumber}>{item.job_number}</Text>
      ) : null}
      {index < filtered.length - 1 && <View style={styles.divider} />}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4a90d9" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.statusBarSpacer} />
      <View style={styles.topBar}>
        <Image
          source={require("../../assets/logo.png")}
          style={styles.logo}
        />
        <View style={styles.topBarActions}>
          <TouchableOpacity
            style={styles.topBarButton}
            onPress={() => {
              setSearchVisible(!searchVisible);
              if (searchVisible) setSearch("");
            }}
            activeOpacity={0.6}
          >
            <Text style={styles.topBarIcon}>⌕</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.topBarButton}
            onPress={() => supabase.auth.signOut()}
            activeOpacity={0.6}
          >
            <Text style={styles.topBarIcon}>⋮</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar (toggleable) */}
      {searchVisible && (
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search projects"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />
        </View>
      )}

      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>SITES ON DEVICE</Text>
      </View>

      {/* Site list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderSite}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4a90d9"
            colors={["#4a90d9"]}
            progressBackgroundColor="#1e293b"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {search ? "No matching sites" : "No sites assigned"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a2332",
  },
  centered: {
    flex: 1,
    backgroundColor: "#1a2332",
    alignItems: "center",
    justifyContent: "center",
  },

  // Status bar spacer
  statusBarSpacer: {
    height: 38,
    backgroundColor: "#131c27",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#2d3d50",
  },

  // Top bar (logo area — lighter than rows, like FieldWire)
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 6,
    paddingLeft: 10,
    paddingRight: 16,
    backgroundColor: "#222f3e",
  },
  logo: {
    height: 44,
    width: 107,
    resizeMode: "contain",
  },
  topBarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  topBarButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarIcon: {
    fontSize: 28,
    color: "#94a3b8",
  },

  // Search
  searchBar: {
    backgroundColor: "#1e2a3a",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchInput: {
    backgroundColor: "#2a3a4e",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#f1f5f9",
  },

  // Section header
  sectionHeader: {
    backgroundColor: "#0f172a",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#7d8fa3",
    letterSpacing: 0.8,
  },

  // Rows
  row: {
    paddingHorizontal: 40,
    paddingVertical: 16,
  },
  siteName: {
    fontSize: 16,
    color: "#e2e8f0",
    fontWeight: "400",
  },
  jobNumber: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 3,
  },
  divider: {
    position: "absolute",
    bottom: 0,
    left: 16,
    right: 16,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#2d3d50",
  },

  // Empty
  emptyState: {
    paddingTop: 60,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
    color: "#64748b",
  },
});
