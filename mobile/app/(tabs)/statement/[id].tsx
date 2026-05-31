import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, Image, Modal, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { Heart, Eye, Trash2, AlertTriangle, ChevronLeft, Music, Flag } from "lucide-react-native";
import api from "../../../api/axios";
import { useAuth } from "../../../context/AuthContext";
import { timeAgo } from "../../../utils/timeAgo";
import { fmt } from "../../../utils/formatNumber";
import { colors, card } from "../../../constants/colors";
import UserAvatar from "../../../components/UserAvatar";
import VerifiedBadge from "../../../components/VerifiedBadge";
import VoteButtons from "../../../components/VoteButtons";
import CommentItem from "../../../components/CommentItem";
import AudioPlayer from "../../../components/AudioPlayer";

export default function StatementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [statement, setStatement] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [likeLoading, setLikeLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sort, setSort] = useState("newest");
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  const [reportModal, setReportModal] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reported, setReported] = useState(false);

  const REPORT_REASONS = ["Spam", "Hate speech", "Misinformation", "Harassment", "Inappropriate content", "Other"];

  const handleReport = async (reason: string) => {
    if (!user) { setReportModal(false); router.push("/login"); return; }
    setReportSubmitting(true);
    try {
      await api.post(`/statements/${id}/report`, { reason });
      setReported(true);
      setReportModal(false);
      Alert.alert("Reported", "Thanks for keeping Statefy safe.");
    } catch (err: any) {
      const msg = err.response?.data?.error || "Failed";
      if (msg === "Already reported") { setReported(true); setReportModal(false); Alert.alert("Already reported", "You already reported this statement."); }
      else Alert.alert("Error", msg);
    } finally { setReportSubmitting(false); }
  };

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      setLoading(true);
      api.post(`/statements/${id}/view`).catch(() => {});
      api.get(`/statements/${id}`).then(res => setStatement(res.data.statement)).catch(() => router.back()).finally(() => setLoading(false));
    }, [id])
  );

  useEffect(() => {
    if (!id) return;
    setCommentsLoading(true);
    api.get(`/comments/statement/${id}?sort=${sort}`).then(res => setComments(res.data.comments)).catch(() => {}).finally(() => setCommentsLoading(false));
  }, [id, sort]);

  const handleLike = async () => {
    if (!user) { router.push("/login"); return; }
    if (likeLoading || !statement) return;
    setLikeLoading(true);
    try {
      const res = statement.user_liked ? await api.delete(`/statements/${id}/like`) : await api.post(`/statements/${id}/like`);
      setStatement((p: any) => ({ ...p, user_liked: res.data.liked, like_count: res.data.like_count }));
    } catch {} finally { setLikeLoading(false); }
  };

  const handleComment = async () => {
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/comments/statement/${id}`, { content: commentText.trim() });
      setComments(prev => [res.data.comment, ...prev]);
      setCommentText("");
      setStatement((p: any) => ({ ...p, comment_count: p.comment_count + 1 }));
    } catch (err: any) { Alert.alert("Error", err.response?.data?.error || "Failed to post comment"); }
    finally { setSubmitting(false); }
  };

  const handleDelete = () => Alert.alert("Delete statement", "Are you sure?", [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: async () => { try { await api.delete(`/statements/${id}`); router.back(); } catch (err: any) { Alert.alert("Error", err.response?.data?.error || "Failed"); } } },
  ]);

  const handleDeleteComment = (commentId: string) => {
    setDeleteCommentId(commentId);
  };

  const confirmDeleteComment = async () => {
    if (!deleteCommentId) return;
    try {
      await api.delete(`/comments/${deleteCommentId}`);
      setComments(prev => prev.filter(c => c.id !== deleteCommentId));
      setStatement((p: any) => ({ ...p, comment_count: Math.max(0, p.comment_count - 1) }));
    } catch (err: any) { Alert.alert("Error", err.response?.data?.error || "Failed"); }
    finally { setDeleteCommentId(null); }
  };

  if (loading) return <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />;
  if (!statement) return null;

  const author = { display_name: statement.user_deleted ? "[deleted account]" : statement.display_name, username: statement.user_deleted ? "deleted" : statement.username, avatar_url: statement.avatar_url };
  const canDelete = user && (user.id === statement.user_id || user.is_admin);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.surface }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={insets.top + 56}>
      {/* Custom header */}
      <View style={[s.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={20} color={colors.nearBlack} />
          <Text style={s.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Statement</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Statement card */}
        <View style={[s.statCard, card]}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
            <TouchableOpacity onPress={() => !statement.user_deleted && router.push(`/user/${author.username}`)}>
              <UserAvatar user={author} size="md" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <TouchableOpacity onPress={() => !statement.user_deleted && router.push(`/user/${author.username}`)}>
                  <Text style={{ fontWeight: "700", fontSize: 15, color: colors.nearBlack }}>{author.display_name}</Text>
                </TouchableOpacity>
                {!!statement.is_verified && <VerifiedBadge />}
                <Text style={{ fontSize: 13, color: colors.secondary }}>@{author.username}</Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.secondary }}>{timeAgo(statement.created_at)}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {user && user.id !== statement.user_id && (
                <TouchableOpacity onPress={() => setReportModal(true)} activeOpacity={0.7}>
                  <Flag size={18} color={reported ? "#ef4444" : colors.secondary} />
                </TouchableOpacity>
              )}
              {canDelete && <TouchableOpacity onPress={handleDelete}><Trash2 size={18} color={colors.secondary} /></TouchableOpacity>}
            </View>
          </View>
          <Text style={{ fontWeight: "700", fontSize: 19, color: colors.nearBlack, lineHeight: 28, marginBottom: statement.photo_url || statement.audio_url ? 12 : 20 }}>{statement.content}</Text>
          {statement.photo_url ? (
            <Image source={{ uri: statement.photo_url }} style={{ width: "100%", height: 220, borderRadius: 12, marginBottom: statement.audio_url ? 12 : 20 }} resizeMode="cover" />
          ) : null}
          {statement.audio_url ? (
            <View style={{ marginBottom: 20 }}>
              <AudioPlayer url={statement.audio_url} title={statement.audio_title} autoPlay active={isFocused} />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, backgroundColor: "#f0fdf4", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignSelf: "flex-start" }}>
                <Music size={11} color="#16a34a" />
                <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: "600", color: "#16a34a", maxWidth: 220 }}>
                  {statement.audio_title || "Now playing"}
                </Text>
              </View>
            </View>
          ) : null}
          <VoteButtons statement={statement} onVoted={(opt, res) => setStatement((p: any) => ({ ...p, user_vote: opt, vote_results: res, vote_count: p.vote_count + 1 }))} />
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#f9fafb" }}>
            <TouchableOpacity onPress={handleLike} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginRight: 16 }} activeOpacity={0.7}>
              <Heart size={20} color={statement.user_liked ? colors.primary : colors.secondary} fill={statement.user_liked ? colors.primary : "none"} />
              <Text style={{ color: statement.user_liked ? colors.primary : colors.secondary, fontWeight: "600", fontSize: 14 }}>{fmt(statement.like_count)}</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginLeft: "auto" }}>
              <Eye size={14} color={colors.secondary} />
              <Text style={{ fontSize: 12, color: colors.secondary }}>{fmt(statement.view_count)} views</Text>
              <Text style={{ fontSize: 12, color: colors.secondary, marginHorizontal: 4 }}>·</Text>
              <Text style={{ fontSize: 12, color: colors.secondary }}>{fmt(statement.vote_count)} votes</Text>
            </View>
          </View>
        </View>

        {/* Comments */}
        <View style={[card, { overflow: "hidden" }]}>
          <View style={s.commentsHeader}>
            <Text style={{ fontWeight: "700", fontSize: 16, color: colors.nearBlack }}>
              Comments <Text style={{ fontWeight: "400", fontSize: 14, color: colors.secondary }}>({fmt(statement.comment_count)})</Text>
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {["newest", "liked"].map(sv => (
                <TouchableOpacity key={sv} onPress={() => setSort(sv)}
                  style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: sort === sv ? colors.primary : colors.surface }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: sort === sv ? colors.white : colors.secondary }}>{sv === "newest" ? "Newest" : "Top"}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {user ? (
            statement.user_vote ? (
              <View style={s.commentInput}>
                <UserAvatar user={user} size="sm" />
                <View style={{ flex: 1 }}>
                  <TextInput value={commentText} onChangeText={setCommentText} placeholder="Share your thoughts..." placeholderTextColor="#9ca3af" multiline maxLength={500}
                    style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: colors.nearBlack, minHeight: 44 }} />
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                    <Text style={{ fontSize: 12, color: colors.secondary }}>{500 - commentText.length} left</Text>
                    <TouchableOpacity onPress={handleComment} disabled={submitting || !commentText.trim()}
                      style={{ backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, opacity: submitting || !commentText.trim() ? 0.5 : 1 }}>
                      <Text style={{ color: colors.white, fontWeight: "700", fontSize: 13 }}>{submitting ? "..." : "Comment"}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <View style={s.voteBanner}>
                <Text style={{ fontSize: 14, color: colors.secondary, textAlign: "center" }}>Vote to join the discussion</Text>
              </View>
            )
          ) : (
            <View style={s.voteBanner}>
              <Text style={{ fontSize: 14, color: colors.secondary, textAlign: "center" }}>
                <Text style={{ color: colors.primary, fontWeight: "600" }} onPress={() => router.push("/login")}>Log in</Text> and vote to comment
              </Text>
            </View>
          )}

          <View style={{ paddingHorizontal: 16 }}>
            {commentsLoading ? <ActivityIndicator color={colors.primary} style={{ paddingVertical: 32 }} /> :
              comments.length === 0 ? <Text style={{ fontSize: 14, color: colors.secondary, textAlign: "center", paddingVertical: 32 }}>No comments yet</Text> :
              comments.map(c => (
                <View key={c.id} style={{ borderTopWidth: 1, borderTopColor: "#f9fafb" }}>
                  <CommentItem comment={c} statementOptions={statement.options} statementOwnerId={statement.user_id} onDelete={handleDeleteComment}
                    onReply={(reply) => setComments(prev => prev.map(x => x.id === c.id ? { ...x, replies: [...(x.replies || []), reply] } : x))} />
                </View>
              ))}
          </View>
        </View>
      </ScrollView>

      {/* Report modal */}
      <Modal visible={reportModal} transparent animationType="slide" onRequestClose={() => setReportModal(false)}>
        <Pressable style={dm.overlay} onPress={() => setReportModal(false)}>
          <View style={[dm.sheet, { paddingBottom: 32 }]}>
            <View style={{ width: 48, height: 48, borderRadius: 999, backgroundColor: "#fef2f2", alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 12 }}>
              <Flag size={24} color="#ef4444" />
            </View>
            <Text style={{ fontWeight: "800", fontSize: 17, color: colors.nearBlack, textAlign: "center", marginBottom: 4 }}>Report statement</Text>
            <Text style={{ fontSize: 13, color: colors.secondary, textAlign: "center", marginBottom: 20 }}>Why are you reporting this?</Text>
            {REPORT_REASONS.map(reason => (
              <TouchableOpacity key={reason} onPress={() => !reportSubmitting && handleReport(reason)}
                style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f3f4f6", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
                activeOpacity={0.7}>
                <Text style={{ fontSize: 15, color: colors.nearBlack }}>{reason}</Text>
                {reportSubmitting && <ActivityIndicator size="small" color={colors.primary} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setReportModal(false)} style={{ marginTop: 12, paddingVertical: 12, alignItems: "center" }}>
              <Text style={{ color: colors.secondary, fontWeight: "600" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Delete comment confirmation modal */}
      <Modal visible={!!deleteCommentId} transparent animationType="fade" onRequestClose={() => setDeleteCommentId(null)}>
        <Pressable style={dm.overlay} onPress={() => setDeleteCommentId(null)}>
          <View style={dm.sheet}>
            <View style={{ width: 48, height: 48, borderRadius: 999, backgroundColor: "#fef2f2", alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 12 }}>
              <AlertTriangle size={24} color="#ef4444" />
            </View>
            <Text style={{ fontWeight: "800", fontSize: 17, color: colors.nearBlack, textAlign: "center", marginBottom: 6 }}>Delete comment?</Text>
            <Text style={{ fontSize: 14, color: colors.secondary, textAlign: "center", marginBottom: 24 }}>This action cannot be undone.</Text>
            <TouchableOpacity onPress={confirmDeleteComment}
              style={{ backgroundColor: "#ef4444", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginBottom: 10 }}>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setDeleteCommentId(null)}
              style={{ backgroundColor: "#f3f4f6", borderRadius: 12, paddingVertical: 14, alignItems: "center" }}>
              <Text style={{ color: colors.nearBlack, fontWeight: "600", fontSize: 15 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const dm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, width: "100%", paddingBottom: 40 },
});

const s = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8, paddingVertical: 10, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 2, paddingVertical: 6, paddingHorizontal: 8 },
  backText: { fontSize: 16, color: colors.nearBlack, fontWeight: "500" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: colors.nearBlack },
  statCard: { padding: 20, marginBottom: 16 },
  commentsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f9fafb" },
  commentInput: { flexDirection: "row", gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: "#f9fafb" },
  voteBanner: { paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#f9fafb" },
});
