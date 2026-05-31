import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Heart, MessageCircle, UserPlus, Reply } from "lucide-react-native";
import { timeAgo } from "../utils/timeAgo";
import { colors } from "../constants/colors";
import UserAvatar from "./UserAvatar";
import VerifiedBadge from "./VerifiedBadge";

const TYPE_CONFIG: Record<string, { label: string; Icon: any; color: string; bg: string }> = {
  like_statement: { label: "liked your statement", Icon: Heart, color: "#ef4444", bg: "#fef2f2" },
  like_comment:   { label: "liked your comment",   Icon: Heart, color: "#ef4444", bg: "#fef2f2" },
  comment:        { label: "commented on your statement", Icon: MessageCircle, color: "#3b82f6", bg: "#eff6ff" },
  reply:          { label: "replied to your comment", Icon: Reply, color: "#8b5cf6", bg: "#f5f3ff" },
  follow:         { label: "started following you", Icon: UserPlus, color: "#10b981", bg: "#ecfdf5" },
};

export default function NotificationItem({ notification }: { notification: any }) {
  const router = useRouter();
  const cfg = TYPE_CONFIG[notification.type] ?? { label: notification.type, Icon: MessageCircle, color: colors.secondary, bg: "#f9fafb" };
  const { Icon, color, bg } = cfg;
  const actor = {
    display_name: notification.actor_display_name,
    username: notification.actor_username,
    avatar_url: notification.actor_avatar,
    is_verified: notification.actor_verified,
  };

  const handlePress = () => {
    if (notification.type === "follow") router.push("/user/" + notification.actor_username as any);
    else if (notification.reference_id) router.push("/statement/" + notification.reference_id as any);
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}
      style={[s.row, { backgroundColor: notification.is_read ? "#fff" : "#fff8f8" }]}>
      <View style={{ position: "relative" }}>
        <UserAvatar user={actor} size="md" />
        <View style={[s.iconBadge, { backgroundColor: bg }]}>
          <Icon size={10} color={color} fill={notification.type.startsWith("like") ? color : "none"} />
        </View>
        {!notification.is_read && <View style={s.unreadDot} />}
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 4, marginBottom: 2 }}>
          <Text style={s.name}>{actor.display_name}</Text>
          {actor.is_verified ? <VerifiedBadge /> : null}
          <Text style={s.label}>{cfg.label}</Text>
        </View>
        <Text style={s.time}>{timeAgo(notification.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  iconBadge: { position: "absolute", bottom: -2, right: -2, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#e5e7eb" },
  unreadDot: { position: "absolute", top: -2, left: -2, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary, borderWidth: 1.5, borderColor: "#fff" },
  name: { fontWeight: "700", fontSize: 14, color: "#111827" },
  label: { fontSize: 14, color: "#6b7280" },
  time: { fontSize: 12, color: "#9ca3af" },
});
