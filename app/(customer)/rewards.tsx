import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card, ScreenTitle } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { RewardTransaction } from "@/lib/database.types";
import { colors, spacing } from "@/theme";

const REASON_LABELS: Record<string, string> = {
  signup_bonus: "Sign-up bonus",
  daily_login: "Daily login",
  wash_purchase: "Wash purchase",
  membership_purchase: "Membership purchase",
  redemption: "Redeemed reward",
};

export default function Rewards() {
  const { customer, session, refreshCustomer } = useAuth();
  const [txns, setTxns] = useState<RewardTransaction[]>([]);

  const load = useCallback(async () => {
    if (!session) return;
    await refreshCustomer();
    const { data } = await supabase
      .from("reward_transactions")
      .select("*")
      .eq("customer_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setTxns(data ?? []);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        <ScreenTitle title="Rewards" subtitle="Earn points on every wash and login." />

        <Card style={styles.balanceCard}>
          <Text style={styles.balanceValue}>{customer?.rewards_points ?? 0}</Text>
          <Text style={styles.balanceLabel}>points available</Text>
        </Card>

        <Text style={styles.historyHeader}>Activity</Text>
        <FlatList
          data={txns}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ gap: spacing.sm, paddingBottom: 40 }}
          ListEmptyComponent={<Text style={styles.muted}>No activity yet.</Text>}
          renderItem={({ item }) => (
            <Card style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.reason}>
                  {REASON_LABELS[item.reason] ?? item.reason}
                </Text>
                <Text style={styles.muted}>
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>
              <Text style={[styles.points, { color: item.points >= 0 ? colors.accent : colors.danger }]}>
                {item.points >= 0 ? "+" : ""}
                {item.points}
              </Text>
            </Card>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, padding: spacing.lg },
  balanceCard: { alignItems: "center", paddingVertical: spacing.xl, borderColor: colors.accent },
  balanceValue: { color: colors.accent, fontSize: 44, fontWeight: "900" },
  balanceLabel: { color: colors.textMuted, marginTop: spacing.xs },
  historyHeader: {
    color: colors.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
    fontSize: 12,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: "row", alignItems: "center" },
  reason: { color: colors.text, fontWeight: "700", fontSize: 15 },
  muted: { color: colors.textMuted, marginTop: 2 },
  points: { fontSize: 18, fontWeight: "800" },
});
