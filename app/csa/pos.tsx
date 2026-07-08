import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, Field, ScreenTitle } from "@/components/ui";
import { useCsa } from "@/lib/csa";
import { supabase } from "@/lib/supabase";
import type { MembershipPlan, SaleType, ShiftSummary } from "@/lib/database.types";
import { colors, formatCents, radius, spacing } from "@/theme";

interface Ticket {
  label: string;
  amountCents: number;
  saleType: SaleType;
  planId?: string;
  points: number;
}

// Single-wash menu (one-time washes rung up at the lane).
const SINGLE_WASHES: Ticket[] = [
  { label: "Express Wash", amountCents: 1000, saleType: "wash", points: 10 },
  { label: "Deluxe Wash", amountCents: 1500, saleType: "wash", points: 15 },
  { label: "Premium Wash", amountCents: 2000, saleType: "wash", points: 20 },
];

export default function Pos() {
  const router = useRouter();
  const { employee, recordSale, shiftSummary, endShift } = useCsa();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [summary, setSummary] = useState<ShiftSummary | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [charging, setCharging] = useState(false);

  // Member details captured on membership sign-ups.
  const [memberOpen, setMemberOpen] = useState(false);
  const [mFirst, setMFirst] = useState("");
  const [mLast, setMLast] = useState("");
  const [mPhone, setMPhone] = useState("");
  const [mEmail, setMEmail] = useState("");
  const [mPlate, setMPlate] = useState("");

  function resetMember() {
    setMFirst("");
    setMLast("");
    setMPhone("");
    setMEmail("");
    setMPlate("");
  }

  // Guard against landing here without a verified PIN (e.g. reload).
  useEffect(() => {
    if (!employee) router.replace("/csa/pin");
  }, [employee]);

  const refresh = useCallback(async () => {
    const s = await shiftSummary();
    setSummary(s);
  }, [shiftSummary]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("membership_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      setPlans(data ?? []);
      refresh();
    })();
  }, []);

  async function charge(member?: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    licensePlate: string;
  }) {
    if (!ticket) return;
    setCharging(true);
    try {
      await recordSale({
        saleType: ticket.saleType,
        amountCents: ticket.amountCents,
        item: ticket.label,
        planId: ticket.planId ?? null,
        paymentMethod: "card",
        points: ticket.points,
        member,
      });
      const label = ticket.label;
      const amount = ticket.amountCents;
      setTicket(null);
      setMemberOpen(false);
      resetMember();
      await refresh();
      Alert.alert("Sale complete", `${label} — ${formatCents(amount)}`);
    } catch (e: any) {
      Alert.alert("Could not record sale", e?.message ?? "Unknown error");
    } finally {
      setCharging(false);
    }
  }

  // Membership sales collect the new member's details before charging.
  function onChargePressed() {
    if (!ticket) return;
    if (ticket.saleType === "membership") {
      setMemberOpen(true);
    } else {
      charge();
    }
  }

  function completeMemberSale() {
    if (!mFirst.trim() || !mLast.trim()) {
      Alert.alert("Member details", "Enter the member's first and last name.");
      return;
    }
    if (!mEmail.trim() && !mPhone.trim()) {
      Alert.alert("Member details", "Enter an email or phone so the membership can sync to their account.");
      return;
    }
    charge({
      firstName: mFirst,
      lastName: mLast,
      phone: mPhone,
      email: mEmail,
      licensePlate: mPlate,
    });
  }

  function confirmEndShift() {
    Alert.alert("End shift", "Sign out of CSA mode?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End shift",
        style: "destructive",
        onPress: () => {
          endShift();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  if (!employee) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.empName}>{employee.name}</Text>
          <Text style={styles.empMeta}>
            {employee.role} · {employee.site ?? "—"}
          </Text>
        </View>
        <Pressable onPress={confirmEndShift} hitSlop={10}>
          <Text style={styles.endShift}>End shift</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Commission / sales tracker */}
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>TODAY'S SALES</Text>
          <View style={styles.summaryRow}>
            <Summary label="Total" value={formatCents(summary?.total_cents ?? 0)} highlight />
            <Summary label="Sales" value={String(summary?.sale_count ?? 0)} />
            <Summary label="Washes" value={String(summary?.wash_count ?? 0)} />
            <Summary label="Memberships" value={String(summary?.membership_count ?? 0)} />
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Single Washes</Text>
        <View style={styles.grid}>
          {SINGLE_WASHES.map((w) => (
            <ProductButton
              key={w.label}
              title={w.label}
              price={formatCents(w.amountCents)}
              active={ticket?.label === w.label}
              onPress={() => setTicket(w)}
            />
          ))}
        </View>

        <Text style={styles.sectionTitle}>Memberships</Text>
        <View style={styles.grid}>
          {plans.map((p) => (
            <ProductButton
              key={p.id}
              title={p.name}
              price={`${formatCents(p.price_cents)}/mo`}
              active={ticket?.planId === p.id}
              onPress={() =>
                setTicket({
                  label: `${p.name} Membership`,
                  amountCents: p.price_cents,
                  saleType: "membership",
                  planId: p.id,
                  points: 50,
                })
              }
            />
          ))}
        </View>
      </ScrollView>

      {/* Checkout bar */}
      {ticket ? (
        <View style={styles.checkout}>
          <View style={styles.paymentRow}>
            <View style={[styles.payChip, styles.payChipActive]}>
              <Text style={[styles.payChipText, styles.payChipTextActive]}>CARD</Text>
            </View>
          </View>
          <View style={styles.checkoutRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.ticketLabel}>{ticket.label}</Text>
              <Text style={styles.ticketAmount}>{formatCents(ticket.amountCents)}</Text>
            </View>
            <View style={{ width: 160 }}>
              <Button
                title={ticket.saleType === "membership" ? "Sign Up" : "Charge"}
                onPress={onChargePressed}
                loading={charging && !memberOpen}
              />
            </View>
          </View>
        </View>
      ) : null}

      {/* Member details for a membership sign-up */}
      <Modal
        visible={memberOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setMemberOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalBackdrop}
        >
          <Card style={styles.modalCard}>
            <ScreenTitle
              title="New member"
              subtitle={ticket ? `${ticket.label} · ${formatCents(ticket.amountCents)}` : undefined}
            />
            <View style={{ gap: spacing.md }}>
              <View style={{ flexDirection: "row", gap: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Field label="First name" value={mFirst} onChangeText={setMFirst} placeholder="Alex" />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Last name" value={mLast} onChangeText={setMLast} placeholder="Rivera" />
                </View>
              </View>
              <Field
                label="Phone"
                value={mPhone}
                onChangeText={setMPhone}
                keyboardType="phone-pad"
                placeholder="(555) 123-4567"
              />
              <Field
                label="Email"
                value={mEmail}
                onChangeText={setMEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="you@example.com"
              />
              <Field
                label="License plate (optional)"
                value={mPlate}
                onChangeText={setMPlate}
                autoCapitalize="characters"
                placeholder="ABC1234"
              />
              <Text style={styles.memberHint}>
                Email or phone links this membership to their app account and syncs to DRB.
              </Text>
              <Button title="Complete Sign-up & Charge" onPress={completeMemberSale} loading={charging} />
              <Button title="Cancel" variant="ghost" onPress={() => setMemberOpen(false)} />
            </View>
          </Card>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function Summary({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={[styles.summaryValue, highlight && { color: colors.accent }]}>{value}</Text>
      <Text style={styles.summarySmall}>{label}</Text>
    </View>
  );
}

function ProductButton({
  title,
  price,
  active,
  onPress,
}: {
  title: string;
  price: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.product, active && styles.productActive]}>
      <Text style={[styles.productTitle, active && { color: colors.onPrimary }]}>{title}</Text>
      <Text style={[styles.productPrice, active && { color: colors.onPrimary }]}>{price}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  empName: { color: colors.text, fontSize: 20, fontWeight: "800" },
  empMeta: { color: colors.textMuted, marginTop: 2 },
  endShift: { color: colors.danger, fontWeight: "700", fontSize: 16 },
  body: { padding: spacing.lg, paddingBottom: 200 },
  summaryCard: { marginBottom: spacing.lg },
  summaryLabel: { color: colors.textMuted, fontWeight: "800", fontSize: 12, marginBottom: spacing.sm },
  summaryRow: { flexDirection: "row" },
  summaryValue: { color: colors.text, fontSize: 20, fontWeight: "800" },
  summarySmall: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  sectionTitle: {
    color: colors.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
    fontSize: 12,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginBottom: spacing.md },
  product: {
    width: 150,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  productActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  productTitle: { color: colors.text, fontWeight: "700", fontSize: 15 },
  productPrice: { color: colors.primary, fontWeight: "800", marginTop: spacing.sm, fontSize: 16 },
  checkout: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  paymentRow: { flexDirection: "row", gap: spacing.sm },
  payChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  payChipActive: { backgroundColor: colors.surfaceAlt, borderColor: colors.primary },
  payChipText: { color: colors.textMuted, fontWeight: "700" },
  payChipTextActive: { color: colors.primary },
  checkoutRow: { flexDirection: "row", alignItems: "center" },
  ticketLabel: { color: colors.text, fontWeight: "700", fontSize: 16 },
  ticketAmount: { color: colors.accent, fontWeight: "800", fontSize: 22, marginTop: 2 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  memberHint: { color: colors.textMuted, fontSize: 12 },
});
