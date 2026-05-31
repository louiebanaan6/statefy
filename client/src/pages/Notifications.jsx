import { useState, useEffect } from 'react';
import api from '../api/axios';
import NotificationItem from '../components/NotificationItem';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/notifications')
      .then(res => {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unread_count);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch {}
  };

  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-near-black">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-secondary mt-0.5">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-sm font-medium text-primary hover:underline"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="bg-white rounded-card shadow-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🔔</div>
            <h3 className="font-semibold text-near-black mb-2">No notifications yet</h3>
            <p className="text-sm text-secondary">When people interact with you, it'll show up here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 p-2">
            {notifications.map(n => (
              <NotificationItem key={n.id} notification={n} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
