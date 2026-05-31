import { useState, useCallback, useRef, useMemo } from "react";
import { FlatList, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Dimensions, RefreshControl } from "react-native";
import { MessageSquare, CheckCircle } from "lucide-react-native";
import { useFocusEffect } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { useRouter } from "expo-router";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { colors, card } from "../../constants/colors";
import StatementCard from "../../components/StatementCard";

const { height: SCREEN_H } = Dimensions.get("window");
const ITEM_H = SCREEN_H * 0.78;

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const isFocused = useIsFocused();
  const [feed, setFeed] = useState<"forYou" | "following">("forYou");
  const [statements, setStatements] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allCaughtUp, setAllCaughtUp] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const pageRef = useRef(1);
  const seenQueue = useRef<Set<string>>(new Set());
  const flushTimer = useRef<any>(null);

  const flushSeen = useCallback(() => {
    if (!user || seenQueue.current.size === 0) return;
    const ids = [...seenQueue.current];
    seenQueue.current.clear();
    api.post('/statements/seen', { ids }).catch(() => {});
  }, [user]);

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const id = viewableItems[0].item.id;
      setActiveId(id);
      if (user) {
        seenQueue.current.add(id);
        clearTimeout(flushTimer.current);
        flushTimer.current = setTimeout(flushSeen, 1500);
      }
    }
  }, [user, flushSeen]);

  const viewabilityConfig = useMemo(() => ({ itemVisiblePercentThreshold: 60 }), []);

  const fetchStatements = useCallback(async (pageNum = 1, append = false, feedType = feed) => {
    try {
      const endpoint = feedType === "following"
        ? `/statements/following?page=${pageNum}`
        : `/statements?page=${pageNum}`;
      const res = await api.get(endpoint);
      const fetched = res.data.statements;
      if (append) {
        setStatements(prev => [...prev, ...fetched]);
      } else {
        setStatements(fetched);
        setAllCaughtUp(fetched.length === 0 && !!user);
      }
      setHasMore(res.data.hasMore);
      pageRef.current = pageNum;
    } catch {}
  }, [user, feed]);

  useFocusEffect(
    useCallback(() => {
      flushSeen();
      setLoading(true);
      fetchStatements(1, false).finally(() => setLoading(false));
    }, [fetchStatements, flushSeen])
  );

  const switchFeed = (f: "forYou" | "following") => {
    if (f === feed) return;
    setFeed(f);
    setStatements([]);
    setAllCaughtUp(false);
    setLoading(true);
    fetchStatements(1, false, f).finally(() => setLoading(false));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setAllCaughtUp(false);
    await fetchStatements(1, false);
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await fetchStatements(pageRef.current + 1, true);
    setLoadingMore(false);
  };

  const resetSeen = async () => {
    await api.delete('/statements/seen').catch(() => {});
    setAllCaughtUp(false);
    setLoading(true);
    await fetchStatements(1, false);
    setLoading(false);
  };

  return (
    <FlatList
      data={statements}
      keyExtractor={s => s.id}
      renderItem={({ item }) => (
        <View style={{ height: ITEM_H, justifyContent: "center", paddingHorizontal: 12 }}>
          <StatementCard statement={item} isActive={isFocused && activeId === item.id} />
        </View>
      )}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      snapToInterval={ITEM_H}
      snapToAlignment="start"
      decelerationRate="fast"
      showsVerticalScrollIndicator={false}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      style={{ flex: 1, backgroundColor: colors.surface }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      ListHeaderComponent={<>
        {user && (
          <View style={{ flexDirection: "row", backgroundColor: "#fff", marginHorizontal: 12, marginTop: 8, marginBottom: 4, borderRadius: 999, padding: 4, borderWidth: 1, borderColor: "#f3f4f6" }}>
            {([["forYou", "For You"], ["following", "Following"]] as const).map(([key, label]) => (
              <TouchableOpacity key={key} onPress={() => switchFeed(key)} activeOpacity={0.8}
                style={{ flex: 1, paddingVertical: 7, alignItems: "center", borderRadius: 999, backgroundColor: feed === key ? colors.primary : "transparent" }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: feed === key ? "#fff" : colors.secondary }}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {!user ? (
        <View style={[s.banner, card, { marginHorizontal: 12, marginTop: 8, marginBottom: 4 }]}>
          <View>
            <Text style={{ fontWeight: "700", fontSize: 14, color: colors.nearBlack }}>Join the conversation</Text>
            <Text style={{ fontSize: 12, color: colors.secondary }}>Sign up to vote and post</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity onPress={() => router.push("/login")} style={s.loginBtn}>
              <Text style={{ fontWeight: "600", fontSize: 13, color: colors.nearBlack }}>Log in</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/register")} style={s.signupBtn}>
              <Text style={{ fontWeight: "600", fontSize: 13, color: colors.white }}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
      </>}
      ListEmptyComponent={loading ? (
        <View style={{ height: ITEM_H, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : allCaughtUp ? (
        <View style={{ height: ITEM_H, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "#f0fdf4", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <CheckCircle size={36} color="#16a34a" />
          </View>
          <Text style={{ fontSize: 20, fontWeight: "800", color: colors.nearBlack, marginBottom: 8, textAlign: "center" }}>You're all caught up!</Text>
          <Text style={{ fontSize: 14, color: colors.secondary, textAlign: "center", marginBottom: 24 }}>You've seen all statements. Start over to see them again.</Text>
          <TouchableOpacity onPress={resetSeen} style={{ backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 28, paddingVertical: 12 }}>
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Start over</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ height: ITEM_H, alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <MessageSquare size={28} color={colors.secondary} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: "700", color: colors.nearBlack, marginBottom: 8 }}>No statements yet</Text>
          <Text style={{ fontSize: 14, color: colors.secondary }}>Be the first to post!</Text>
        </View>
      )}
      ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ paddingVertical: 16 }} /> : null}
    />
  );
}

const s = StyleSheet.create({
  banner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, gap: 12 },
  loginBtn: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  signupBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
});
