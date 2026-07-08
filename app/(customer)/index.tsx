import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { Membership, MembershipPlan } from "@/lib/database.types";
import { colors, formatCents, spacing } from "@/theme";

type ActiveMembership = Membership & { membership_plans: MembershipPlan | null };

export default function Home() {
  const { customer, session, dailyReward, clearDailyReward, signOut } = useAuth();
  const [membership, setMembership] = useState<ActiveMembership | null>(null);
  const [vehicleCount, setVehicleCount] = useState(0);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data: mem } = await supabase
        .from("memberships")
        .select("*, membership_plans(*)")
        .eq("customer_id", session.user.id)
        .in("status", ["active", "paused", "pending"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setMembership((mem as ActiveMembership) ?? null);

      const { count } = await supabase
        .from("vehicles")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", session.user.id);
      setVehicleCount(count ?? 0);
    })();
  }, [session]);

  const firstName = customer?.first_name ?? "there";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.hello}>Hi {firstName} 👋</Text>
        <Text style={styles.sub}>Welcome back to the wash club.</Text>

        {dailyReward ? (
          <Card style={[styles.rewardBanner]}>
            <Text style={styles.rewardText}>
              🎉 +{dailyReward} points for logging in today!
            </Text>
            <Button title="Nice" variant="ghost" onPress={clearDailyReward} />
          </Card>
        ) : null}

        <View style={styles.statsRow}>
          <Card style={styles.stat}>
            <Text style={styles.statValue}>{customer?.rewards_points ?? 0}</Text>
            <Text style={styles.statLabel}>Reward points</Text>
          </Card>
          <Card style={styles.stat}>
            <Text style={styles.statValue}>{vehicleCount}</Text>
            <Text style={styles.statLabel}>Vehicles</Text>
          </Card>
        </View>

        <Card style={{ marginTop: spacing.md }}>
          <Text style={styles.cardTitle}>Your membership</Text>
          {membership ? (
            <>
              <Text style={styles.planName}>
                {membership.membership_plans?.name ?? "Plan"}
              </Text>
              <Text style={styles.muted}>
                {formatCents(membership.membership_plans?.price_cents)} /{" "}
                {membership.membership_plans?.billing_period ?? "month"} ·{" "}
                <Text style={{ color: statusColor(membership.status) }}>
                  {membership.status}
                </Text>
              </Text>
            </>
          ) : (
            <Text style={styles.muted}>
              No active membership yet. Check the Membership tab to see plans.
            </Text>
          )}
        </Card>

        <View style={{ height: spacing.xl }} />
        <Button title="Sign out" variant="ghost" onPress={signOut} />
      </ScrollView>
    </SafeAreaView>
  );
}

function statusColor(status: string) {
  if (status === "active") return colors.accent;
  if (status === "pending") return colors.primary;
  return colors.textMuted;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg },
  hello: { color: colors.text, fontSize: 26, fontWeight: "800" },
  sub: { color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg },
  rewardBanner: {
    borderColor: colors.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  rewardText: { color: colors.accent, fontWeight: "700", flex: 1 },
  statsRow: { flexDirection: "row", gap: spacing.md },
  stat: { flex: 1, alignItems: "center", paddingVertical: spacing.lg },
  statValue: { color: colors.primary, fontSize: 30, fontWeight: "800" },
  statLabel: { color: colors.textMuted, marginTop: spacing.xs },
  cardTitle: { color: colors.textMuted, fontSize: 13, fontWeight: "700", textTransform: "uppercase" },
  planName: { color: colors.text, fontSize: 22, fontWeight: "800", marginTop: spacing.xs },
  muted: { color: colors.textMuted, marginTop: spacing.xs },
});
