import { Link, useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Field } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { colors, spacing } from "@/theme";

// Number of rapid taps on the logo that reveals the hidden CSA entry.
const SECRET_TAPS = 5;
const SECRET_WINDOW_MS = 3000;

export default function Login() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Secret gesture state — taps must land within a short window.
  const tapCount = useRef(0);
  const firstTapAt = useRef(0);

  function onLogoTap() {
    const now = Date.now();
    if (now - firstTapAt.current > SECRET_WINDOW_MS) {
      firstTapAt.current = now;
      tapCount.current = 0;
    }
    tapCount.current += 1;
    if (tapCount.current >= SECRET_TAPS) {
      tapCount.current = 0;
      router.push("/csa/pin");
    }
  }

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      // RouteGuard redirects to the portal on session change.
    } catch (e: any) {
      setError(e?.message ?? "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Pressable onPress={onLogoTap} hitSlop={12}>
            <Image
              source={require("../../assets/longhorn-logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </Pressable>
          <Text style={styles.tagline}>Members wash more. Sign in to your account.</Text>

          <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button title="Sign In" onPress={onSubmit} loading={loading} />
            <Link href="/(auth)/signup" asChild>
              <Pressable style={styles.linkRow}>
                <Text style={styles.muted}>New here? </Text>
                <Text style={styles.link}>Create an account</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: "center",
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
  },
  logo: {
    width: 250,
    aspectRatio: 649 / 317,
    alignSelf: "center",
  },
  tagline: { color: colors.textMuted, textAlign: "center", marginTop: spacing.md },
  error: { color: colors.danger, fontSize: 14 },
  linkRow: { flexDirection: "row", justifyContent: "center", paddingVertical: spacing.sm },
  muted: { color: colors.textMuted },
  link: { color: colors.primary, fontWeight: "700" },
});
