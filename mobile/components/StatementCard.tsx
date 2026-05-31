import { useState } from "react";
import { View, Text, TouchableOpacity, Pressable, StyleSheet, Image, Share } from "react-native";
import { useRouter } from "expo-router";
import { Heart, MessageCircle, Eye, Activity, Music, Share2 } from "lucide-react-native";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { timeAgo } from "../utils/timeAgo";
import { fmt } from "../utils/formatNumber";
import { colors, card } from "../constants/colors";
import UserAvatar from "./UserAvatar";
import VerifiedBadge from "./VerifiedBadge";
import VoteButtons from "./VoteButtons";
import AudioPlayer from "./AudioPlayer";

export default function StatementCard({ statement: initial, onUpdate, fullHeight = false, isActive = false }: { statement: any; onUpdate?: (u: any) => void; fullHeight?: boolean; isActive?: boolean }) {
  const { user } = useAuth();
  const router = useRouter();
  const [stmt, setStmt] = useState(initial);
  const [likeLoading, setLikeLoading] = useState(false);

  const update = (patch: any) => { const next = { ...stmt, ...patch }; setStmt(next); onUpdate?.(next); };

  const handleShare = () => Share.share({
    message: `"${stmt.content}" — Vote on Statefy`,
  });

  const handleLike = async () => {
    if (!user) { router.push("/login"); return; }
    if (likeLoading) return;
    setLikeLoading(true);
    try {
      const res = stmt.user_liked ? await api.delete(`/statements/${stmt.id}/like`) : await api.post(`/statements/${stmt.id}/like`);
      update({ user_liked: res.data.liked, like_count: res.data.like_count });
    } catch {}
    finally { setLikeLoading(false); }
  };

  const author = {
    display_name: stmt.user_deleted ? "[deleted account]" : stmt.display_name,
    username: stmt.user_deleted ? "deleted" : stmt.username,
    avatar_url: stmt.avatar_url,
  };

  return (
    <View style={[s.card, card, fullHeight && s.fullCard]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => !stmt.user_deleted && router.push(`/user/${author.username}`)} activeOpacity={0.7}>
          <UserAvatar user={author} size="md" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <TouchableOpacity onPress={() => !stmt.user_deleted && router.push(`/user/${author.username}`)}>
              <Text style={s.displayName}>{author.display_name}</Text>
            </TouchableOpacity>
            {!!stmt.is_verified && <VerifiedBadge />}
            <Text style={s.username}>@{author.username}</Text>
          </View>
          <Text style={s.time}>{timeAgo(stmt.created_at)}</Text>
        </View>
        {/* Tap to open detail */}
        <TouchableOpacity onPress={() => router.push(`/statement/${stmt.id}`)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MessageCircle size={18} color={colors.secondary} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <Pressable onPress={() => router.push(`/statement/${stmt.id}`)}>
        <Text style={s.content}>{stmt.content}</Text>

        {/* Photo */}
        {stmt.photo_url ? (
          <Image source={{ uri: stmt.photo_url }} style={s.photo} resizeMode="cover" />
        ) : null}

        {/* Audio */}
        {stmt.audio_url ? (
          <>
            <AudioPlayer url={stmt.audio_url} title={stmt.audio_title} autoPlay active={isActive} />
            {isActive && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12, backgroundColor: "#f0fdf4", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignSelf: "flex-start" }}>
                <Music size={11} color="#16a34a" />
                <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: "600", color: "#16a34a", maxWidth: 200 }}>
                  {stmt.audio_title || "Now playing"}
                </Text>
              </View>
            )}
          </>
        ) : null}
      </Pressable>

      {/* Vote */}
      <VoteButtons statement={stmt} onVoted={(opt, res) => update({ user_vote: opt, vote_results: res, vote_count: stmt.vote_count + 1 })} compact />

      {/* Footer */}
      <View style={s.footer}>
        <TouchableOpacity onPress={handleLike} style={s.footerBtn} activeOpacity={0.7}>
          <Heart size={18} color={stmt.user_liked ? colors.primary : colors.secondary} fill={stmt.user_liked ? colors.primary : "none"} />
          <Text style={{ color: stmt.user_liked ? colors.primary : colors.secondary, fontSize: 13, fontWeight: "600" }}>{fmt(stmt.like_count)}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push(`/statement/${stmt.id}`)} style={s.footerBtn} activeOpacity={0.7}>
          <MessageCircle size={18} color={colors.secondary} />
          <Text style={s.footerText}>{fmt(stmt.comment_count)}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleShare} style={s.footerBtn} activeOpacity={0.7}>
          <Share2 size={18} color={colors.secondary} />
        </TouchableOpacity>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginLeft: "auto" }}>
          <Eye size={14} color={colors.secondary} />
          <Text style={s.footerText}>{fmt(stmt.view_count)}</Text>
          <Text style={[s.footerText, { marginHorizontal: 4 }]}>·</Text>
          <Activity size={14} color={colors.secondary} />
          <Text style={s.footerText}>{fmt(stmt.vote_count)}</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { padding: 16 },
  fullCard: { flex: 1 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 14 },
  displayName: { fontWeight: "700", fontSize: 15, color: colors.nearBlack },
  username: { fontSize: 12, color: colors.secondary },
  time: { fontSize: 11, color: colors.secondary, marginTop: 2 },
  content: { color: colors.nearBlack, fontWeight: "600", fontSize: 16, lineHeight: 24, marginBottom: 14 },
  photo: { width: "100%", height: 220, borderRadius: 12, marginBottom: 14 },
  footer: { flexDirection: "row", alignItems: "center", marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f9fafb" },
  footerBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginRight: 16 },
  footerText: { color: colors.secondary, fontSize: 13, fontWeight: "600" },
});
