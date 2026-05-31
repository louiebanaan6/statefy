import { useNavigate } from 'react-router-dom';
import { timeAgo } from '../utils/timeAgo';
import UserAvatar from './UserAvatar';
import VerifiedBadge from './VerifiedBadge';

const TYPE_LABELS = {
  like_statement: 'liked your statement',
  comment: 'commented on your statement',
  follow: 'started following you',
  like_comment: 'liked your comment',
  reply: 'replied to your comment',
};

export default function NotificationItem({ notification }) {
  const navigate = useNavigate();

  const actor = {
    display_name: notification.actor_display_name,
    username: notification.actor_username,
    avatar_url: notification.actor_avatar,
    is_verified: notification.actor_verified,
  };

  const handleClick = () => {
    if (notification.type === 'follow') {
      navigate(`/profile/${notification.actor_username}`);
    } else if (notification.reference_id) {
      navigate(`/statement/${notification.reference_id}`);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-surface transition-colors text-left rounded-lg
        ${!notification.is_read ? 'bg-primary/5' : ''}`}
    >
      <div className="relative flex-shrink-0">
        <UserAvatar user={actor} size="md" />
        {!notification.is_read && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-white" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="font-semibold text-sm text-near-black">{actor.display_name}</span>
          {actor.is_verified ? <VerifiedBadge /> : null}
          <span className="text-sm text-secondary">{TYPE_LABELS[notification.type] || notification.type}</span>
        </div>
        <p className="text-xs text-secondary mt-0.5">{timeAgo(notification.created_at)}</p>
      </div>
    </button>
  );
}
