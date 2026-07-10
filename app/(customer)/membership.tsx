import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, ScreenTitle } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { Membership, MembershipPlan } from "@/lib/database.types";
import { colors, formatCents, radius, spacing } from "@/theme";

export default function MembershipScreen() {
  const { session } = useAuth();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [current, setCurrent] = useState<Membership | null>(null);

  const load = useCallback(async () => {
    const { data: planData } = await supabase
      .from("membership_plans")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    setPlans(planData ?? []);

    if (session) {
      const { data: mem } = await supabase
        .from("memberships")
        .select("*")
        .eq("customer_id", session.user.id)
        .in("status", ["active", "paused", "pending"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setCurrent((mem as Membership) ?? null);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function onSelectPlan(plan: MembershipPlan) {
    // Payments are deferred to the DRB Paetheon integration. Until that API
    // is wired in, purchasing is not available in-app.
    Alert.alert(
      "Coming soon",
      `In-app purchase of the ${plan.name} plan will be enabled once the DRB Paetheon billing integration is connected. For now, sign up in-lane and staff can attach the plan to your account.`,
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenTitle title="Membership" subtitle="Unlimited washes, one monthly price." />

        {current ? (
          <Card style={styles.currentCard}>
            <Text style={styles.currentLabel}>CURRENT PLAN</Text>
            <Text style={styles.currentStatus}>Status: {current.status}</Text>
          </Card>
        ) : null}

        {plans.map((plan) => {
          const mappedName = plan.name === "Express" ? "Good" : plan.name === "Deluxe" ? "Better" : plan.name === "Premium" ? "Best" : plan.name;
          return (
            <Card key={plan.id} style={styles.planCard}>
              <View style={styles.planHeader}>
                <Text style={styles.planName}>{mappedName}</Text>
                <Text style={styles.planPrice}>
                  {formatCents(plan.price_cents)}
                  <Text style={styles.perMonth}>
                    /{plan.billing_period === "annual" ? "yr" : "mo"}
                  </Text>
                </Text>
              </View>
              {plan.description ? <Text style={styles.muted}>{plan.description}</Text> : null}
              <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
                {plan.features.map((f, i) => (
                  <Text key={i} style={styles.feature}>
                    ✓ {f}
                  </Text>
                ))}
              </View>
              <View style={{ marginTop: spacing.md }}>
                <Button title={`Choose ${mappedName}`} onPress={() => onSelectPlan(plan)} />
              </View>
            </Card>
          );
        })}

        <Text style={styles.disclaimer}>
          In-app checkout activates when the DRB Paetheon billing integration is connected.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, gap: spacing.md },
  currentCard: { borderColor: colors.accent },
  currentLabel: { color: colors.accent, fontWeight: "800", fontSize: 12 },
  currentStatus: { color: colors.text, fontSize: 16, marginTop: spacing.xs },
  planCard: { gap: spacing.xs },
  planHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  planName: { color: colors.text, fontSize: 22, fontWeight: "800" },
  planPrice: { color: colors.primary, fontSize: 22, fontWeight: "800" },
  perMonth: { color: colors.textMuted, fontSize: 14, fontWeight: "600" },
  muted: { color: colors.textMuted },
  feature: { color: colors.text },
  disclaimer: {
    color: colors.textFaint,
    fontSize: 12,
    textAlign: "center",
    marginTop: spacing.sm,
    borderRadius: radius.sm,
  },
});
