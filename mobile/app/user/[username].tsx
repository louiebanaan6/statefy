import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, Modal, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Shield, Users } from "lucide-react-native";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { timeAgo } from "../../utils/timeAgo";
import { fmt } from "../../utils/formatNumber";
import { colors, card } from "../../constants/colors";
import UserAvatar from "../../components/UserAvatar";
import VerifiedBadge from "../../components/VerifiedBadge";
import StatementCard from "../../components/StatementCard";

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { user: me } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [statements, setStatements] = useState<any[]>([]);
  const [liked, setLiked] = useState<any[]>([]);
  const [tab, setTab] = useState<"statements" | "liked">("statements");
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showAdminPopup, setShowAdminPopup] = useState(false);
  const isOwn = me?.username?.toLowerCase() === username?.toLowerCase();

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    api.get(`/users/${username}`).then(res => setProfile(res.data.user)).catch(() => router.back()).finally(() => setLoading(false));
  }, [username]);

  useEffect(() => {
    if (!profile) return;
    setContentLoading(true);
    api.get(tab === "statements" ? `/users/${username}/statements` : `/users/${username}/liked`)
      .then(res => { if (tab === "statements") setStatements(res.data.statements); else setLiked(res.data.statements); })
      .catch(() => {}).finally(() => setContentLoading(false));
  }, [profile, tab, username]);

  const handleFollow = async () => {
    if (!me) { router.push("/login"); return; }
    setFollowLoading(true);
    try {
      if (profile.is_following) {
        await api.delete(`/users/${username}/follow`);
        setProfile((p: any) => ({ ...p, is_following: false, is_friend: false, follower_count: p.follower_count - 1 }));
      } else {
        await api.post(`/users/${username}/follow`);
        setProfile((p: any) => ({ ...p, is_following: true, follower_count: p.follower_count + 1 }));
      }
    } catch (err: any) { Alert.alert("Error", err.response?.data?.error || "Failed"); }
    finally { setFollowLoading(false); }
  };

  const handleAdminBan = () => Alert.alert(profile.is_banned ? "Unban?" : "Ban?", profile.display_name, [
    { text: "Cancel", style: "cancel" },
    { text: "Confirm", style: "destructive", onPress: async () => {
      try { const res = await api.put(`/admin/users/${profile.id}/ban`); setProfile((p: any) => ({ ...p, is_banned: res.data.is_banned })); }
      catch (err: any) { Alert.alert("Error", err.response?.data?.error || "Failed"); }
    }},
  ]);

  const handleAdminVerify = async () => {
    try { const res = await api.put(`/admin/users/${profile.id}/verify`); setProfile((p: any) => ({ ...p, is_verified: res.data.is_verified })); }
    catch (err: any) { Alert.alert("Error", err.response?.data?.error || "Failed"); }
  };

  if (loading) return <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />;
  if (!profile) return null;

  const content = tab === "statements" ? statements : liked;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={[s.header, { backgroundColor: colors.white, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 }]}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
          <View style={{ position: "relative" }}>
            <UserAvatar user={profile} size="xl" />
            {/* Admin crown icon - subtle, tappable */}
            {!!profile.is_admin && (
              <TouchableOpacity onPress={() => setShowAdminPopup(true)}
                style={{ position: "absolute", top: -4, right: -4, backgroundColor: colors.primary, borderRadius: 999, padding: 4, borderWidth: 2, borderColor: "#fff" }}>
                <Shield size={10} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
              <Text style={{ fontWeight: "800", fontSize: 20, color: colors.nearBlack }}>{profile.display_name}</Text>
              {profile.is_verified ? <VerifiedBadge size="md" /> : null}
              {/* Friends badge - shown when both follow each other */}
              {!isOwn && !!profile.is_friend && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f0fdf4", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: "#bbf7d0" }}>
                  <Users size={11} color="#15803d" />
                  <Text style={{ color: "#15803d", fontSize: 11, fontWeight: "700" }}>Friends</Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 14, color: colors.secondary, marginBottom: 4 }}>@{profile.username}</Text>
            {profile.bio ? <Text style={{ fontSize: 14, color: colors.nearBlack, lineHeight: 20 }}>{profile.bio}</Text> : null}
            <Text style={{ fontSize: 12, color: colors.secondary, marginTop: 4 }}>Joined {timeAgo(profile.created_at)}</Text>
          </View>
        </View>

        <View style={s.statsRow}>
          {[{ label: "Statements", value: fmt(profile.statement_count) }, { label: "Followers", value: fmt(profile.follower_count) }, { label: "Following", value: fmt(profile.following_count) }].map(stat => (
            <View key={stat.label} style={{ alignItems: "center" }}>
              <Text style={{ fontWeight: "800", fontSize: 18, color: colors.nearBlack }}>{stat.value}</Text>
              <Text style={{ fontSize: 12, color: colors.secondary }}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {isOwn ? (
            <TouchableOpacity onPress={() => router.push("/settings")} style={s.btnOutline}>
              <Text style={{ fontWeight: "600", fontSize: 14, color: colors.nearBlack }}>Edit Profile</Text>
            </TouchableOpacity>
          ) : me && (
            <TouchableOpacity onPress={handleFollow} disabled={followLoading}
              style={[s.btnOutline, { flex: 1, backgroundColor: profile.is_following ? "transparent" : colors.primary, borderColor: profile.is_following ? "#e5e7eb" : colors.primary, opacity: followLoading ? 0.6 : 1 }]}>
              <Text style={{ fontWeight: "700", fontSize: 14, color: profile.is_following ? colors.nearBlack : colors.white }}>{followLoading ? "..." : profile.is_following ? "Following" : "Follow"}</Text>
            </TouchableOpacity>
          )}
          {!!me?.is_admin && !isOwn && (
            <>
              <TouchableOpacity onPress={handleAdminBan} style={[s.btnOutline, { borderColor: profile.is_banned ? "#bbf7d0" : "#fecaca" }]}>
                <Text style={{ fontWeight: "600", fontSize: 13, color: profile.is_banned ? "#15803d" : "#b91c1c" }}>{profile.is_banned ? "Unban" : "Ban"}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAdminVerify} style={[s.btnOutline, { borderColor: colors.primary }]}>
                <Text style={{ fontWeight: "600", fontSize: 13, color: colors.primary }}>{profile.is_verified ? "Unverify" : "Verify"}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
        {!!profile.is_banned && <Text style={{ fontSize: 12, color: "#ef4444", fontWeight: "600", textAlign: "center", marginTop: 8 }}>This account is banned</Text>}
      </View>

      <View style={{ flexDirection: "row", backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: "#f3f4f6", marginBottom: 16 }}>
        {(["statements", "liked"] as const).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={{ flex: 1, paddingVertical: 14, alignItems: "center", borderBottomWidth: tab === t ? 2 : 0, borderBottomColor: colors.primary }}>
            <Text style={{ fontWeight: "600", fontSize: 14, color: tab === t ? colors.primary : colors.secondary }}>{t === "statements" ? "Statements" : "Liked"}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        {contentLoading ? <ActivityIndicator color={colors.primary} /> :
          content.length === 0 ? <Text style={{ fontSize: 14, color: colors.secondary, textAlign: "center", paddingVertical: 32 }}>{tab === "statements" ? "No statements yet" : "No liked statements"}</Text> :
          content.map(s => <StatementCard key={s.id} statement={s} />)}
      </View>

      {/* Admin info popup */}
      <Modal visible={showAdminPopup} transparent animationType="fade" onRequestClose={() => setShowAdminPopup(false)}>
        <Pressable style={s.overlay} onPress={() => setShowAdminPopup(false)}>
          <View style={s.popup}>
            <View style={{ width: 48, height: 48, borderRadius: 999, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 12, alignSelf: "center" }}>
              <Shield size={24} color="#fff" />
            </View>
            <Text style={{ fontWeight: "800", fontSize: 18, color: colors.nearBlack, textAlign: "center", marginBottom: 6 }}>Platform Admin</Text>
            <Text style={{ fontSize: 14, color: colors.secondary, textAlign: "center", lineHeight: 20 }}>
              {profile.display_name} is a Statefy administrator. Admins moderate content and manage the platform.
            </Text>
            <TouchableOpacity onPress={() => setShowAdminPopup(false)}
              style={{ marginTop: 20, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: "center" }}>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Got it</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  header: { padding: 20, marginBottom: 0 },
  statsRow: { flexDirection: "row", gap: 24, paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#f9fafb", marginBottom: 16 },
  btnOutline: { flex: 1, borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: 32 },
  popup: { backgroundColor: "#fff", borderRadius: 20, padding: 24, width: "100%", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
});
