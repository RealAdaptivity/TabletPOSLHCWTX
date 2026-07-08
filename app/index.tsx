import { Redirect } from "expo-router";
import { useAuth } from "@/lib/auth";

// Entry point: send customers to the portal, guests to login.
export default function Index() {
  const { session } = useAuth();
  return <Redirect href={session ? "/(customer)" : "/(auth)/login"} />;
}
