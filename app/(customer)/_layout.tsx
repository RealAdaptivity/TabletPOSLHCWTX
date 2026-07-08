import React from "react";
import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@/theme";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

// Active tab uses the solid glyph, inactive uses the outline — the iOS convention.
const ICONS: Record<string, { on: IconName; off: IconName }> = {
  index: { on: "home-variant", off: "home-variant-outline" },
  vehicles: { on: "car", off: "car-outline" },
  membership: { on: "crown", off: "crown-outline" },
  rewards: { on: "gift", off: "gift-outline" },
};

export default function CustomerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      {(["index", "vehicles", "membership", "rewards"] as const).map((name) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title:
              name === "index"
                ? "Home"
                : name.charAt(0).toUpperCase() + name.slice(1),
            tabBarIcon: ({ color, size, focused }) => (
              <MaterialCommunityIcons
                name={focused ? ICONS[name].on : ICONS[name].off}
                size={size ?? 24}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
