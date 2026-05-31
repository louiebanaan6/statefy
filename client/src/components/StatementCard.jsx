import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { timeAgo } from '../utils/timeAgo';
import UserAvatar from './UserAvatar';
import VerifiedBadge from './VerifiedBadge';
import VoteButtons from './VoteButtons';

const HeartIcon = ({ filled }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);

const CommentIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);

const VoteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

export default function StatementCard({ statement: initialStatement, onClick }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [statement, setStatement] = useState(initialStatement);
  const [likeLoading, setLikeLoading] = useState(false);

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    if (likeLoading) return;
    setLikeLoading(true);
    try {
      const liked = statement.user_liked;
      const res = liked
        ? await api.delete(`/statements/${statement.id}/like`)
        : await api.post(`/statements/${statement.id}/like`);
      setStatement(prev => ({ ...prev, user_liked: res.data.liked, like_count: res.data.like_count }));
    } catch {}
    finally { setLikeLoading(false); }
  };

  const handleVoted = (option, results) => {
    setStatement(prev => ({ ...prev, user_vote: option, vote_results: results, vote_count: prev.vote_count + 1 }));
  };

  const handleCardClick = () => {
    if (onClick) onClick();
    else navigate(`/statement/${statement.id}`);
  };

  const author = {
    display_name: statement.user_deleted ? '[deleted account]' : statement.display_name,
    username: statement.user_deleted ? 'deleted' : statement.username,
    avatar_url: statement.avatar_url,
    is_verified: statement.is_verified,
  };

  return (
    <article
      className="bg-white rounded-card shadow-card hover:shadow-card-hover transition-shadow cursor-pointer p-4"
      onClick={handleCardClick}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div onClick={(e) => { e.stopPropagation(); navigate(`/profile/${author.username}`); }}>
          <UserAvatar user={author} size="md" className="cursor-pointer hover:opacity-80 transition-opacity" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="font-semibold text-near-black hover:underline cursor-pointer"
              onClick={(e) => { e.stopPropagation(); navigate(`/profile/${author.username}`); }}
            >
              {author.display_name}
            </span>
            {statement.is_verified ? <VerifiedBadge /> : null}
            <span className="text-secondary text-sm">@{author.username}</span>
          </div>
          <p className="text-xs text-secondary">{timeAgo(statement.created_at)}</p>
        </div>
      </div>

      {/* Content */}
      <p className="text-near-black font-medium text-base leading-relaxed mb-4">{statement.content}</p>

      {/* Vote buttons */}
      <div onClick={(e) => e.stopPropagation()}>
        <VoteButtons statement={statement} onVoted={handleVoted} compact />
      </div>

      {/* Footer stats */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-50">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 text-sm font-medium transition-colors
            ${statement.user_liked ? 'text-primary' : 'text-secondary hover:text-primary'}`}
        >
          <HeartIcon filled={statement.user_liked} />
          <span>{statement.like_count}</span>
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/statement/${statement.id}#comments`); }}
          className="flex items-center gap-1.5 text-sm font-medium text-secondary hover:text-primary transition-colors"
        >
          <CommentIcon />
          <span>{statement.comment_count}</span>
        </button>

        <div className="flex items-center gap-1.5 text-xs text-secondary ml-auto">
          <EyeIcon />
          <span>{statement.view_count}</span>
          <span className="mx-1">·</span>
          <VoteIcon />
          <span>{statement.vote_count}</span>
        </div>
      </div>
    </article>
  );
}
