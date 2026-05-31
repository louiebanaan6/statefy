import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, Text, Image, ActivityIndicator } from "react-native";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { colors } from "../constants/colors";

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const [minWait, setMinWait] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const t = setTimeout(() => setMinWait(false), 3000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (loading || minWait) return;
    const publicRoutes = ["login", "register", "verify-email", "forgot-password", "privacy-policy"];
    const inPublicRoute = publicRoutes.includes(segments[0] as string);
    if (!user && !inPublicRoute) {
      router.replace("/login");
    } else if (user && (segments[0] === "login" || segments[0] === "register")) {
      router.replace("/");
    }
  }, [user, loading, minWait, segments]);

  if (loading || minWait) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#ffffff" }}>
        <Image source={require("../assets/logo.png")} style={{ width: 90, height: 90, marginBottom: 16 }} resizeMode="contain" />
        <Text style={{ fontSize: 28, fontWeight: "800", color: colors.nearBlack, letterSpacing: -0.5 }}>Statefy</Text>
        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 32 }} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{
      headerTintColor: colors.primary,
      headerTitleStyle: { fontWeight: "700", color: colors.nearBlack },
      headerBackTitle: "Back",
    }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="verify-email" options={{ headerShown: false }} />
      <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
      <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
      <Stack.Screen name="user/[username]" options={{ title: "Profile" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootLayoutNav />
    </AuthProvider>
  );
}
