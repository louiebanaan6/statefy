import { useState, useEffect, useCallback } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, Modal, Pressable, FlatList, KeyboardAvoidingView, Platform } from "react-native";
import { useFocusEffect } from "expo-router";
import { Shield, Users, FileText, Flag, Search, Trash2, X, Heart, CheckCircle, XCircle, Plus } from "lucide-react-native";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { timeAgo } from "../../utils/timeAgo";
import { fmt } from "../../utils/formatNumber";
import { colors, card } from "../../constants/colors";
import UserAvatar from "../../components/UserAvatar";
import VerifiedBadge from "../../components/VerifiedBadge";

type MainTab = "users" | "statements" | "reports";
type ManageTab = "followers" | "following" | "likes";

export default function AdminScreen() {
  const { user } = useAuth();

  const [tab, setTab] = useState<MainTab>("users");
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [statements, setStatements] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [stmtQuery, setStmtQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Manage modal
  const [manageUser, setManageUser] = useState<any>(null);
  const [manageTab, setManageTab] = useState<ManageTab>("followers");
  const [manageData, setManageData] = useState<any[]>([]);
  const [manageLoading, setManageLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState("");
  const [followingCount, setFollowingCount] = useState("");
  const [savingCounts, setSavingCounts] = useState(false);
  const [addQuery, setAddQuery] = useState("");
  const [addResults, setAddResults] = useState<any[]>([]);
  const [addLikeQuery, setAddLikeQuery] = useState("");
  const [addLikeResults, setAddLikeResults] = useState<any[]>([]);

  useFocusEffect(useCallback(() => {
    api.get("/admin/stats").then(r => setStats(r.data)).catch(() => {});
    fetchUsers();
  }, []));

  useEffect(() => {
    if (tab === "statements") fetchStatements();
    else if (tab === "reports") fetchReports();
    else fetchUsers();
  }, [tab]);

  const fetchUsers = async (q = "") => {
    setLoading(true);
    try { const r = await api.get(`/admin/users?q=${encodeURIComponent(q)}`); setUsers(r.data.users); }
    catch {} finally { setLoading(false); }
  };

  const fetchStatements = async (q = "") => {
    setLoading(true);
    try { const r = await api.get(`/admin/statements?q=${encodeURIComponent(q)}`); setStatements(r.data.statements); }
    catch {} finally { setLoading(false); }
  };

  const fetchReports = async () => {
    setLoading(true);
    try { const r = await api.get("/admin/reports"); setReports(r.data.reports); }
    catch {} finally { setLoading(false); }
  };

  // ── Manage modal ─────────────────────────────────────────────────────────────
  const openManage = (u: any) => {
    setManageUser(u);
    setManageTab("followers");
    setManageData([]);
    setFollowerCount(String(u.follower_count || 0));
    setFollowingCount(String(u.following_count || 0));
    setAddQuery(""); setAddResults([]);
    setAddLikeQuery(""); setAddLikeResults([]);
    loadManageData("followers", u.id);
  };

  const loadManageData = async (t: ManageTab, userId: string) => {
    setManageLoading(true);
    try {
      const r = await api.get(`/admin/users/${userId}/${t}`);
      setManageData(r.data[t] || r.data.statements || []);
    } catch {} finally { setManageLoading(false); }
  };

  const switchManageTab = (t: ManageTab) => {
    setManageTab(t);
    setManageData([]);
    setAddQuery(""); setAddResults([]);
    setAddLikeQuery(""); setAddLikeResults([]);
    loadManageData(t, manageUser.id);
  };

  const saveFollowerCounts = async () => {
    if (!manageUser) return;
    setSavingCounts(true);
    try {
      const fRes = await api.put(`/admin/users/${manageUser.id}/set-followers`, { count: parseInt(followerCount) || 0 });
      const fwRes = await api.put(`/admin/users/${manageUser.id}/set-following`, { count: parseInt(followingCount) || 0 });
      setUsers(prev => prev.map(u => u.id === manageUser.id
        ? { ...u, follower_count: fRes.data.follower_count, following_count: fwRes.data.following_count } : u));
      Alert.alert("Saved", `Followers: ${fRes.data.follower_count} · Following: ${fwRes.data.following_count}`);
    } catch (err: any) { Alert.alert("Error", err.response?.data?.error || "Failed"); }
    finally { setSavingCounts(false); }
  };

  const searchAddUsers = async (q: string) => {
    if (!q.trim()) { setAddResults([]); return; }
    try { const r = await api.get(`/admin/users?q=${encodeURIComponent(q)}`); setAddResults(r.data.users.filter((u: any) => u.id !== manageUser?.id)); }
    catch {}
  };

  const searchAddStatements = async (q: string) => {
    if (!q.trim()) { setAddLikeResults([]); return; }
    try { const r = await api.get(`/admin/statements?q=${encodeURIComponent(q)}`); setAddLikeResults(r.data.statements); }
    catch {}
  };

  const addFollow = async (otherId: string) => {
    try {
      if (manageTab === "followers") await api.post(`/admin/users/${otherId}/follow/${manageUser.id}`);
      else await api.post(`/admin/users/${manageUser.id}/follow/${otherId}`);
      Alert.alert("Done");
      setAddResults([]); setAddQuery("");
      loadManageData(manageTab, manageUser.id);
    } catch (err: any) { Alert.alert("Error", err.response?.data?.error || "Failed"); }
  };

  const removeFollow = async (otherId: string) => {
    try {
      if (manageTab === "followers") await api.delete(`/admin/users/${otherId}/follow/${manageUser.id}`);
      else await api.delete(`/admin/users/${manageUser.id}/follow/${otherId}`);
      setManageData(prev => prev.filter((u: any) => u.id !== otherId));
    } catch (err: any) { Alert.alert("Error", err.response?.data?.error || "Failed"); }
  };

  const giveLike = async (statementId: string) => {
    try {
      await api.post(`/admin/users/${manageUser.id}/likes/${statementId}`);
      Alert.alert("Done");
      setAddLikeResults([]); setAddLikeQuery("");
      loadManageData("likes", manageUser.id);
    } catch (err: any) { Alert.alert("Error", err.response?.data?.error || "Failed"); }
  };

  const removeLike = async (statementId: string) => {
    try {
      await api.delete(`/admin/users/${manageUser.id}/likes/${statementId}`);
      setManageData(prev => prev.filter((x: any) => x.id !== statementId));
    } catch (err: any) { Alert.alert("Error", err.response?.data?.error || "Failed"); }
  };

  // ── User / statement actions ──────────────────────────────────────────────────
  const handleBan = (u: any) => Alert.alert(u.is_banned ? "Unban?" : "Ban?", u.display_name, [
    { text: "Cancel", style: "cancel" },
    { text: "Confirm", style: "destructive", onPress: async () => {
      try { const r = await api.put(`/admin/users/${u.id}/ban`); setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_banned: r.data.is_banned ? 1 : 0 } : x)); }
      catch (err: any) { Alert.alert("Error", err.response?.data?.error || "Failed"); }
    }},
  ]);

  const handleVerify = async (u: any) => {
    try { const r = await api.put(`/admin/users/${u.id}/verify`); setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_verified: r.data.is_verified ? 1 : 0 } : x)); }
    catch (err: any) { Alert.alert("Error", err.response?.data?.error || "Failed"); }
  };

  const handleDeleteUser = (u: any) => Alert.alert("Delete account?", u.display_name, [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: async () => {
      try { await api.delete(`/admin/users/${u.id}`); setUsers(prev => prev.filter(x => x.id !== u.id)); }
      catch (err: any) { Alert.alert("Error", err.response?.data?.error || "Failed"); }
    }},
  ]);

  const handleDeleteStatement = (st: any) => Alert.alert("Delete statement?", st.content.slice(0, 80), [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: async () => {
      try { await api.delete(`/admin/statements/${st.id}`); setStatements(prev => prev.filter(x => x.id !== st.id)); }
      catch (err: any) { Alert.alert("Error", err.response?.data?.error || "Failed"); }
    }},
  ]);

  const handleDismissReport = async (r: any) => {
    try { await api.delete(`/admin/reports/${r.id}`); setReports(prev => prev.filter(x => x.id !== r.id)); }
    catch {}
  };

  const handleDeleteReportedContent = (r: any) => Alert.alert("Delete content?", "Permanently removes the reported content.", [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: async () => {
      try {
        if (r.target_type === "statement") await api.delete(`/statements/${r.target_id}`);
        await api.delete(`/admin/reports/${r.id}`);
        setReports(prev => prev.filter(x => x.id !== r.id));
      } catch (err: any) { Alert.alert("Error", err.response?.data?.error || "Failed"); }
    }},
  ]);

  if (!user?.is_admin) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }}>
        <Shield size={48} color={colors.secondary} />
        <Text style={{ fontSize: 18, fontWeight: "700", color: colors.nearBlack, marginTop: 16 }}>Admin only</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      {/* Stats */}
      {stats && (
        <View style={{ flexDirection: "row", padding: 12, gap: 8 }}>
          {[
            { label: "Users", value: fmt(stats.total_users), color: colors.primary },
            { label: "Posts", value: fmt(stats.total_statements), color: colors.nearBlack },
            { label: "Votes", value: fmt(stats.total_votes), color: "#1d4ed8" },
            { label: "Today", value: fmt(stats.votes_today), color: "#15803d" },
          ].map(st => (
            <View key={st.label} style={[card, { flex: 1, alignItems: "center", padding: 10 }]}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: st.color }}>{st.value}</Text>
              <Text style={{ fontSize: 11, color: colors.secondary, marginTop: 1 }}>{st.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Tab bar */}
      <View style={{ flexDirection: "row", backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" }}>
        {([
          { key: "users" as MainTab, label: "Users", Icon: Users },
          { key: "statements" as MainTab, label: "Posts", Icon: FileText },
          { key: "reports" as MainTab, label: "Reports", Icon: Flag },
        ]).map(({ key, label, Icon }) => (
          <TouchableOpacity key={key} onPress={() => setTab(key)} activeOpacity={0.7}
            style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, gap: 4,
              borderBottomWidth: 2, borderBottomColor: tab === key ? colors.primary : "transparent" }}>
            <Icon size={15} color={tab === key ? colors.primary : colors.secondary} />
            <Text style={{ fontSize: 13, fontWeight: "600", color: tab === key ? colors.primary : colors.secondary }}>{label}</Text>
            {key === "reports" && reports.length > 0 && (
              <View style={{ backgroundColor: "#ef4444", borderRadius: 999, minWidth: 15, height: 15, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 }}>
                <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>{reports.length > 9 ? "9+" : reports.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* ── USERS ── */}
      {tab === "users" && (
        <View style={{ flex: 1 }}>
          <View style={s.searchRow}>
            <View style={s.searchWrap}>
              <Search size={15} color={colors.secondary} />
              <TextInput value={userQuery} onChangeText={setUserQuery} onSubmitEditing={() => fetchUsers(userQuery)}
                placeholder="Search users..." placeholderTextColor={colors.secondary} returnKeyType="search"
                style={{ flex: 1, marginLeft: 8, fontSize: 14, color: colors.nearBlack }} />
            </View>
            <TouchableOpacity onPress={() => fetchUsers(userQuery)} style={s.goBtn} activeOpacity={0.8}>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Go</Text>
            </TouchableOpacity>
          </View>
          {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} /> : (
            <FlatList data={users} keyExtractor={u => u.id} contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 40 }}
              renderItem={({ item: u }) => (
                <View style={[card, { padding: 14 }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <UserAvatar user={u} size="sm" />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <Text style={{ fontWeight: "600", fontSize: 14, color: colors.nearBlack }}>{u.display_name}</Text>
                        {!!u.is_verified && <VerifiedBadge />}
                        {!!u.is_admin && <View style={s.badgePrimary}><Text style={s.badgePrimaryText}>Admin</Text></View>}
                        {!!u.is_banned && <View style={s.badgeRed}><Text style={s.badgeRedText}>Banned</Text></View>}
                      </View>
                      <Text style={{ fontSize: 12, color: colors.secondary }}>@{u.username} · {u.email}</Text>
                      <Text style={{ fontSize: 11, color: colors.secondary }}>{fmt(u.follower_count)} followers · Joined {timeAgo(u.created_at)}</Text>
                    </View>
                  </View>
                  {!u.is_deleted && (
                    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                      <TouchableOpacity onPress={() => handleBan(u)} style={[s.btn, { borderColor: u.is_banned ? "#bbf7d0" : "#fecaca" }]} activeOpacity={0.7}>
                        <Text style={{ fontSize: 12, fontWeight: "600", color: u.is_banned ? "#15803d" : "#b91c1c" }}>{u.is_banned ? "Unban" : "Ban"}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleVerify(u)} style={[s.btn, { borderColor: colors.primary }]} activeOpacity={0.7}>
                        <Text style={{ fontSize: 12, fontWeight: "600", color: colors.primary }}>{u.is_verified ? "Unverify" : "Verify"}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => openManage(u)} style={[s.btn, { borderColor: "#c4b5fd", flexDirection: "row", alignItems: "center", gap: 4 }]} activeOpacity={0.7}>
                        <Users size={12} color="#7c3aed" />
                        <Text style={{ fontSize: 12, fontWeight: "600", color: "#7c3aed" }}>Manage</Text>
                      </TouchableOpacity>
                      {!u.is_admin && (
                        <TouchableOpacity onPress={() => handleDeleteUser(u)} style={[s.btn, { marginLeft: "auto" as any }]} activeOpacity={0.7}>
                          <Trash2 size={13} color={colors.secondary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              )}
            />
          )}
        </View>
      )}

      {/* ── STATEMENTS ── */}
      {tab === "statements" && (
        <View style={{ flex: 1 }}>
          <View style={s.searchRow}>
            <View style={s.searchWrap}>
              <Search size={15} color={colors.secondary} />
              <TextInput value={stmtQuery} onChangeText={setStmtQuery} onSubmitEditing={() => fetchStatements(stmtQuery)}
                placeholder="Search statements..." placeholderTextColor={colors.secondary} returnKeyType="search"
                style={{ flex: 1, marginLeft: 8, fontSize: 14, color: colors.nearBlack }} />
            </View>
            <TouchableOpacity onPress={() => fetchStatements(stmtQuery)} style={s.goBtn} activeOpacity={0.8}>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Go</Text>
            </TouchableOpacity>
          </View>
          {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} /> : (
            <FlatList data={statements} keyExtractor={st => st.id} contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 40 }}
              renderItem={({ item: st }) => (
                <View style={[card, { padding: 14 }]}>
                  <Text style={{ fontSize: 14, color: colors.nearBlack, fontWeight: "500", lineHeight: 20, marginBottom: 6 }} numberOfLines={3}>{st.content}</Text>
                  <Text style={{ fontSize: 12, color: colors.secondary, marginBottom: 10 }}>@{st.username} · {timeAgo(st.created_at)}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Heart size={14} color="#ef4444" />
                    <TextInput defaultValue={String(st.like_count || 0)} keyboardType="number-pad" placeholder="0" placeholderTextColor="#9ca3af"
                      onEndEditing={async (e) => {
                        const val = parseInt(e.nativeEvent.text) || 0;
                        try { await api.put(`/admin/statements/${st.id}/set-likes`, { count: val }); setStatements(prev => prev.map(x => x.id === st.id ? { ...x, like_count: val } : x)); } catch {}
                      }}
                      style={[s.countInput]} />
                    <Text style={{ fontSize: 12, color: colors.secondary, flex: 1 }}>likes</Text>
                    <TouchableOpacity onPress={() => handleDeleteStatement(st)} style={[s.btn, { borderColor: "#fecaca", flexDirection: "row", alignItems: "center", gap: 4 }]} activeOpacity={0.7}>
                      <Trash2 size={13} color="#b91c1c" />
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#b91c1c" }}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      )}

      {/* ── REPORTS ── */}
      {tab === "reports" && (
        <View style={{ flex: 1 }}>
          {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} /> :
            reports.length === 0 ? (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <CheckCircle size={48} color="#16a34a" />
                <Text style={{ fontSize: 16, fontWeight: "700", color: colors.nearBlack, marginTop: 12 }}>No reports</Text>
                <Text style={{ fontSize: 13, color: colors.secondary, marginTop: 4 }}>Everything looks clean</Text>
              </View>
            ) : (
              <FlatList data={reports} keyExtractor={r => r.id} contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 40 }}
                renderItem={({ item: r }) => (
                  <View style={[card, { padding: 14 }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <View style={s.badgeRed}><Text style={[s.badgeRedText, { textTransform: "capitalize" }]}>{r.target_type}</Text></View>
                      <Text style={{ fontSize: 12, color: colors.secondary }}>by @{r.reporter_username} · {timeAgo(r.created_at)}</Text>
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: colors.nearBlack, marginBottom: 4 }}>Reason: {r.reason}</Text>
                    {r.target_content && (
                      <Text style={{ fontSize: 13, color: colors.secondary, lineHeight: 18, marginBottom: 10 }} numberOfLines={3}>"{r.target_content}"</Text>
                    )}
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TouchableOpacity onPress={() => handleDismissReport(r)}
                        style={[s.btn, { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, borderColor: "#bbf7d0" }]} activeOpacity={0.7}>
                        <XCircle size={13} color="#15803d" />
                        <Text style={{ fontSize: 12, fontWeight: "600", color: "#15803d" }}>Dismiss</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteReportedContent(r)}
                        style={[s.btn, { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, borderColor: "#fecaca" }]} activeOpacity={0.7}>
                        <Trash2 size={13} color="#b91c1c" />
                        <Text style={{ fontSize: 12, fontWeight: "600", color: "#b91c1c" }}>Delete content</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            )}
        </View>
      )}

      {/* ── MANAGE MODAL ── */}
      <Modal visible={!!manageUser} transparent animationType="slide" onRequestClose={() => setManageUser(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} onPress={() => setManageUser(null)} />
          <View style={mm.sheet}>
            <View style={mm.header}>
              <View>
                <Text style={mm.title}>Manage: {manageUser?.display_name}</Text>
                <Text style={mm.sub}>@{manageUser?.username}</Text>
              </View>
              <TouchableOpacity onPress={() => setManageUser(null)}><X size={22} color={colors.secondary} /></TouchableOpacity>
            </View>

            {/* Count row */}
            <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: colors.secondary, marginBottom: 4 }}>Followers</Text>
                <TextInput value={followerCount} onChangeText={setFollowerCount} keyboardType="number-pad"
                  style={[s.countInput, { textAlign: "center", fontSize: 16, fontWeight: "700" }]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: colors.secondary, marginBottom: 4 }}>Following</Text>
                <TextInput value={followingCount} onChangeText={setFollowingCount} keyboardType="number-pad"
                  style={[s.countInput, { textAlign: "center", fontSize: 16, fontWeight: "700" }]} />
              </View>
              <TouchableOpacity onPress={saveFollowerCounts} disabled={savingCounts}
                style={{ backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 14, alignSelf: "flex-end", paddingVertical: 10, opacity: savingCounts ? 0.6 : 1 }} activeOpacity={0.8}>
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>{savingCounts ? "..." : "Save"}</Text>
              </TouchableOpacity>
            </View>

            {/* Manage tabs */}
            <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
              {(["followers", "following", "likes"] as ManageTab[]).map(t => (
                <TouchableOpacity key={t} onPress={() => switchManageTab(t)}
                  style={{ flex: 1, paddingVertical: 10, alignItems: "center", borderBottomWidth: manageTab === t ? 2 : 0, borderBottomColor: colors.primary }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: manageTab === t ? colors.primary : colors.secondary, textTransform: "capitalize" }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Add row */}
            {manageTab !== "likes" ? (
              <View style={{ flexDirection: "row", gap: 8, padding: 12 }}>
                <TextInput value={addQuery} onChangeText={v => { setAddQuery(v); searchAddUsers(v); }}
                  placeholder="Add user..." placeholderTextColor={colors.secondary}
                  style={[s.countInput, { flex: 1, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 }]} />
              </View>
            ) : (
              <View style={{ flexDirection: "row", gap: 8, padding: 12 }}>
                <TextInput value={addLikeQuery} onChangeText={v => { setAddLikeQuery(v); searchAddStatements(v); }}
                  placeholder="Find statement to like..." placeholderTextColor={colors.secondary}
                  style={[s.countInput, { flex: 1, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 }]} />
              </View>
            )}

            {/* Search results */}
            {(manageTab !== "likes" ? addResults : addLikeResults).length > 0 && (
              <ScrollView style={{ maxHeight: 120, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }} keyboardShouldPersistTaps="handled">
                {(manageTab !== "likes" ? addResults : addLikeResults).map((item: any) => (
                  <TouchableOpacity key={item.id} onPress={() => manageTab !== "likes" ? addFollow(item.id) : giveLike(item.id)}
                    style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f9fafb" }} activeOpacity={0.7}>
                    <Plus size={14} color={colors.primary} />
                    <Text style={{ fontSize: 13, color: colors.nearBlack, flex: 1 }} numberOfLines={1}>
                      {manageTab !== "likes" ? `${item.display_name} @${item.username}` : item.content}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* List */}
            {manageLoading ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : (
              <FlatList data={manageData} keyExtractor={x => x.id}
                style={{ maxHeight: 220 }}
                contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 12 }}
                ListEmptyComponent={<Text style={{ fontSize: 13, color: colors.secondary, textAlign: "center", paddingVertical: 20 }}>None yet</Text>}
                renderItem={({ item }) => (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f9fafb" }}>
                    {manageTab !== "likes" ? (
                      <>
                        <UserAvatar user={item} size="xs" />
                        <Text style={{ flex: 1, fontSize: 13, color: colors.nearBlack }}>{item.display_name} <Text style={{ color: colors.secondary }}>@{item.username}</Text></Text>
                        <TouchableOpacity onPress={() => removeFollow(item.id)} activeOpacity={0.7}>
                          <X size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <Text style={{ flex: 1, fontSize: 12, color: colors.nearBlack }} numberOfLines={2}>{item.content}</Text>
                        <TouchableOpacity onPress={() => removeLike(item.id)} activeOpacity={0.7}>
                          <X size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12 },
  searchWrap: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  goBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  btn: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  countInput: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: colors.nearBlack, backgroundColor: colors.white },
  badgePrimary: { backgroundColor: "#eff6ff", borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
  badgePrimaryText: { fontSize: 10, fontWeight: "700", color: colors.primary },
  badgeRed: { backgroundColor: "#fef2f2", borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
  badgeRedText: { fontSize: 10, fontWeight: "700", color: "#b91c1c" },
});

const mm = StyleSheet.create({
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: Platform.OS === "ios" ? 34 : 16, maxHeight: "85%" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  title: { fontWeight: "800", fontSize: 16, color: colors.nearBlack },
  sub: { fontSize: 13, color: colors.secondary, marginTop: 2 },
});
