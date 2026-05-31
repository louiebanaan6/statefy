import { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, Alert, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Heart, CornerUpLeft, Trash2 } from "lucide-react-native";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { timeAgo } from "../utils/timeAgo";
import { fmt } from "../utils/formatNumber";
import { colors } from "../constants/colors";
import UserAvatar from "./UserAvatar";
import VerifiedBadge from "./VerifiedBadge";

const OPTION_COLORS = [
  { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  { bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" },
  { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  { bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
];

function getColor(option: string | null, options: string[] | null) {
  if (!options || !option) return OPTION_COLORS[0];
  return OPTION_COLORS[Math.max(0, options.indexOf(option)) % OPTION_COLORS.length];
}

interface Props {
  comment: any;
  statementOptions: string[] | null;
  statementOwnerId?: string;
  onDelete?: (id: string) => void;
  onReply?: (reply: any) => void;
  isReply?: boolean;
}

export default function CommentItem({ comment, statementOptions, statementOwnerId, onDelete, onReply, isReply = false }: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const [liked, setLiked] = useState(!!comment.user_liked);
  const [likeCount, setLikeCount] = useState(comment.like_count);
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const color = getColor(comment.vote_option, statementOptions);
  // Statement owner + comment owner + admin can all delete comments
  const canDelete = user && (user.id === comment.user_id || user.is_admin || user.id === statementOwnerId);

  const handleLike = async () => {
    if (!user) { router.push("/login"); return; }
    try {
      const res = liked ? await api.delete(`/comments/${comment.id}/like`) : await api.post(`/comments/${comment.id}/like`);
      setLiked(res.data.liked);
      setLikeCount(res.data.like_count);
    } catch {}
  };

  const handleReply = async () => {
    if (!replyText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/comments/${comment.id}/reply`, { content: replyText.trim() });
      onReply?.(res.data.comment);
      setReplyText("");
      setShowReply(false);
    } catch (err: any) { Alert.alert("Error", err.response?.data?.error || "Failed to reply"); }
    finally { setSubmitting(false); }
  };

  const handleDelete = () => Alert.alert("Delete comment", "Are you sure?", [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: () => onDelete?.(comment.id) },
  ]);

  return (
    <View style={isReply ? s.replyContainer : undefined}>
      <View style={s.row}>
        <TouchableOpacity onPress={() => !comment.user_deleted && router.push(`/user/${comment.username}`)}>
          <UserAvatar user={comment} size="sm" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={s.nameRow}>
            <TouchableOpacity onPress={() => !comment.user_deleted && router.push(`/user/${comment.username}`)}>
              <Text style={s.name}>{comment.display_name}</Text>
            </TouchableOpacity>
            {!!comment.is_verified && <VerifiedBadge />}
            <Text style={s.username}>@{comment.username}</Text>
            {comment.is_creator && (
              <View style={{ backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ color: colors.white, fontSize: 10, fontWeight: "700" }}>Creator</Text>
              </View>
            )}
            {comment.vote_option && (
              <View style={{ backgroundColor: color.bg, borderColor: color.border, borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ color: color.text, fontSize: 10, fontWeight: "600" }}>{comment.vote_option}</Text>
              </View>
            )}
          </View>

          <Text style={s.content}>{comment.content}</Text>

          <View style={s.actions}>
            <TouchableOpacity onPress={handleLike} style={s.actionBtn} activeOpacity={0.7}>
              <Heart size={14} color={liked ? colors.primary : colors.secondary} fill={liked ? colors.primary : "none"} />
              <Text style={{ color: liked ? colors.primary : colors.secondary, fontSize: 12, fontWeight: "600" }}>{fmt(likeCount)}</Text>
            </TouchableOpacity>
            {!isReply && user && (
              <TouchableOpacity onPress={() => setShowReply(!showReply)} style={s.actionBtn} activeOpacity={0.7}>
                <CornerUpLeft size={14} color={colors.secondary} />
                <Text style={s.actionText}>Reply</Text>
              </TouchableOpacity>
            )}
            {canDelete && (
              <TouchableOpacity onPress={handleDelete} style={{ marginLeft: "auto" }} activeOpacity={0.7}>
                <Trash2 size={14} color={colors.secondary} />
              </TouchableOpacity>
            )}
            <Text style={s.time}>{timeAgo(comment.created_at)}</Text>
          </View>

          {showReply && (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <TextInput value={replyText} onChangeText={setReplyText} placeholder="Write a reply..." placeholderTextColor="#9ca3af"
                maxLength={500} style={s.replyInput} />
              <TouchableOpacity onPress={handleReply} disabled={submitting || !replyText.trim()}
                style={[s.replyBtn, { opacity: submitting || !replyText.trim() ? 0.5 : 1 }]} activeOpacity={0.8}>
                <Text style={{ color: colors.white, fontWeight: "700", fontSize: 12 }}>{submitting ? "..." : "Reply"}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {!isReply && comment.replies?.map((reply: any) => (
        <CommentItem key={reply.id} comment={reply} statementOptions={statementOptions} onDelete={onDelete} isReply />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  replyContainer: { marginLeft: 40, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: "#f3f4f6" },
  row: { flexDirection: "row", gap: 12, paddingVertical: 12 },
  nameRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginBottom: 4 },
  name: { fontWeight: "600", fontSize: 13, color: colors.nearBlack },
  username: { fontSize: 12, color: colors.secondary },
  content: { fontSize: 14, color: colors.nearBlack, lineHeight: 20, marginBottom: 8 },
  actions: { flexDirection: "row", alignItems: "center", gap: 16 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionText: { fontSize: 12, color: colors.secondary, fontWeight: "600" },
  time: { fontSize: 11, color: colors.secondary },
  replyInput: { flex: 1, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: colors.nearBlack },
  replyBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, justifyContent: "center" },
});
