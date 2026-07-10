import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

// These are *publishable* (RLS-protected) client keys — safe to ship in the
// bundle. We fall back to them so a release build never constructs the client
// with an empty URL (supabase-js throws "supabaseUrl is required" on empty,
// which would crash the app at launch when EXPO_PUBLIC_* env vars aren't baked
// into the build). Overridable via env / eas.json for other environments.
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || "https://pbgatghmutejbsmcedsw.supabase.co";
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_WwJQsA6iuQcMiCP6vZWMgw_71wB5smo";

// Untyped client: domain types live in ./database.types and are applied at
// call sites via explicit casts. Regenerate a full typed schema later with
// `supabase gen types typescript` if stricter query typing is wanted.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // On web there is no window during SSR bundling; guard storage access.
    storage: Platform.OS === "web" ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
