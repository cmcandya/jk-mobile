import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://uuyewnoocyixkrcnmigz.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1eWV3bm9vY3lpeGtyY25taWd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNjgwMTEsImV4cCI6MjA4Mjk0NDAxMX0.y_1se_N0kKmueWx8aNAtcsHb2xOwq6nwaCAQaTs3SwU";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
