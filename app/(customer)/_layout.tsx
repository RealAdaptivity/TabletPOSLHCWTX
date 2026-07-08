import { Tabs } from "expo-router";
import { Text } from "react-native";
import { colors } from "@/theme";

function TabIcon({ icon, color }: { icon: string; color: string }) {
  return <Text style={{ fontSize: 20, color }}>{icon}</Text>;
}

export default function CustomerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <TabIcon icon="🏠" color={color} />,
        }}
      />
      <Tabs.Screen
        name="vehicles"
        options={{
          title: "Vehicles",
          tabBarIcon: ({ color }) => <TabIcon icon="🚗" color={color} />,
        }}
      />
      <Tabs.Screen
        name="membership"
        options={{
          title: "Membership",
          tabBarIcon: ({ color }) => <TabIcon icon="⭐" color={color} />,
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: "Rewards",
          tabBarIcon: ({ color }) => <TabIcon icon="🎁" color={color} />,
        }}
      />
    </Tabs>
  );
}
