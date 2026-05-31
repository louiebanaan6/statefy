import { useState, useRef, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft, Shield, FileText } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { colors, card } from "../../constants/colors";
import UserAvatar from "../../components/UserAvatar";

export default function SettingsScreen() {
  const { user, logout, updateUser } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    display_name: user?.display_name || "",
    username: user?.username || "",
    bio: user?.bio || "",
    new_password: "",
    confirm_password: "",
  });
  const [avatar, setAvatar] = useState<string | null>(user?.avatar_url || null);
  const [loading, setLoading] = useState(false);
  const [pwCode, setPwCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

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

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission needed", "Allow photo access to change your avatar"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true });
    if (!result.canceled && result.assets[0].base64) setAvatar(`data:image/jpeg;base64,${result.assets[0].base64}`);
  };

  const handleSendCode = async () => {
    if (cooldown > 0) return;
    setSendingCode(true);
    try {
      await api.post("/auth/send-password-change-code");
      setCodeSent(true);
      startCooldown();
      Alert.alert("Code sent", `A verification code was sent to ${user?.email}`);
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.error || "Failed to send code");
    } finally { setSendingCode(false); }
  };

  const handleSave = async () => {
    if (form.new_password && form.new_password !== form.confirm_password) { Alert.alert("Error", "Passwords don't match"); return; }
    if (form.new_password && !pwCode) { Alert.alert("Error", "Enter the verification code sent to your email"); return; }
    const updates: Record<string, any> = {};
    if (form.display_name !== user?.display_name) updates.display_name = form.display_name;
    if (form.username !== user?.username) updates.username = form.username;
    if (form.bio !== (user?.bio || "")) updates.bio = form.bio;
    if (avatar !== user?.avatar_url) updates.avatar_url = avatar;
    if (form.new_password) { updates.new_password = form.new_password; updates.password_code = pwCode; }
    if (!Object.keys(updates).length) { Alert.alert("No changes", "Nothing to save"); return; }
    setLoading(true);
    try {
      const res = await api.put("/users/me", updates);
      updateUser(res.data.user);
      setForm(p => ({ ...p, new_password: "", confirm_password: "" }));
      setPwCode("");
      setCodeSent(false);
      Alert.alert("Saved!", "Profile updated");
    } catch (err: any) { Alert.alert("Error", err.response?.data?.error || "Failed"); }
    finally { setLoading(false); }
  };

  const handleLogout = () => Alert.alert("Log out", "Are you sure?", [
    { text: "Cancel", style: "cancel" },
    { text: "Log out", style: "destructive", onPress: () => { logout(); router.replace("/login"); } },
  ]);

  const dnDays = user?.display_name_changed_at ? Math.max(0, Math.ceil(7 - (Date.now() - new Date(user.display_name_changed_at).getTime()) / 86400000)) : 0;
  const unDays = user?.username_changed_at ? Math.max(0, Math.ceil(30 - (Date.now() - new Date(user.username_changed_at).getTime()) / 86400000)) : 0;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 16, alignSelf: "flex-start" }} activeOpacity={0.7}>
        <ChevronLeft size={20} color={colors.primary} />
        <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 15 }}>Back to Profile</Text>
      </TouchableOpacity>

      {/* Avatar */}
      <View style={[s.section, card]}>
        <Text style={s.sectionTitle}>Profile photo</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <TouchableOpacity onPress={pickAvatar}>
            <UserAvatar user={{ ...(user as any), avatar_url: avatar }} size="xl" />
            <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 40, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: colors.white, fontSize: 11, fontWeight: "600" }}>Change</Text>
            </View>
          </TouchableOpacity>
          <View>
            <TouchableOpacity onPress={pickAvatar}><Text style={{ color: colors.primary, fontWeight: "600", fontSize: 14 }}>Upload photo</Text></TouchableOpacity>
            {avatar && <TouchableOpacity onPress={() => setAvatar(null)} style={{ marginTop: 4 }}><Text style={{ color: colors.secondary, fontSize: 13 }}>Remove</Text></TouchableOpacity>}
          </View>
        </View>
      </View>

      {/* Profile info */}
      <View style={[s.section, card]}>
        <Text style={s.sectionTitle}>Profile information</Text>
        <View style={{ gap: 16 }}>
          <View>
            <Text style={s.label}>Display name</Text>
            <TextInput value={form.display_name} onChangeText={v => f("display_name", v)} maxLength={30} editable={dnDays === 0} style={[s.input, dnDays > 0 && { opacity: 0.5 }]} />
            {dnDays > 0 && <Text style={s.hint}>Can change in {dnDays} day{dnDays !== 1 ? "s" : ""}</Text>}
          </View>
          <View>
            <Text style={s.label}>Username</Text>
            <View style={[s.input, { flexDirection: "row", alignItems: "center", paddingVertical: 0 }, unDays > 0 && { opacity: 0.5 }]}>
              <Text style={{ color: colors.secondary, fontSize: 15, paddingVertical: 12 }}>@</Text>
              <TextInput value={form.username} onChangeText={v => f("username", v.replace(/[^a-zA-Z0-9_]/g, ""))} maxLength={20} autoCapitalize="none" editable={unDays === 0} style={{ flex: 1, fontSize: 15, color: colors.nearBlack, paddingVertical: 12, letterSpacing: 0 }} />
            </View>
            {unDays > 0 && <Text style={s.hint}>Can change in {unDays} day{unDays !== 1 ? "s" : ""}</Text>}
          </View>
          <View>
            <Text style={s.label}>Bio</Text>
            <TextInput value={form.bio} onChangeText={v => f("bio", v)} placeholder="Tell people about yourself..." placeholderTextColor="#9ca3af" multiline maxLength={160} numberOfLines={3} style={[s.input, { minHeight: 72, textAlignVertical: "top" }]} />
            <Text style={[s.hint, { textAlign: "right" }]}>{160 - form.bio.length}</Text>
          </View>
        </View>
      </View>

      {/* Change password */}
      <View style={[s.section, card]}>
        <Text style={s.sectionTitle}>Change password</Text>
        <View style={{ gap: 16 }}>
          <View>
            <Text style={s.label}>New password</Text>
            <TextInput value={form.new_password} onChangeText={v => f("new_password", v)} placeholder="Min 8 characters" placeholderTextColor="#9ca3af" secureTextEntry style={s.input} />
          </View>
          <View>
            <Text style={s.label}>Confirm new password</Text>
            <TextInput value={form.confirm_password} onChangeText={v => f("confirm_password", v)} placeholder="Repeat new password" placeholderTextColor="#9ca3af" secureTextEntry style={s.input} />
          </View>

          {form.new_password.length > 0 && (
            <>
              <View>
                <Text style={s.label}>Verification code</Text>
                <TextInput
                  value={pwCode}
                  onChangeText={v => setPwCode(v.replace(/[^0-9]/g, "").slice(0, 6))}
                  placeholder="6-digit code from your email"
                  placeholderTextColor="#9ca3af"
                  keyboardType="number-pad"
                  maxLength={6}
                  style={s.input}
                />
              </View>
              <TouchableOpacity
                onPress={handleSendCode}
                disabled={sendingCode || cooldown > 0}
                style={{ alignSelf: "flex-start" }}
              >
                <Text style={{ color: cooldown > 0 ? "#9ca3af" : colors.primary, fontWeight: "600", fontSize: 13 }}>
                  {sendingCode ? "Sending..." : cooldown > 0 ? `Resend in ${cooldown}s` : codeSent ? "Resend code" : `Send code to ${user?.email}`}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <TouchableOpacity onPress={handleSave} disabled={loading} activeOpacity={0.8}
        style={{ backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 14, alignItems: "center", marginBottom: 12, opacity: loading ? 0.7 : 1 }}>
        {loading ? <ActivityIndicator color={colors.white} /> : <Text style={{ color: colors.white, fontWeight: "700", fontSize: 16 }}>Save Changes</Text>}
      </TouchableOpacity>

      {!!user?.is_admin && (
        <TouchableOpacity onPress={() => router.push("/admin" as any)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#f0f4ff", borderRadius: 999, paddingVertical: 14, marginBottom: 12, borderWidth: 1.5, borderColor: colors.primary }} activeOpacity={0.8}>
          <Shield size={18} color={colors.primary} />
          <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 15 }}>Admin Panel</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={() => router.push("/privacy-policy" as any)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 999, paddingVertical: 14, marginBottom: 12 }} activeOpacity={0.8}>
        <FileText size={16} color={colors.secondary} />
        <Text style={{ color: colors.secondary, fontWeight: "600", fontSize: 15 }}>Privacy Policy</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleLogout} style={{ borderWidth: 1, borderColor: "#fecaca", borderRadius: 999, paddingVertical: 14, alignItems: "center" }}>
        <Text style={{ color: "#b91c1c", fontWeight: "600", fontSize: 15 }}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  section: { padding: 20, marginBottom: 16 },
  sectionTitle: { fontWeight: "700", fontSize: 15, color: colors.nearBlack, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: colors.nearBlack, marginBottom: 6 },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.nearBlack, letterSpacing: 0 },
  hint: { fontSize: 12, color: colors.secondary, marginTop: 4 },
});
