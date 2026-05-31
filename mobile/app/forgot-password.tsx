import { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert,
  ScrollView, StyleSheet, Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Mail, Lock, Eye, EyeOff } from "lucide-react-native";
import api from "../api/axios";
import { colors } from "../constants/colors";

type Step = "email" | "code" | "password";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
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

  const handleSendCode = async () => {
    if (!email.trim()) { Alert.alert("Error", "Enter your email address"); return; }
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim().toLowerCase() });
      startCooldown();
      setStep("code");
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.error || "Failed to send code");
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim().toLowerCase() });
      startCooldown();
      Alert.alert("Code sent", "A new code has been sent to your email");
    } catch { } finally { setLoading(false); }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) { Alert.alert("Error", "Enter the 6-digit code"); return; }
    setLoading(true);
    try {
      await api.post("/auth/check-reset-code", { email: email.trim().toLowerCase(), code });
      setStep("password");
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.error || "Incorrect code");
    } finally { setLoading(false); }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) { Alert.alert("Error", "Fill in all fields"); return; }
    if (newPassword.length < 8) { Alert.alert("Error", "Password must be at least 8 characters"); return; }
    if (newPassword !== confirmPassword) { Alert.alert("Error", "Passwords don't match"); return; }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        email: email.trim().toLowerCase(),
        code,
        new_password: newPassword,
      });
      Alert.alert("Password reset!", "You can now sign in with your new password.", [
        { text: "Sign in", onPress: () => router.replace("/login") },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.error || "Failed to reset password");
      if (err.response?.data?.error?.includes("expired") || err.response?.data?.error?.includes("Incorrect")) {
        setStep("code");
        setCode("");
      }
    } finally { setLoading(false); }
  };

  const renderStep = () => {
    if (step === "email") {
      return (
        <>
          <Text style={s.title}>Forgot password?</Text>
          <Text style={s.sub}>Enter your email and we'll send you a reset code.</Text>
          <View style={s.fields}>
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
                  style={s.input}
                />
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={handleSendCode} disabled={loading} style={[s.btn, { opacity: loading ? 0.75 : 1 }]} activeOpacity={0.85}>
            <Text style={s.btnText}>{loading ? "Sending..." : "Send code"}</Text>
          </TouchableOpacity>
        </>
      );
    }

    if (step === "code") {
      return (
        <>
          <Text style={s.title}>Enter the code</Text>
          <Text style={s.sub}>
            We sent a 6-digit code to{"\n"}
            <Text style={{ fontWeight: "700", color: colors.nearBlack }}>{email}</Text>
          </Text>
          <View style={s.fields}>
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
          <TouchableOpacity onPress={handleVerifyCode} disabled={loading || code.length !== 6} style={[s.btn, { opacity: (loading || code.length !== 6) ? 0.6 : 1 }]} activeOpacity={0.85}>
            <Text style={s.btnText}>{loading ? "Checking..." : "Continue"}</Text>
          </TouchableOpacity>
          <View style={{ alignItems: "center", marginTop: 16 }}>
            <TouchableOpacity onPress={handleResend} disabled={loading || cooldown > 0}>
              <Text style={{ color: cooldown > 0 ? "#9ca3af" : colors.primary, fontWeight: "700", fontSize: 14 }}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      );
    }

    return (
      <>
        <Text style={s.title}>New password</Text>
        <Text style={s.sub}>Choose a strong password for your account.</Text>
        <View style={s.fields}>
          <View>
            <Text style={s.label}>New password</Text>
            <View style={s.inputRow}>
              <Lock size={18} color="#9ca3af" style={{ marginRight: 10 }} />
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Min 8 characters"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPw}
                style={[s.input, { flex: 1 }]}
              />
              <TouchableOpacity onPress={() => setShowPw(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                {showPw ? <EyeOff size={18} color="#9ca3af" /> : <Eye size={18} color="#9ca3af" />}
              </TouchableOpacity>
            </View>
          </View>
          <View>
            <Text style={s.label}>Confirm password</Text>
            <View style={s.inputRow}>
              <Lock size={18} color="#9ca3af" style={{ marginRight: 10 }} />
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repeat your password"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showConfirm}
                style={[s.input, { flex: 1 }]}
              />
              <TouchableOpacity onPress={() => setShowConfirm(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                {showConfirm ? <EyeOff size={18} color="#9ca3af" /> : <Eye size={18} color="#9ca3af" />}
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <TouchableOpacity onPress={handleResetPassword} disabled={loading} style={[s.btn, { opacity: loading ? 0.75 : 1 }]} activeOpacity={0.85}>
          <Text style={s.btnText}>{loading ? "Resetting..." : "Reset password"}</Text>
        </TouchableOpacity>
      </>
    );
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
          {/* Step indicator */}
          <View style={s.stepRow}>
            {(["email", "code", "password"] as Step[]).map((s2, i) => (
              <View key={s2} style={[s.stepDot, step === s2 && s.stepDotActive, (step === "code" && i === 0) || (step === "password" && i < 2) ? s.stepDotDone : {}]} />
            ))}
          </View>

          {renderStep()}

          <TouchableOpacity onPress={() => router.replace("/login")} style={{ alignItems: "center", marginTop: 24 }}>
            <Text style={{ color: colors.secondary, fontSize: 14 }}>Back to <Text style={{ color: colors.primary, fontWeight: "700" }}>Sign in</Text></Text>
          </TouchableOpacity>
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
  stepRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 28 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#e5e7eb" },
  stepDotActive: { backgroundColor: colors.primary, width: 24 },
  stepDotDone: { backgroundColor: colors.primary },
  title: { fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 8 },
  sub: { fontSize: 14, color: "#6b7280", marginBottom: 24, lineHeight: 20 },
  fields: { gap: 18, marginBottom: 24 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 },
  inputRow: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: "#f9fafb" },
  input: { flex: 1, fontSize: 15, color: "#111827", padding: 0 },
  codeInput: { borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 14, paddingVertical: 18, paddingHorizontal: 24, backgroundColor: "#f9fafb", fontSize: 32, fontWeight: "800", letterSpacing: 14, textAlign: "center", color: "#111827" },
  btn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center", shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
