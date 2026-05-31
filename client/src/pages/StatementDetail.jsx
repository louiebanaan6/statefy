import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { timeAgo } from '../utils/timeAgo';
import UserAvatar from '../components/UserAvatar';
import VerifiedBadge from '../components/VerifiedBadge';
import VoteButtons from '../components/VoteButtons';
import CommentItem from '../components/CommentItem';

const EyeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);

const HeartIcon = ({ filled }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

export default function StatementDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const commentsRef = useRef(null);

  const [statement, setStatement] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    const viewedKey = `viewed_${id}`;
    if (!sessionStorage.getItem(viewedKey)) {
      api.post(`/statements/${id}/view`).catch(() => {});
      sessionStorage.setItem(viewedKey, '1');
    }

    api.get(`/statements/${id}`)
      .then(res => setStatement(res.data.statement))
      .catch(() => setError('Statement not found'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    setCommentsLoading(true);
    api.get(`/comments/statement/${id}?sort=${sort}`)
      .then(res => setComments(res.data.comments))
      .catch(() => {})
      .finally(() => setCommentsLoading(false));
  }, [id, sort]);

  useEffect(() => {
    if (window.location.hash === '#comments' && commentsRef.current) {
      commentsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [loading]);

  const handleLike = async () => {
    if (!user) { navigate('/login'); return; }
    if (likeLoading) return;
    setLikeLoading(true);
    try {
      const res = statement.user_liked
        ? await api.delete(`/statements/${id}/like`)
        : await api.post(`/statements/${id}/like`);
      setStatement(prev => ({ ...prev, user_liked: res.data.liked, like_count: res.data.like_count }));
    } catch {}
    finally { setLikeLoading(false); }
  };

  const handleVoted = (option, results) => {
    setStatement(prev => ({
      ...prev,
      user_vote: option,
      vote_results: results,
      vote_count: prev.vote_count + 1,
    }));
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/comments/statement/${id}`, { content: commentText.trim() });
      setComments(prev => [res.data.comment, ...prev]);
      setCommentText('');
      setStatement(prev => ({ ...prev, comment_count: prev.comment_count + 1 }));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this statement?')) return;
    try {
      await api.delete(`/statements/${id}`);
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await api.delete(`/comments/${commentId}`);
      setComments(prev => prev.filter(c => c.id !== commentId));
      setStatement(prev => ({ ...prev, comment_count: Math.max(0, prev.comment_count - 1) }));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  const handleReply = (parentId, reply) => {
    setComments(prev => prev.map(c => {
      if (c.id === parentId) {
        return { ...c, replies: [...(c.replies || []), reply] };
      }
      return c;
    }));
    setStatement(prev => ({ ...prev, comment_count: prev.comment_count + 1 }));
  };

  if (loading) {
    return (
      <div className="py-4">
        <div className="bg-white rounded-card shadow-card p-4 animate-pulse">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gray-100" />
            <div className="flex-1">
              <div className="h-3 bg-gray-100 rounded w-32 mb-1" />
              <div className="h-2.5 bg-gray-100 rounded w-20" />
            </div>
          </div>
          <div className="h-6 bg-gray-100 rounded w-full mb-2" />
          <div className="h-6 bg-gray-100 rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (error || !statement) {
    return (
      <div className="py-8 text-center">
        <p className="text-secondary text-lg mb-4">{error || 'Statement not found'}</p>
        <button onClick={() => navigate('/')} className="text-primary font-semibold hover:underline">Go home</button>
      </div>
    );
  }

  const author = {
    display_name: statement.user_deleted ? '[deleted account]' : statement.display_name,
    username: statement.user_deleted ? 'deleted' : statement.username,
    avatar_url: statement.avatar_url,
    is_verified: statement.is_verified,
  };

  const canDelete = user && (user.id === statement.user_id || user.is_admin);

  return (
    <div className="py-4">
      {/* Back button */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-secondary hover:text-near-black transition-colors mb-4 font-medium text-sm">
        <BackIcon />
        Back
      </button>

      {/* Statement card */}
      <div className="bg-white rounded-card shadow-card p-5 mb-4">
        <div className="flex items-start gap-3 mb-4">
          <div onClick={() => !statement.user_deleted && navigate(`/profile/${author.username}`)}>
            <UserAvatar user={author} size="md" className="cursor-pointer hover:opacity-80 transition-opacity" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link to={`/profile/${author.username}`} className="font-bold text-near-black hover:underline">
                {author.display_name}
              </Link>
              {statement.is_verified ? <VerifiedBadge /> : null}
              <span className="text-secondary text-sm">@{author.username}</span>
            </div>
            <p className="text-xs text-secondary">{timeAgo(statement.created_at)}</p>
          </div>
          {canDelete && (
            <button onClick={handleDelete} className="text-secondary hover:text-red-500 transition-colors p-1">
              <TrashIcon />
            </button>
          )}
        </div>

        <p className="text-near-black font-semibold text-xl leading-relaxed mb-5">{statement.content}</p>

        <VoteButtons statement={statement} onVoted={handleVoted} />

        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-50">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 font-medium transition-colors
              ${statement.user_liked ? 'text-primary' : 'text-secondary hover:text-primary'}`}
          >
            <HeartIcon filled={statement.user_liked} />
            <span>{statement.like_count}</span>
          </button>

          <div className="flex items-center gap-1.5 text-sm text-secondary ml-auto">
            <EyeIcon />
            <span>{statement.view_count} views</span>
            <span className="mx-1">·</span>
            <span>{statement.vote_count} votes</span>
          </div>
        </div>
      </div>

      {/* Comments section */}
      <div ref={commentsRef} id="comments" className="bg-white rounded-card shadow-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <h2 className="font-bold text-near-black">Comments <span className="text-secondary font-normal text-sm">({statement.comment_count})</span></h2>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-primary"
          >
            <option value="newest">Newest</option>
            <option value="liked">Most liked</option>
          </select>
        </div>

        {/* Comment input */}
        {user ? (
          statement.user_vote ? (
            <form onSubmit={handleComment} className="px-5 py-4 border-b border-gray-50">
              <div className="flex gap-3">
                <UserAvatar user={user} size="sm" className="flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <textarea
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder="Share your thoughts..."
                    rows={2}
                    maxLength={500}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-primary resize-none transition-colors"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-secondary">{500 - commentText.length} chars left</span>
                    <button
                      type="submit"
                      disabled={submitting || !commentText.trim()}
                      className="bg-primary text-white text-sm font-semibold px-4 py-1.5 rounded-lg hover:bg-primary-hover disabled:opacity-60 transition-colors"
                    >
                      {submitting ? 'Posting...' : 'Comment'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div className="px-5 py-4 border-b border-gray-50 text-center">
              <p className="text-sm text-secondary">Vote on this statement to join the discussion</p>
            </div>
          )
        ) : (
          <div className="px-5 py-4 border-b border-gray-50 text-center">
            <p className="text-sm text-secondary">
              <Link to="/login" className="text-primary font-semibold hover:underline">Log in</Link> and vote to comment
            </p>
          </div>
        )}

        {/* Comments list */}
        <div className="divide-y divide-gray-50 px-5">
          {commentsLoading ? (
            <div className="py-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="py-8 text-center text-secondary text-sm">
              No comments yet. Be the first to share your thoughts!
            </div>
          ) : (
            comments.map(comment => (
              <CommentItem
                key={comment.id}
                comment={comment}
                statementOptions={statement.options}
                onDelete={handleDeleteComment}
                onReply={(reply) => handleReply(comment.id, reply)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
