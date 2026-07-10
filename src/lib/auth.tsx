import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Customer } from "./database.types";

interface AuthState {
  loading: boolean;
  session: Session | null;
  customer: Customer | null;
  /** Points granted for today's login, surfaced once after sign-in. */
  dailyReward: number | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => Promise<void>;
  signOut: () => Promise<void>;
  refreshCustomer: () => Promise<void>;
  clearDailyReward: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const DAILY_LOGIN_POINTS = Number(
  process.env.EXPO_PUBLIC_DAILY_LOGIN_POINTS ?? 5,
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [dailyReward, setDailyReward] = useState<number | null>(null);
  // Guard so the daily-login RPC only fires once per app session.
  const rewardedForUser = useRef<string | null>(null);

  async function loadCustomer(userId: string) {
    const { data } = await supabase
      .from("customers")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    setCustomer(data ?? null);
    return data ?? null;
  }

  // Ensure a customers row exists, then award the once-daily login bonus.
  async function bootstrapCustomer(s: Session) {
    const userId = s.user.id;
    let profile = await loadCustomer(userId);

    if (!profile) {
      await supabase.from("customers").insert({
        id: userId,
        email: s.user.email ?? null,
        first_name: (s.user.user_metadata?.first_name as string) ?? null,
        last_name: (s.user.user_metadata?.last_name as string) ?? null,
      });
      profile = await loadCustomer(userId);
    }

    if (rewardedForUser.current !== userId) {
      rewardedForUser.current = userId;
      const { data: granted, error } = await supabase.rpc("award_daily_login", {
        p_points: DAILY_LOGIN_POINTS,
      });
      if (!error && typeof granted === "number" && granted > 0) {
        setDailyReward(granted);
        await loadCustomer(userId); // reflect new points balance
      }
    }
  }

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        setSession(data.session);
        if (data.session) await bootstrapCustomer(data.session);
      } catch (e) {
        // Never leave the app stuck on the loading spinner if session
        // restore or profile bootstrap fails — fall through to the app.
        console.error("[auth] session init failed:", e);
      } finally {
        if (active) setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        if (newSession) {
          try {
            await bootstrapCustomer(newSession);
          } catch (e) {
            console.error("[auth] bootstrap failed:", e);
          }
        } else {
          setCustomer(null);
          rewardedForUser.current = null;
        }
      },
    );

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      session,
      customer,
      dailyReward,
      clearDailyReward: () => setDailyReward(null),
      refreshCustomer: async () => {
        if (session) await loadCustomer(session.user.id);
      },
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      },
      signUp: async (email, password, firstName, lastName) => {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { first_name: firstName.trim(), last_name: lastName.trim() },
          },
        });
        if (error) throw error;
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [loading, session, customer, dailyReward],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
