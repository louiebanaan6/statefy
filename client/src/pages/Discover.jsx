import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { timeAgo } from '../utils/timeAgo';
import UserAvatar from '../components/UserAvatar';
import VerifiedBadge from '../components/VerifiedBadge';
import StatementCard from '../components/StatementCard';

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

function UserCard({ user: u }) {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const handleFollow = async (e) => {
    e.stopPropagation();
    if (!currentUser) { navigate('/login'); return; }
    if (currentUser.username === u.username) return;
    setFollowLoading(true);
    try {
      if (following) {
        await api.delete(`/users/${u.username}/follow`);
        setFollowing(false);
      } else {
        await api.post(`/users/${u.username}/follow`);
        setFollowing(true);
      }
    } catch {}
    finally { setFollowLoading(false); }
  };

  return (
    <div
      onClick={() => navigate(`/profile/${u.username}`)}
      className="bg-white rounded-card shadow-card p-4 cursor-pointer hover:shadow-card-hover transition-shadow flex items-center gap-3"
    >
      <UserAvatar user={u} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-sm text-near-black truncate">{u.display_name}</span>
          {u.is_verified ? <VerifiedBadge /> : null}
        </div>
        <span className="text-xs text-secondary">@{u.username}</span>
        {u.bio && <p className="text-xs text-near-black mt-0.5 truncate">{u.bio}</p>}
      </div>
      {currentUser && currentUser.username !== u.username && (
        <button
          onClick={handleFollow}
          disabled={followLoading}
          className={`text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0 transition-colors disabled:opacity-60
            ${following ? 'border border-gray-200 text-near-black hover:border-red-200 hover:text-red-600' : 'bg-primary text-white hover:bg-primary-hover'}`}
        >
          {followLoading ? '...' : following ? 'Following' : 'Follow'}
        </button>
      )}
    </div>
  );
}

export default function Discover() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [trending, setTrending] = useState([]);
  const [suggested, setSuggested] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    api.get('/statements/trending')
      .then(res => setTrending(res.data.statements))
      .catch(() => {})
      .finally(() => setTrendingLoading(false));

    api.get('/search?q=')
      .then(res => setSuggested(res.data.suggested_users || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults(null); return; }
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`/search?q=${encodeURIComponent(query)}`);
        setResults(res.data);
      } catch {} finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div className="py-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-near-black">Discover</h1>
        <p className="text-sm text-secondary mt-0.5">Find statements and people</p>
      </div>

      {/* Search bar */}
      <div className="relative mb-6">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary">
          <SearchIcon />
        </span>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search statements and people..."
          className="w-full bg-white border border-gray-200 rounded-full pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-primary shadow-sm transition-colors"
        />
        {searching && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </span>
        )}
      </div>

      {/* Search results */}
      {results ? (
        <div className="flex flex-col gap-6">
          {results.users?.length > 0 && (
            <div>
              <h2 className="font-bold text-near-black mb-3">People</h2>
              <div className="flex flex-col gap-3">
                {results.users.map(u => <UserCard key={u.id} user={u} />)}
              </div>
            </div>
          )}

          {results.statements?.length > 0 && (
            <div>
              <h2 className="font-bold text-near-black mb-3">Statements</h2>
              <div className="flex flex-col gap-3">
                {results.statements.map(s => (
                  <Link
                    key={s.id}
                    to={`/statement/${s.id}`}
                    className="bg-white rounded-card shadow-card p-4 hover:shadow-card-hover transition-shadow block"
                  >
                    <p className="font-medium text-near-black text-sm leading-relaxed mb-2">{s.content}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-secondary">@{s.username}</span>
                      <span className="text-xs text-secondary">·</span>
                      <span className="text-xs text-secondary">{timeAgo(s.created_at)}</span>
                      <span className="text-xs text-secondary ml-auto">{s.vote_count} votes</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {results.users?.length === 0 && results.statements?.length === 0 && (
            <div className="text-center py-8">
              <p className="text-secondary">No results for "{query}"</p>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Suggested users */}
          {suggested.length > 0 && (
            <div className="mb-6">
              <h2 className="font-bold text-near-black mb-3">Suggested people</h2>
              <div className="flex flex-col gap-3">
                {suggested.map(u => <UserCard key={u.id} user={u} />)}
              </div>
            </div>
          )}

          {/* Trending statements */}
          <div>
            <h2 className="font-bold text-near-black mb-3">Trending this week</h2>
            {trendingLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : trending.length === 0 ? (
              <p className="text-secondary text-sm text-center py-8">No trending statements yet</p>
            ) : (
              <div className="flex flex-col gap-4">
                {trending.map(s => <StatementCard key={s.id} statement={s} />)}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
