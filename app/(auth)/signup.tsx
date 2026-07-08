import { useRouter } from "expo-router";
import { useState } from "react";
import {
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

export default function SignUp() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    setNotice(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password, firstName, lastName);
      // If email confirmation is on, there's no session yet.
      setNotice("Account created. If prompted, confirm your email, then sign in.");
    } catch (e: any) {
      setError(e?.message ?? "Unable to create account.");
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
          <Text style={styles.h1}>Create your account</Text>
          <Text style={styles.muted}>Join the wash club and start earning rewards.</Text>

          <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
            <View style={{ flexDirection: "row", gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Field label="First name" value={firstName} onChangeText={setFirstName} placeholder="Alex" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Last name" value={lastName} onChangeText={setLastName} placeholder="Rivera" />
              </View>
            </View>
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
              placeholder="At least 6 characters"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {notice ? <Text style={styles.notice}>{notice}</Text> : null}
            <Button title="Create Account" onPress={onSubmit} loading={loading} />
            <Pressable style={styles.linkRow} onPress={() => router.back()}>
              <Text style={styles.muted}>Already a member? </Text>
              <Text style={styles.link}>Sign in</Text>
            </Pressable>
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
  h1: { color: colors.text, fontSize: 26, fontWeight: "800" },
  muted: { color: colors.textMuted, marginTop: spacing.xs },
  error: { color: colors.danger, fontSize: 14 },
  notice: { color: colors.accent, fontSize: 14 },
  linkRow: { flexDirection: "row", justifyContent: "center", paddingVertical: spacing.sm },
  link: { color: colors.primary, fontWeight: "700" },
});
