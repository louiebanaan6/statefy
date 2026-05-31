import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert,
  ScrollView, StyleSheet, Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Mail, User, AtSign, Lock, Eye, EyeOff } from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { colors } from "../constants/colors";

export default function RegisterScreen() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: "", display_name: "", username: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleRegister = async () => {
    const { email, display_name, username, password } = form;
    if (!email || !display_name || !username || !password) { Alert.alert("Error", "All fields are required"); return; }
    setLoading(true);
    try {
      const result = await register(email.trim().toLowerCase(), username.trim(), display_name.trim(), password);
      router.replace({ pathname: "/verify-email", params: { email: result.email } } as any);
    } catch (err: any) {
      Alert.alert("Sign up failed", err.response?.data?.error || "Please try again");
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false}>
        <View style={s.header}>
          <View style={s.logoCircle}><Image source={require("../assets/logo.png")} style={{ width: 52, height: 52 }} resizeMode="contain" /></View>
          <Text style={s.appName}>Statefy</Text>
          <Text style={s.tagline}>Your opinion, voted on.</Text>
        </View>

        <View style={s.card}>
          <Text style={s.title}>Create account</Text>
          <Text style={s.sub}>Join the conversation</Text>

          <View style={s.fields}>
            <View>
              <Text style={s.label}>Email</Text>
              <View style={s.inputRow}>
                <Mail size={18} color="#9ca3af" style={{ marginRight: 10 }} />
                <TextInput value={form.email} onChangeText={v => f("email", v)} placeholder="you@example.com" placeholderTextColor="#9ca3af" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} style={s.input} />
              </View>
            </View>

            <View>
              <Text style={s.label}>Display name</Text>
              <View style={s.inputRow}>
                <User size={18} color="#9ca3af" style={{ marginRight: 10 }} />
                <TextInput value={form.display_name} onChangeText={v => f("display_name", v)} placeholder="Your name" placeholderTextColor="#9ca3af" maxLength={30} style={s.input} />
              </View>
            </View>

            <View>
              <Text style={s.label}>Username</Text>
              <View style={s.inputRow}>
                <AtSign size={18} color="#9ca3af" style={{ marginRight: 10 }} />
                <TextInput value={form.username} onChangeText={v => f("username", v.replace(/[^a-zA-Z0-9_]/g, ""))} placeholder="yourhandle" placeholderTextColor="#9ca3af" autoCapitalize="none" maxLength={20} style={s.input} />
              </View>
              <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 5, marginLeft: 2 }}>3-20 chars · letters, numbers, underscores</Text>
            </View>

            <View>
              <Text style={s.label}>Password</Text>
              <View style={s.inputRow}>
                <Lock size={18} color="#9ca3af" style={{ marginRight: 10 }} />
                <TextInput value={form.password} onChangeText={v => f("password", v)} placeholder="Min 8 characters" placeholderTextColor="#9ca3af" secureTextEntry={!showPw} style={[s.input, { flex: 1 }]} />
                <TouchableOpacity onPress={() => setShowPw(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  {showPw ? <EyeOff size={18} color="#9ca3af" /> : <Eye size={18} color="#9ca3af" />}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <TouchableOpacity onPress={handleRegister} disabled={loading} style={[s.btn, { opacity: loading ? 0.75 : 1 }]} activeOpacity={0.85}>
            <Text style={s.btnText}>{loading ? "Creating account..." : "Create account"}</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 20 }}>
            <Text style={{ color: "#6b7280", fontSize: 14 }}>Already have an account?</Text>
            <TouchableOpacity onPress={() => router.replace("/login")}>
              <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 14 }}>Sign in</Text>
            </TouchableOpacity>
          </View>

          <View style={{ alignItems: "center", marginTop: 24 }}>
            <Text style={{ color: "#9ca3af", fontSize: 12, textAlign: "center" }}>
              By creating an account you agree to our{" "}
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
  header: { backgroundColor: colors.primary, paddingTop: 80, paddingBottom: 48, alignItems: "center", gap: 8 },
  logoCircle: { width: 80, height: 80, borderRadius: 20, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", marginBottom: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  appName: { fontSize: 28, fontWeight: "900", color: "#fff", letterSpacing: -0.5 },
  tagline: { fontSize: 14, color: "rgba(255,255,255,0.8)", fontWeight: "500" },
  card: { flex: 1, backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -20, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 4 },
  sub: { fontSize: 14, color: "#6b7280", marginBottom: 28 },
  fields: { gap: 18, marginBottom: 24 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 },
  inputRow: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: "#f9fafb" },
  input: { flex: 1, fontSize: 15, color: "#111827", padding: 0, letterSpacing: 0 },
  btn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center", shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
