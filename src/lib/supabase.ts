import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!supabaseUrl || !supabaseAnonKey) {
  // Surface misconfiguration early rather than failing with an opaque 401.
  console.warn(
    "[supabase] Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. " +
      "Copy .env.example to .env.",
  );
}

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
