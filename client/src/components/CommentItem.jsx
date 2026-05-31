import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { timeAgo } from '../utils/timeAgo';
import UserAvatar from './UserAvatar';
import VerifiedBadge from './VerifiedBadge';

const OPTION_COLORS = [
  { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
];

function getOptionColor(option, options) {
  if (!options || !option) return OPTION_COLORS[0];
  const idx = options.indexOf(option);
  return OPTION_COLORS[Math.max(0, idx) % OPTION_COLORS.length];
}

const HeartIcon = ({ filled }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);

const ReplyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

export default function CommentItem({ comment, statementOptions, onDelete, onReply, isReply = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(comment.user_liked);
  const [likeCount, setLikeCount] = useState(comment.like_count);
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  const optionColor = getOptionColor(comment.vote_option, statementOptions);

  const handleLike = async () => {
    if (!user) { navigate('/login'); return; }
    try {
      const res = liked
        ? await api.delete(`/comments/${comment.id}/like`)
        : await api.post(`/comments/${comment.id}/like`);
      setLiked(res.data.liked);
      setLikeCount(res.data.like_count);
    } catch {}
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setSubmittingReply(true);
    try {
      const res = await api.post(`/comments/${comment.id}/reply`, { content: replyText.trim() });
      onReply?.(res.data.comment);
      setReplyText('');
      setShowReplyBox(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to post reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const canDelete = user && (user.id === comment.user_id || user.is_admin);

  return (
    <div className={`${isReply ? 'ml-10 pl-3 border-l-2 border-gray-100' : ''}`}>
      <div className="flex gap-3 py-3">
        <div
          className="cursor-pointer flex-shrink-0"
          onClick={() => !comment.user_deleted && navigate(`/profile/${comment.username}`)}
        >
          <UserAvatar user={comment} size="sm" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span
              className="font-semibold text-sm text-near-black hover:underline cursor-pointer"
              onClick={() => !comment.user_deleted && navigate(`/profile/${comment.username}`)}
            >
              {comment.display_name}
            </span>
            {comment.is_verified ? <VerifiedBadge /> : null}
            <span className="text-xs text-secondary">@{comment.username}</span>
            {comment.is_creator && (
              <span className="text-xs font-semibold text-white bg-primary px-1.5 py-0.5 rounded-full">Creator</span>
            )}
            {comment.vote_option && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${optionColor.bg} ${optionColor.text} ${optionColor.border}`}>
                {comment.vote_option}
              </span>
            )}
          </div>

          <p className="text-sm text-near-black leading-relaxed mb-2">{comment.content}</p>

          <div className="flex items-center gap-3">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 text-xs font-medium transition-colors ${liked ? 'text-primary' : 'text-secondary hover:text-primary'}`}
            >
              <HeartIcon filled={liked} />
              <span>{likeCount}</span>
            </button>

            {!isReply && user && (
              <button
                onClick={() => setShowReplyBox(!showReplyBox)}
                className="flex items-center gap-1 text-xs font-medium text-secondary hover:text-primary transition-colors"
              >
                <ReplyIcon />
                Reply
              </button>
            )}

            {canDelete && (
              <button
                onClick={() => onDelete?.(comment.id)}
                className="flex items-center gap-1 text-xs font-medium text-secondary hover:text-red-500 transition-colors ml-auto"
              >
                <TrashIcon />
              </button>
            )}

            <span className="text-xs text-secondary">{timeAgo(comment.created_at)}</span>
          </div>

          {showReplyBox && (
            <div className="mt-2 flex gap-2">
              <input
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                placeholder="Write a reply..."
                maxLength={500}
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary"
              />
              <button
                onClick={handleReply}
                disabled={submittingReply || !replyText.trim()}
                className="text-xs font-semibold bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {submittingReply ? '...' : 'Reply'}
              </button>
            </div>
          )}
        </div>
      </div>

      {!isReply && comment.replies?.map(reply => (
        <CommentItem
          key={reply.id}
          comment={reply}
          statementOptions={statementOptions}
          onDelete={onDelete}
          isReply
        />
      ))}
    </div>
  );
}
