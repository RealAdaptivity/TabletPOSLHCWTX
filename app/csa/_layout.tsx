import { Stack } from "expo-router";
import { CsaProvider } from "@/lib/csa";
import { colors } from "@/theme";

export default function CsaLayout() {
  return (
    <CsaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      />
    </CsaProvider>
  );
}
