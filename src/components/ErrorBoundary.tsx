import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@/theme";

interface State {
  error: Error | null;
}

/**
 * Catches JavaScript errors anywhere in the child tree and renders the message
 * + stack on-screen instead of crashing to a blank screen. This makes release
 * / TestFlight crashes diagnosable without a device console — screenshot the
 * screen and the stack trace points straight at the cause.
 *
 * NOTE: cannot catch errors thrown during module import (before render) or
 * native crashes — those still need the device crash log.
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Surfaced in device logs / EAS if a console is attached.
    console.error("[ErrorBoundary] app crash:", error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>
            Please screenshot this screen and send it to the developer.
          </Text>
          <Text style={styles.label}>Error</Text>
          <Text style={styles.message}>{error.message || String(error)}</Text>
          {error.stack ? (
            <>
              <Text style={styles.label}>Stack</Text>
              <Text style={styles.stack}>{error.stack}</Text>
            </>
          ) : null}
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: 80, gap: spacing.sm },
  title: { color: colors.danger, fontSize: 22, fontWeight: "800" },
  subtitle: { color: colors.textMuted, marginBottom: spacing.md },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: spacing.md,
  },
  message: { color: colors.text, fontSize: 15, fontWeight: "600" },
  stack: { color: colors.textMuted, fontSize: 11, fontFamily: "Courier" },
});
