import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import StatementCard from '../components/StatementCard';

export default function Home() {
  const { user } = useAuth();
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  const fetchStatements = async (pageNum = 1) => {
    try {
      const res = await api.get(`/statements?page=${pageNum}`);
      if (pageNum === 1) {
        setStatements(res.data.statements);
      } else {
        setStatements(prev => [...prev, ...res.data.statements]);
      }
      setHasMore(res.data.hasMore);
    } catch {
      setError('Failed to load statements');
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchStatements(1).finally(() => setLoading(false));
  }, []);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchStatements(nextPage);
    setLoadingMore(false);
  };

  return (
    <div className="py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-near-black">Feed</h1>
          <p className="text-sm text-secondary mt-0.5">What people are stating</p>
        </div>
        {user && (
          <Link
            to="/create"
            className="bg-primary text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-primary-hover transition-colors"
          >
            + Statement
          </Link>
        )}
      </div>

      {/* Guest banner */}
      {!user && (
        <div className="bg-white rounded-card shadow-card p-4 mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-near-black text-sm">Join the conversation</p>
            <p className="text-xs text-secondary">Sign up to vote and post statements</p>
          </div>
          <div className="flex gap-2">
            <Link to="/login" className="text-sm font-medium text-near-black border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-surface transition-colors">Log in</Link>
            <Link to="/register" className="text-sm font-semibold bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary-hover transition-colors">Sign up</Link>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>
      )}

      {loading ? (
        <div className="flex flex-col gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-card shadow-card p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gray-100" />
                <div className="flex-1">
                  <div className="h-3 bg-gray-100 rounded w-32 mb-1" />
                  <div className="h-2.5 bg-gray-100 rounded w-20" />
                </div>
              </div>
              <div className="h-4 bg-gray-100 rounded w-full mb-2" />
              <div className="h-4 bg-gray-100 rounded w-4/5 mb-4" />
              <div className="flex gap-2">
                <div className="h-9 bg-gray-100 rounded-lg flex-1" />
                <div className="h-9 bg-gray-100 rounded-lg flex-1" />
              </div>
            </div>
          ))}
        </div>
      ) : statements.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">💬</div>
          <h3 className="text-lg font-semibold text-near-black mb-2">No statements yet</h3>
          <p className="text-secondary text-sm mb-4">Be the first to post a statement!</p>
          {user && (
            <Link to="/create" className="bg-primary text-white font-semibold px-6 py-2.5 rounded-full hover:bg-primary-hover transition-colors">
              Create Statement
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {statements.map(s => (
              <StatementCard key={s.id} statement={s} />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center mt-6">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="bg-white border border-gray-200 text-near-black font-medium px-6 py-2.5 rounded-full hover:bg-surface disabled:opacity-60 transition-colors shadow-sm"
              >
                {loadingMore ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
