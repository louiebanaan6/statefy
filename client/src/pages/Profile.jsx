import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { timeAgo } from '../utils/timeAgo';
import UserAvatar from '../components/UserAvatar';
import VerifiedBadge from '../components/VerifiedBadge';
import StatementCard from '../components/StatementCard';

export default function Profile() {
  const { username } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [statements, setStatements] = useState([]);
  const [liked, setLiked] = useState([]);
  const [tab, setTab] = useState('statements');
  const [loading, setLoading] = useState(true);
  const [loadingStatements, setLoadingStatements] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [error, setError] = useState('');

  const isOwnProfile = currentUser?.username?.toLowerCase() === username?.toLowerCase();

  useEffect(() => {
    setLoading(true);
    setStatements([]);
    setLiked([]);
    api.get(`/users/${username}`)
      .then(res => setProfile(res.data.user))
      .catch(() => setError('User not found'))
      .finally(() => setLoading(false));
  }, [username]);

  useEffect(() => {
    if (!profile) return;
    setLoadingStatements(true);
    const endpoint = tab === 'statements'
      ? `/users/${username}/statements`
      : `/users/${username}/liked`;

    api.get(endpoint)
      .then(res => {
        if (tab === 'statements') setStatements(res.data.statements);
        else setLiked(res.data.statements);
      })
      .catch(() => {})
      .finally(() => setLoadingStatements(false));
  }, [profile, tab, username]);

  const handleFollow = async () => {
    if (!currentUser) { navigate('/login'); return; }
    setFollowLoading(true);
    try {
      if (profile.is_following) {
        await api.delete(`/users/${username}/follow`);
        setProfile(prev => ({ ...prev, is_following: false, follower_count: prev.follower_count - 1 }));
      } else {
        await api.post(`/users/${username}/follow`);
        setProfile(prev => ({ ...prev, is_following: true, follower_count: prev.follower_count + 1 }));
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update follow');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleAdminBan = async () => {
    if (!window.confirm(profile.is_banned ? 'Unban this user?' : 'Ban this user?')) return;
    try {
      const res = await api.put(`/admin/users/${profile.id}/ban`);
      setProfile(prev => ({ ...prev, is_banned: res.data.is_banned }));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  const handleAdminVerify = async () => {
    try {
      const res = await api.put(`/admin/users/${profile.id}/verify`);
      setProfile(prev => ({ ...prev, is_verified: res.data.is_verified }));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  if (loading) {
    return (
      <div className="py-4">
        <div className="bg-white rounded-card shadow-card p-6 mb-4 animate-pulse">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-20 h-20 rounded-full bg-gray-100" />
            <div className="flex-1">
              <div className="h-5 bg-gray-100 rounded w-40 mb-2" />
              <div className="h-3.5 bg-gray-100 rounded w-28 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="py-8 text-center">
        <p className="text-secondary text-lg mb-4">{error || 'User not found'}</p>
        <button onClick={() => navigate('/')} className="text-primary font-semibold hover:underline">Go home</button>
      </div>
    );
  }

  const displayStatements = tab === 'statements' ? statements : liked;

  return (
    <div className="py-4">
      {/* Profile header */}
      <div className="bg-white rounded-card shadow-card p-5 mb-4">
        <div className="flex items-start gap-4 mb-4">
          <UserAvatar user={profile} size="xl" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-bold text-near-black">{profile.display_name}</h1>
              {profile.is_verified && <VerifiedBadge size="md" />}
              {profile.is_admin && (
                <span className="text-xs font-semibold bg-primary text-white px-2 py-0.5 rounded-full">Admin</span>
              )}
            </div>
            <p className="text-sm text-secondary mb-2">@{profile.username}</p>
            {profile.bio && <p className="text-sm text-near-black leading-relaxed mb-2">{profile.bio}</p>}
            <p className="text-xs text-secondary">Joined {timeAgo(profile.created_at)}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6 mb-4 py-3 border-y border-gray-50">
          <div className="text-center">
            <p className="font-bold text-near-black">{profile.statement_count || 0}</p>
            <p className="text-xs text-secondary">Statements</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-near-black">{profile.follower_count}</p>
            <p className="text-xs text-secondary">Followers</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-near-black">{profile.following_count}</p>
            <p className="text-xs text-secondary">Following</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          {isOwnProfile ? (
            <Link
              to="/settings"
              className="flex-1 text-center border border-gray-200 text-near-black text-sm font-semibold py-2 rounded-lg hover:bg-surface transition-colors"
            >
              Edit Profile
            </Link>
          ) : (
            !profile.is_admin && currentUser && (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-colors disabled:opacity-60
                  ${profile.is_following
                    ? 'border border-gray-200 text-near-black hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                    : 'bg-primary text-white hover:bg-primary-hover'
                  }`}
              >
                {followLoading ? '...' : profile.is_following ? 'Following' : 'Follow'}
              </button>
            )
          )}

          {currentUser?.is_admin && !isOwnProfile && (
            <>
              <button
                onClick={handleAdminBan}
                className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors border
                  ${profile.is_banned ? 'border-green-200 text-green-600 hover:bg-green-50' : 'border-red-200 text-red-600 hover:bg-red-50'}`}
              >
                {profile.is_banned ? 'Unban' : 'Ban'}
              </button>
              <button
                onClick={handleAdminVerify}
                className="text-sm font-semibold px-4 py-2 rounded-lg border border-primary text-primary hover:bg-primary/5 transition-colors"
              >
                {profile.is_verified ? 'Remove badge' : 'Verify'}
              </button>
            </>
          )}
        </div>

        {profile.is_banned && (
          <p className="text-xs text-red-500 font-medium mt-2 text-center">This account is banned</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4 bg-white rounded-t-card shadow-card overflow-hidden">
        {['statements', 'liked'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors capitalize
              ${tab === t ? 'text-primary border-b-2 border-primary -mb-px' : 'text-secondary hover:text-near-black'}`}
          >
            {t === 'statements' ? 'Statements' : 'Liked'}
          </button>
        ))}
      </div>

      {/* Content */}
      {loadingStatements ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : displayStatements.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-secondary">
            {tab === 'statements' ? 'No statements yet' : 'No liked statements yet'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {displayStatements.map(s => (
            <StatementCard key={s.id} statement={s} />
          ))}
        </div>
      )}
    </div>
  );
}
