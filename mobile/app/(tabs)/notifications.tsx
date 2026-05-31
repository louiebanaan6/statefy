import { useState, useEffect } from "react";
import { FlatList, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { Bell } from "lucide-react-native";
import api from "../../api/axios";
import { colors } from "../../constants/colors";
import NotificationItem from "../../components/NotificationItem";

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/notifications")
      .then(res => { setNotifications(res.data.notifications); setUnreadCount(res.data.unread_count); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const markAllRead = async () => {
    try {
      await api.put("/notifications/read-all");
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch {}
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      {unreadCount > 0 && (
        <View style={s.topBar}>
          <TouchableOpacity onPress={markAllRead}>
            <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 14 }}>Mark all read</Text>
          </TouchableOpacity>
        </View>
      )}
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={n => n.id}
          renderItem={({ item }) => <NotificationItem notification={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: "#f3f4f6" }} />}
          style={{ backgroundColor: colors.white }}
          contentContainerStyle={notifications.length === 0 ? { flex: 1 } : { paddingBottom: 32 }}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 80 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Bell size={28} color={colors.secondary} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: "700", color: colors.nearBlack, marginBottom: 8 }}>No notifications</Text>
              <Text style={{ fontSize: 14, color: colors.secondary, textAlign: "center", paddingHorizontal: 32 }}>When people interact with you, it'll show up here</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  topBar: { flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
});
