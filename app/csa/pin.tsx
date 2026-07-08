import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCsa } from "@/lib/csa";
import { colors, radius, spacing } from "@/theme";

const PIN_LENGTH = 4;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

export default function CsaPin() {
  const router = useRouter();
  const { verifyPin } = useCsa();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function submit(candidate: string) {
    setChecking(true);
    setError(null);
    try {
      const emp = await verifyPin(candidate);
      if (emp) {
        setPin("");
        router.replace("/csa/pos");
      } else {
        setError("PIN not recognized.");
        setPin("");
      }
    } catch (e: any) {
      setError(e?.message ?? "Verification failed.");
      setPin("");
    } finally {
      setChecking(false);
    }
  }

  function press(key: string) {
    if (checking) return;
    if (key === "⌫") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (key === "" ) return;
    const next = (pin + key).slice(0, PIN_LENGTH);
    setPin(next);
    if (next.length === PIN_LENGTH) submit(next);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace("/(auth)/login")} hitSlop={12}>
          <Text style={styles.exit}>✕ Exit</Text>
        </Pressable>
        <Text style={styles.badge}>CSA MODE</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>Employee PIN</Text>
        <Text style={styles.subtitle}>Enter your {PIN_LENGTH}-digit PIN to start a shift.</Text>

        <View style={styles.dots}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i < pin.length && styles.dotFilled]}
            />
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : <View style={{ height: 20 }} />}

        <View style={styles.keypad}>
          {KEYS.map((k, i) => (
            <Pressable
              key={i}
              onPress={() => press(k)}
              style={({ pressed }) => [
                styles.key,
                k === "" && styles.keyEmpty,
                pressed && k !== "" && styles.keyPressed,
              ]}
              disabled={k === ""}
            >
              <Text style={styles.keyText}>{k}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const KEY_SIZE = 74;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  exit: { color: colors.textMuted, fontSize: 16, fontWeight: "600" },
  badge: {
    color: colors.primary,
    fontWeight: "900",
    letterSpacing: 2,
    fontSize: 12,
  },
  body: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: spacing.xl },
  title: { color: colors.text, fontSize: 24, fontWeight: "800" },
  subtitle: { color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg },
  dots: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
  },
  dotFilled: { backgroundColor: colors.primary, borderColor: colors.primary },
  error: { color: colors.danger, height: 20 },
  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: KEY_SIZE * 3 + spacing.md * 2,
    gap: spacing.md,
    justifyContent: "center",
    marginTop: spacing.md,
  },
  key: {
    width: KEY_SIZE,
    height: KEY_SIZE,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  keyEmpty: { backgroundColor: "transparent", borderColor: "transparent" },
  keyPressed: { backgroundColor: colors.surfaceAlt },
  keyText: { color: colors.text, fontSize: 26, fontWeight: "700" },
});
