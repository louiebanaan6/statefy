import { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert,
  ScrollView, StyleSheet, Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Mail } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { colors } from "../constants/colors";

export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { setCurrentUser } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startCooldown = () => {
    setCooldown(60);
    timerRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleVerify = async () => {
    if (code.length !== 6) { Alert.alert("Error", "Enter the 6-digit code"); return; }
    setLoading(true);
    try {
      const res = await api.post("/auth/verify-email", { email, code });
      await AsyncStorage.setItem("statefy_token", res.data.token);
      setCurrentUser(res.data.user);
      router.replace("/");
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.error || "Verification failed");
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setResending(true);
    try {
      await api.post("/auth/resend-code", { email, type: "verify_email" });
      startCooldown();
      Alert.alert("Code sent", "A new code has been sent to your email");
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.error || "Failed to resend code");
    } finally { setResending(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false}>
        <View style={s.header}>
          <View style={s.logoCircle}>
            <Image source={require("../assets/logo.png")} style={{ width: 52, height: 52 }} resizeMode="contain" />
          </View>
          <Text style={s.appName}>Statefy</Text>
          <Text style={s.tagline}>Your opinion, voted on.</Text>
        </View>

        <View style={s.card}>
          <View style={s.iconRow}>
            <View style={s.iconBg}>
              <Mail size={28} color={colors.primary} />
            </View>
          </View>

          <Text style={s.title}>Check your email</Text>
          <Text style={s.sub}>
            We sent a 6-digit code to{"\n"}
            <Text style={{ fontWeight: "700", color: colors.nearBlack }}>{email}</Text>
          </Text>

          <View style={s.codeWrap}>
            <TextInput
              value={code}
              onChangeText={v => setCode(v.replace(/[^0-9]/g, "").slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
              placeholderTextColor="#d1d5db"
              style={s.codeInput}
              autoFocus
            />
          </View>

          <TouchableOpacity
            onPress={handleVerify}
            disabled={loading || code.length !== 6}
            style={[s.btn, { opacity: (loading || code.length !== 6) ? 0.6 : 1 }]}
            activeOpacity={0.85}
          >
            <Text style={s.btnText}>{loading ? "Verifying..." : "Verify email"}</Text>
          </TouchableOpacity>

          <View style={{ alignItems: "center", marginTop: 20 }}>
            <Text style={{ color: colors.secondary, fontSize: 14, marginBottom: 8 }}>Didn't receive a code?</Text>
            <TouchableOpacity onPress={handleResend} disabled={resending || cooldown > 0}>
              <Text style={{ color: cooldown > 0 ? "#9ca3af" : colors.primary, fontWeight: "700", fontSize: 14 }}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? "Sending..." : "Resend code"}
              </Text>
            </TouchableOpacity>
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
    width: 80, height: 80, borderRadius: 20, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center", marginBottom: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  appName: { fontSize: 28, fontWeight: "900", color: "#fff", letterSpacing: -0.5 },
  tagline: { fontSize: 14, color: "rgba(255,255,255,0.8)", fontWeight: "500" },
  card: {
    flex: 1, backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -20, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 48,
  },
  iconRow: { alignItems: "center", marginBottom: 20 },
  iconBg: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: "#fff0f3",
    alignItems: "center", justifyContent: "center",
  },
  title: { fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 8, textAlign: "center" },
  sub: { fontSize: 14, color: "#6b7280", marginBottom: 28, textAlign: "center", lineHeight: 20 },
  codeWrap: { marginBottom: 24 },
  codeInput: {
    borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 14, paddingVertical: 18,
    paddingHorizontal: 24, backgroundColor: "#f9fafb", fontSize: 32, fontWeight: "800",
    letterSpacing: 14, textAlign: "center", color: "#111827",
  },
  btn: {
    backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center",
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
