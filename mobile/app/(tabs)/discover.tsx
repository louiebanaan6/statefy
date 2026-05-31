import { useState, useEffect } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Search } from "lucide-react-native";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { timeAgo } from "../../utils/timeAgo";
import { fmt } from "../../utils/formatNumber";
import { colors, card } from "../../constants/colors";
import UserAvatar from "../../components/UserAvatar";
import VerifiedBadge from "../../components/VerifiedBadge";
import StatementCard from "../../components/StatementCard";

function UserRow({ u }: { u: any }) {
  const router = useRouter();
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [fLoading, setFLoading] = useState(false);

  const handleFollow = async () => {
    if (!user) { router.push("/login"); return; }
    if (user.username === u.username) return;
    setFLoading(true);
    try {
      if (following) { await api.delete(`/users/${u.username}/follow`); setFollowing(false); }
      else { await api.post(`/users/${u.username}/follow`); setFollowing(true); }
    } catch {} finally { setFLoading(false); }
  };

  return (
    <TouchableOpacity onPress={() => router.push(`/user/${u.username}`)} activeOpacity={0.7}
      style={[s.userRow, card]}>
      <UserAvatar user={u} size="md" />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ fontWeight: "700", fontSize: 14, color: colors.nearBlack }} numberOfLines={1}>{u.display_name}</Text>
          {u.is_verified ? <VerifiedBadge /> : null}
        </View>
        <Text style={{ fontSize: 12, color: colors.secondary }}>@{u.username}</Text>
      </View>
      {user && user.username !== u.username && (
        <TouchableOpacity onPress={handleFollow} disabled={fLoading} activeOpacity={0.8}
          style={{ backgroundColor: following ? "transparent" : colors.primary, borderColor: following ? "#e5e7eb" : colors.primary, borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, opacity: fLoading ? 0.5 : 1 }}>
          <Text style={{ color: following ? colors.nearBlack : colors.white, fontWeight: "700", fontSize: 12 }}>{fLoading ? "..." : following ? "Following" : "Follow"}</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

export default function DiscoverScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any | null>(null);
  const [trending, setTrending] = useState<any[]>([]);
  const [suggested, setSuggested] = useState<any[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    api.get("/statements/trending").then(r => setTrending(r.data.statements)).catch(() => {}).finally(() => setTrendingLoading(false));
    api.get("/search?q=").then(r => setSuggested(r.data.suggested_users || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults(null); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try { const res = await api.get(`/search?q=${encodeURIComponent(query)}`); setResults(res.data); }
      catch {} finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <View style={s.searchBar}>
        <Search size={18} color={colors.secondary} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Search statements and people..." placeholderTextColor={colors.secondary}
          style={{ flex: 1, marginLeft: 8, fontSize: 14, color: colors.nearBlack, padding: 0 }} returnKeyType="search" />
        {searching && <ActivityIndicator size="small" color={colors.primary} />}
      </View>

      {results ? (
        <>
          {results.users?.length > 0 && (<View style={{ marginBottom: 16 }}>
            <Text style={s.sectionTitle}>People</Text>
            {results.users.map((u: any) => <UserRow key={u.id} u={u} />)}
          </View>)}
          {results.statements?.length > 0 && (<View>
            <Text style={s.sectionTitle}>Statements</Text>
            {results.statements.map((s: any) => (
              <TouchableOpacity key={s.id} onPress={() => router.push(`/statement/${s.id}`)} activeOpacity={0.7}
                style={[{ padding: 16, marginBottom: 10 }, card]}>
                <Text style={{ fontWeight: "500", fontSize: 14, color: colors.nearBlack, lineHeight: 20, marginBottom: 8 }} numberOfLines={3}>{s.content}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Text style={{ fontSize: 12, color: colors.secondary }}>@{s.username}</Text>
                  <Text style={{ fontSize: 12, color: colors.secondary }}>·</Text>
                  <Text style={{ fontSize: 12, color: colors.secondary }}>{timeAgo(s.created_at)}</Text>
                  <Text style={{ fontSize: 12, color: colors.secondary, marginLeft: "auto" }}>{fmt(s.vote_count)} votes</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>)}
          {!results.users?.length && !results.statements?.length && (
            <Text style={{ color: colors.secondary, textAlign: "center", paddingVertical: 32 }}>No results for "{query}"</Text>
          )}
        </>
      ) : (
        <>
          {suggested.length > 0 && (<View style={{ marginBottom: 16 }}>
            <Text style={s.sectionTitle}>Suggested people</Text>
            {suggested.map((u: any) => <UserRow key={u.id} u={u} />)}
          </View>)}
          <View>
            <Text style={s.sectionTitle}>Trending this week</Text>
            {trendingLoading ? <ActivityIndicator color={colors.primary} /> :
              trending.length === 0 ? <Text style={{ color: colors.secondary, textAlign: "center", paddingVertical: 32 }}>No trending statements yet</Text> :
              <View style={{ gap: 12 }}>{trending.map((s: any) => <StatementCard key={s.id} statement={s} />)}</View>}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  sectionTitle: { fontWeight: "700", fontSize: 16, color: colors.nearBlack, marginBottom: 12 },
  userRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, marginBottom: 10 },
});
