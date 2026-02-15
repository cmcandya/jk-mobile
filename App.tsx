import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Session } from "@supabase/supabase-js";
import { supabase } from "./src/lib/supabase";
import LoginScreen from "./src/screens/LoginScreen";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
      </View>
    );
  }

  if (!session) {
    return (
      <>
        <LoginScreen />
        <StatusBar style="light" />
      </>
    );
  }

  // Logged in — placeholder for now
  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>Welcome</Text>
      <Text style={styles.email}>{session.user.email}</Text>
      <TouchableOpacity
        style={styles.signOutButton}
        onPress={() => supabase.auth.signOut()}
        activeOpacity={0.8}
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  welcome: {
    fontSize: 28,
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: 8,
  },
  email: {
    fontSize: 16,
    color: "#64748b",
    marginBottom: 32,
  },
  signOutButton: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  signOutText: {
    color: "#94a3b8",
    fontSize: 15,
    fontWeight: "600",
  },
});
