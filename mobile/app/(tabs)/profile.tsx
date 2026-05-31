import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, Modal, Pressable } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Settings, Shield, Users, MessageSquare } from "lucide-react-native";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { timeAgo } from "../../utils/timeAgo";
import { fmt } from "../../utils/formatNumber";
import { colors, card } from "../../constants/colors";
import UserAvatar from "../../components/UserAvatar";
import VerifiedBadge from "../../components/VerifiedBadge";
import StatementCard from "../../components/StatementCard";

export default function ProfileTab() {
  const { user: me, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [statements, setStatements] = useState<any[]>([]);
  const [liked, setLiked] = useState<any[]>([]);
  const [tab, setTab] = useState<"statements" | "liked">("statements");
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [showAdminPopup, setShowAdminPopup] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!me) return;
    try {
      const res = await api.get(`/users/${me.username}`);
      setProfile(res.data.user);
    } catch {}
    finally { setLoading(false); }
  }, [me]);

  useFocusEffect(useCallback(() => {
    if (me) loadProfile();
  }, [loadProfile, me]));

  useEffect(() => {
    if (!profile) return;
    setContentLoading(true);
    const endpoint = tab === "statements" ? `/users/${me?.username}/statements` : `/users/${me?.username}/liked`;
    api.get(endpoint)
      .then(res => {
        if (tab === "statements") setStatements(res.data.statements);
        else setLiked(res.data.statements);
      })
      .catch(() => {})
      .finally(() => setContentLoading(false));
  }, [profile, tab]);

  if (authLoading || loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!me || !profile) return null;

  const content = tab === "statements" ? statements : liked;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.white }]}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
          <View style={{ position: "relative" }}>
            <UserAvatar user={profile} size="xl" />
            {profile.is_admin && (
              <TouchableOpacity onPress={() => setShowAdminPopup(true)}
                style={{ position: "absolute", top: -4, right: -4, backgroundColor: colors.primary, borderRadius: 999, padding: 4, borderWidth: 2, borderColor: "#fff" }}>
                <Shield size={10} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
              <Text style={{ fontWeight: "800", fontSize: 20, color: colors.nearBlack }}>{profile.display_name}</Text>
              {profile.is_verified ? <VerifiedBadge size="md" /> : null}
            </View>
            <Text style={{ fontSize: 14, color: colors.secondary, marginBottom: 4 }}>@{profile.username}</Text>
            {profile.bio ? <Text style={{ fontSize: 14, color: colors.nearBlack, lineHeight: 20 }}>{profile.bio}</Text> : null}
            <Text style={{ fontSize: 12, color: colors.secondary, marginTop: 4 }}>Joined {timeAgo(profile.created_at)}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          {[
            { label: "Statements", value: fmt(profile.statement_count) },
            { label: "Followers", value: fmt(profile.follower_count) },
            { label: "Following", value: fmt(profile.following_count) },
          ].map(stat => (
            <View key={stat.label} style={{ alignItems: "center" }}>
              <Text style={{ fontWeight: "800", fontSize: 18, color: colors.nearBlack }}>{stat.value}</Text>
              <Text style={{ fontSize: 12, color: colors.secondary }}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Action buttons */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity onPress={() => router.push("/settings" as any)}
            style={[s.btn, { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }]}>
            <Settings size={15} color={colors.nearBlack} />
            <Text style={{ fontWeight: "600", fontSize: 14, color: colors.nearBlack }}>Edit Profile</Text>
          </TouchableOpacity>

          {/* Admin Panel — only for admin users */}
          {me.is_admin && (
            <TouchableOpacity
              onPress={() => router.push("/admin" as any)}
              style={[s.btn, { flexDirection: "row", alignItems: "center", gap: 6, borderColor: colors.primary, paddingHorizontal: 14 }]}>
              <Shield size={15} color={colors.primary} />
              <Text style={{ fontWeight: "700", fontSize: 14, color: colors.primary }}>Admin</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content tabs */}
      <View style={{ flexDirection: "row", backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: "#f3f4f6", marginBottom: 16 }}>
        {(["statements", "liked"] as const).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)}
            style={{ flex: 1, paddingVertical: 14, alignItems: "center", borderBottomWidth: tab === t ? 2 : 0, borderBottomColor: colors.primary }}>
            <Text style={{ fontWeight: "600", fontSize: 14, color: tab === t ? colors.primary : colors.secondary }}>
              {t === "statements" ? "Statements" : "Liked"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        {contentLoading ? (
          <ActivityIndicator color={colors.primary} style={{ paddingVertical: 32 }} />
        ) : content.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 48 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
              <MessageSquare size={24} color={colors.secondary} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.nearBlack, marginBottom: 4 }}>
              {tab === "statements" ? "No statements yet" : "No liked statements"}
            </Text>
            <Text style={{ fontSize: 13, color: colors.secondary }}>
              {tab === "statements" ? "Post your first statement!" : "Like statements to see them here"}
            </Text>
          </View>
        ) : (
          content.map(s => <StatementCard key={s.id} statement={s} />)
        )}
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
              You are a Statefy administrator. You can manage users and content from the Admin panel.
            </Text>
            <TouchableOpacity onPress={() => { setShowAdminPopup(false); router.push("/admin" as any); }}
              style={{ marginTop: 20, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: "center" }}>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Open Admin Panel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowAdminPopup(false)}
              style={{ marginTop: 8, borderRadius: 12, paddingVertical: 12, alignItems: "center" }}>
              <Text style={{ color: colors.secondary, fontWeight: "600", fontSize: 14 }}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  header: { padding: 20, marginBottom: 0, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
  statsRow: { flexDirection: "row", gap: 24, paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#f9fafb", marginBottom: 16 },
  btn: { borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: 32 },
  popup: { backgroundColor: "#fff", borderRadius: 20, padding: 24, width: "100%", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
});
