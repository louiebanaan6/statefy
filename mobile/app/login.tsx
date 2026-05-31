import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert,
  ScrollView, StyleSheet, Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Mail, Lock, Eye, EyeOff } from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { colors } from "../constants/colors";

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) { Alert.alert("Error", "Email and password are required"); return; }
    setLoading(true);
    try {
      const result = await login(email.trim().toLowerCase(), password);
      if ("requiresVerification" in result && result.requiresVerification) {
        router.replace({ pathname: "/verify-email", params: { email: result.email } } as any);
      } else {
        router.replace("/");
      }
    } catch (err: any) {
      Alert.alert("Login failed", err.response?.data?.error || "Check your email and password");
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* Top colored section with logo */}
        <View style={s.header}>
          <View style={s.logoCircle}>
            <Image source={require("../assets/logo.png")} style={{ width: 52, height: 52 }} resizeMode="contain" />
          </View>
          <Text style={s.appName}>Statefy</Text>
          <Text style={s.tagline}>Your opinion, voted on.</Text>
        </View>

        {/* Form card */}
        <View style={s.card}>
          <Text style={s.title}>Welcome back</Text>
          <Text style={s.sub}>Sign in to your account</Text>

          <View style={s.fields}>
            {/* Email */}
            <View>
              <Text style={s.label}>Email</Text>
              <View style={s.inputRow}>
                <Mail size={18} color="#9ca3af" style={{ marginRight: 10 }} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  style={s.input}
                />
              </View>
            </View>

            {/* Password */}
            <View>
              <Text style={s.label}>Password</Text>
              <View style={s.inputRow}>
                <Lock size={18} color="#9ca3af" style={{ marginRight: 10 }} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showPw}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  style={[s.input, { flex: 1 }]}
                />
                <TouchableOpacity onPress={() => setShowPw(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  {showPw ? <EyeOff size={18} color="#9ca3af" /> : <Eye size={18} color="#9ca3af" />}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <TouchableOpacity style={{ alignSelf: "flex-end", marginTop: -8, marginBottom: 16 }} onPress={() => router.push("/forgot-password" as any)}>
            <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 13 }}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={[s.btn, { opacity: loading ? 0.75 : 1 }]}
            activeOpacity={0.85}
          >
            <Text style={s.btnText}>{loading ? "Signing in..." : "Sign in"}</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 20 }}>
            <Text style={{ color: colors.secondary, fontSize: 14 }}>No account?</Text>
            <TouchableOpacity onPress={() => router.replace("/register")}>
              <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 14 }}>Create one</Text>
            </TouchableOpacity>
          </View>

          <View style={{ alignItems: "center", marginTop: 24 }}>
            <Text style={{ color: "#9ca3af", fontSize: 12, textAlign: "center" }}>
              By signing in you agree to our{" "}
              <Text
                style={{ color: colors.primary, fontWeight: "600" }}
                onPress={() => router.push("/privacy-policy" as any)}
              >
                Privacy Policy
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  header: {
    backgroundColor: colors.primary,
    paddingTop: 80,
    paddingBottom: 48,
    alignItems: "center",
    gap: 8,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  appName: { fontSize: 28, fontWeight: "900", color: "#fff", letterSpacing: -0.5 },
  tagline: { fontSize: 14, color: "rgba(255,255,255,0.8)", fontWeight: "500" },
  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 48,
  },
  title: { fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 4 },
  sub: { fontSize: 14, color: "#6b7280", marginBottom: 28 },
  fields: { gap: 18, marginBottom: 24 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: "#f9fafb",
  },
  input: { flex: 1, fontSize: 15, color: "#111827", padding: 0 },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
