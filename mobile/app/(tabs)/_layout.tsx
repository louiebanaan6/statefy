import { Tabs, useRouter } from "expo-router";
import { TouchableOpacity, View, Text, Image } from "react-native";
import { useEffect, useState } from "react";
import { Home, Search, PlusCircle, Bell, User } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { colors } from "../../constants/colors";
import api from "../../api/axios";

function BellWithBadge({ color }: { color: string }) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!user) return;
    const fetch = () => api.get("/notifications/unread-count").then(r => setCount(r.data.count)).catch(() => {});
    fetch();
    const t = setInterval(fetch, 30000);
    return () => clearInterval(t);
  }, [user]);
  return (
    <View>
      <Bell size={24} color={color} />
      {count > 0 && (
        <View style={{ position: "absolute", top: -4, right: -4, backgroundColor: colors.primary, borderRadius: 8, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 }}>
          <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>{count > 9 ? "9+" : count}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  const { user } = useAuth();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.secondary,
        tabBarStyle: { borderTopColor: "#f0f0f0", backgroundColor: "#fff" },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        headerStyle: { backgroundColor: "#fff" },
        headerTitleStyle: { fontWeight: "700", color: "#111827" },
        headerTintColor: colors.primary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
          headerTitle: () => (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Image source={require("../../assets/logo.png")} style={{ width: 32, height: 32 }} resizeMode="contain" />
              <Text style={{ fontWeight: "800", fontSize: 18, color: "#111827" }}>Statefy</Text>
            </View>
          ),
          headerRight: () =>
            user ? (
              <TouchableOpacity onPress={() => router.push("/create" as any)} style={{ marginRight: 16 }}>
                <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 14 }}>+ Post</Text>
              </TouchableOpacity>
            ) : null,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{ title: "Discover", tabBarIcon: ({ color }) => <Search size={24} color={color} /> }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "Create",
          tabBarIcon: ({ color }) => <PlusCircle size={24} color={color} />,
          href: user ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          tabBarIcon: ({ color }) => <BellWithBadge color={color} />,
          href: user ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
          href: user ? undefined : null,
        }}
      />
      {/* Settings — hidden from tab bar, but renders within tabs so bar stays visible */}
      <Tabs.Screen
        name="settings"
        options={{ href: null, title: "Edit Profile" }}
      />
      {/* Admin — hidden from tab bar (accessible via Profile > Admin button) */}
      <Tabs.Screen
        name="admin"
        options={{ href: null, title: "Admin Panel" }}
      />
      {/* Statement detail — inside tabs so bottom bar stays visible */}
      <Tabs.Screen
        name="statement/[id]"
        options={{ href: null, headerShown: false }}
      />
    </Tabs>
  );
}
