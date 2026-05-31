import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { timeAgo } from '../utils/timeAgo';
import UserAvatar from '../components/UserAvatar';
import VerifiedBadge from '../components/VerifiedBadge';

// ── tiny helpers ────────────────────────────────────────────────────────────

function StatCard({ label, value, color }) {
  return (
    <div className="bg-white rounded-card shadow-card p-4 text-center">
      <p className={`text-3xl font-bold ${color || 'text-near-black'}`}>{value ?? '—'}</p>
      <p className="text-xs text-secondary mt-1">{label}</p>
    </div>
  );
}

function Badge({ children, color = 'primary' }) {
  const cls = {
    primary: 'bg-blue-50 text-primary',
    red:     'bg-red-50 text-red-700',
    green:   'bg-green-50 text-green-700',
    purple:  'bg-purple-50 text-purple-700',
  }[color] || 'bg-gray-100 text-gray-600';
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>{children}</span>;
}

function Spinner() {
  return <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />;
}

// ── Manage modal (followers / following / likes) ─────────────────────────────

function ManageModal({ user: target, onClose, onCountsSaved }) {
  const [tab, setTab] = useState('followers');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [followerVal, setFollowerVal] = useState(String(target.follower_count || 0));
  const [followingVal, setFollowingVal] = useState(String(target.following_count || 0));
  const [savingCounts, setSavingCounts] = useState(false);
  const [addQuery, setAddQuery] = useState('');
  const [addResults, setAddResults] = useState([]);
  const [addLikeQuery, setAddLikeQuery] = useState('');
  const [addLikeResults, setAddLikeResults] = useState([]);
  const addRef = useRef(null);

  useEffect(() => { loadData(tab); }, [tab]);

  const loadData = async (t) => {
    setLoading(true);
    setData([]);
    try {
      const r = await api.get(`/admin/users/${target.id}/${t}`);
      setData(r.data[t] || r.data.statements || []);
    } catch {} finally { setLoading(false); }
  };

  const saveCounts = async () => {
    setSavingCounts(true);
    try {
      const [fRes, fwRes] = await Promise.all([
        api.put(`/admin/users/${target.id}/set-followers`, { count: parseInt(followerVal) || 0 }),
        api.put(`/admin/users/${target.id}/set-following`, { count: parseInt(followingVal) || 0 }),
      ]);
      onCountsSaved(target.id, fRes.data.follower_count, fwRes.data.following_count);
      alert(`Saved — Followers: ${fRes.data.follower_count} · Following: ${fwRes.data.following_count}`);
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
    finally { setSavingCounts(false); }
  };

  const searchUsers = async (q) => {
    if (!q.trim()) { setAddResults([]); return; }
    try { const r = await api.get(`/admin/users?q=${encodeURIComponent(q)}`); setAddResults(r.data.users.filter(u => u.id !== target.id)); }
    catch {}
  };

  const searchStatements = async (q) => {
    if (!q.trim()) { setAddLikeResults([]); return; }
    try { const r = await api.get(`/admin/statements?q=${encodeURIComponent(q)}`); setAddLikeResults(r.data.statements); }
    catch {}
  };

  const addFollow = async (otherId) => {
    try {
      if (tab === 'followers') await api.post(`/admin/users/${otherId}/follow/${target.id}`);
      else await api.post(`/admin/users/${target.id}/follow/${otherId}`);
      setAddQuery(''); setAddResults([]);
      loadData(tab);
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };

  const removeFollow = async (otherId) => {
    try {
      if (tab === 'followers') await api.delete(`/admin/users/${otherId}/follow/${target.id}`);
      else await api.delete(`/admin/users/${target.id}/follow/${otherId}`);
      setData(prev => prev.filter(u => u.id !== otherId));
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };

  const giveLike = async (stmtId) => {
    try {
      await api.post(`/admin/users/${target.id}/likes/${stmtId}`);
      setAddLikeQuery(''); setAddLikeResults([]);
      loadData('likes');
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };

  const removeLike = async (stmtId) => {
    try {
      await api.delete(`/admin/users/${target.id}/likes/${stmtId}`);
      setData(prev => prev.filter(s => s.id !== stmtId));
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="font-bold text-near-black">{target.display_name}</p>
            <p className="text-xs text-secondary">@{target.username}</p>
          </div>
          <button onClick={onClose} className="text-secondary hover:text-near-black text-xl leading-none">✕</button>
        </div>

        {/* Count row */}
        <div className="flex items-end gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex-1">
            <label className="text-xs text-secondary block mb-1">Followers</label>
            <input type="number" value={followerVal} onChange={e => setFollowerVal(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-center focus:outline-none focus:border-primary" />
          </div>
          <div className="flex-1">
            <label className="text-xs text-secondary block mb-1">Following</label>
            <input type="number" value={followingVal} onChange={e => setFollowingVal(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-center focus:outline-none focus:border-primary" />
          </div>
          <button onClick={saveCounts} disabled={savingCounts}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-hover disabled:opacity-60 whitespace-nowrap">
            {savingCounts ? 'Saving…' : 'Save counts'}
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex border-b border-gray-100">
          {['followers', 'following', 'likes'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-semibold capitalize transition-colors
                ${tab === t ? 'text-primary border-b-2 border-primary -mb-px' : 'text-secondary hover:text-near-black'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Add row */}
        <div className="px-4 py-3 border-b border-gray-100">
          {tab !== 'likes' ? (
            <div className="relative">
              <input value={addQuery} onChange={e => { setAddQuery(e.target.value); searchUsers(e.target.value); }}
                placeholder={tab === 'followers' ? 'Add follower (search user)…' : 'Add following (search user)…'}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
              {addResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                  {addResults.map(u => (
                    <button key={u.id} onClick={() => addFollow(u.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left">
                      <UserAvatar user={u} size="xs" />
                      <span className="text-sm text-near-black">{u.display_name}</span>
                      <span className="text-xs text-secondary">@{u.username}</span>
                      <span className="ml-auto text-primary text-xs font-semibold">+ Add</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="relative">
              <input value={addLikeQuery} onChange={e => { setAddLikeQuery(e.target.value); searchStatements(e.target.value); }}
                placeholder="Find statement to like…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
              {addLikeResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                  {addLikeResults.map(s => (
                    <button key={s.id} onClick={() => giveLike(s.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left">
                      <span className="text-sm text-near-black flex-1 truncate">{s.content}</span>
                      <span className="ml-auto text-primary text-xs font-semibold whitespace-nowrap">+ Like</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {loading ? <div className="py-8"><Spinner /></div> :
            data.length === 0 ? <p className="text-center text-secondary text-sm py-8">None yet</p> : (
              <div className="divide-y divide-gray-50">
                {data.map(item => (
                  <div key={item.id} className="flex items-center gap-3 py-2.5">
                    {tab !== 'likes' ? (
                      <>
                        <UserAvatar user={item} size="xs" />
                        <span className="text-sm text-near-black font-medium">{item.display_name}</span>
                        <span className="text-xs text-secondary">@{item.username}</span>
                        <button onClick={() => removeFollow(item.id)} className="ml-auto text-red-400 hover:text-red-600 text-xs font-semibold">Remove</button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-near-black flex-1 truncate">{item.content}</span>
                        <button onClick={() => removeLike(item.id)} className="text-red-400 hover:text-red-600 text-xs font-semibold ml-2 whitespace-nowrap">Remove</button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

// ── Main AdminPanel ───────────────────────────────────────────────────────────

export default function AdminPanel() {
  const [tab, setTab] = useState('users');
  const [stats, setStats] = useState(null);

  // Users
  const [users, setUsers] = useState([]);
  const [userQuery, setUserQuery] = useState('');
  const [userLoading, setUserLoading] = useState(true);
  const [manageTarget, setManageTarget] = useState(null);

  // Statements
  const [statements, setStatements] = useState([]);
  const [stmtQuery, setStmtQuery] = useState('');
  const [stmtLoading, setStmtLoading] = useState(false);

  // Reports
  const [reports, setReports] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    api.get('/admin/stats').then(r => setStats(r.data)).catch(() => {});
    fetchUsers();
  }, []);

  useEffect(() => {
    if (tab === 'statements') fetchStatements();
    else if (tab === 'reports') fetchReports();
  }, [tab]);

  const fetchUsers = async (q = '') => {
    setUserLoading(true);
    try { const r = await api.get(`/admin/users?q=${encodeURIComponent(q)}`); setUsers(r.data.users); }
    catch {} finally { setUserLoading(false); }
  };

  const fetchStatements = async (q = '') => {
    setStmtLoading(true);
    try { const r = await api.get(`/admin/statements?q=${encodeURIComponent(q)}`); setStatements(r.data.statements); }
    catch {} finally { setStmtLoading(false); }
  };

  const fetchReports = async () => {
    setReportLoading(true);
    try { const r = await api.get('/admin/reports'); setReports(r.data.reports); }
    catch {} finally { setReportLoading(false); }
  };

  // ── User actions ────────────────────────────────────────────────────────────
  const handleBan = async (u) => {
    try {
      const r = await api.put(`/admin/users/${u.id}/ban`);
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_banned: r.data.is_banned ? 1 : 0 } : x));
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };

  const handleVerify = async (u) => {
    try {
      const r = await api.put(`/admin/users/${u.id}/verify`);
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_verified: r.data.is_verified ? 1 : 0 } : x));
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };

  const handleDeleteUser = async (u) => {
    if (!window.confirm(`Delete account of ${u.display_name}? Cannot be undone.`)) return;
    try {
      await api.delete(`/admin/users/${u.id}`);
      setUsers(prev => prev.filter(x => x.id !== u.id));
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };

  // ── Statement actions ───────────────────────────────────────────────────────
  const handleDeleteStatement = async (s) => {
    if (!window.confirm('Delete this statement?')) return;
    try {
      await api.delete(`/admin/statements/${s.id}`);
      setStatements(prev => prev.filter(x => x.id !== s.id));
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };

  const handleSetLikes = async (s, val) => {
    try {
      await api.put(`/admin/statements/${s.id}/set-likes`, { count: val });
      setStatements(prev => prev.map(x => x.id === s.id ? { ...x, like_count: val } : x));
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };

  // ── Report actions ──────────────────────────────────────────────────────────
  const handleDismissReport = async (r) => {
    try {
      await api.delete(`/admin/reports/${r.id}`);
      setReports(prev => prev.filter(x => x.id !== r.id));
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };

  const handleDeleteReportedContent = async (r) => {
    if (!window.confirm('Delete the reported content? Cannot be undone.')) return;
    try {
      if (r.target_type === 'statement') await api.delete(`/statements/${r.target_id}`);
      await api.delete(`/admin/reports/${r.id}`);
      setReports(prev => prev.filter(x => x.id !== r.id));
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };

  const TABS = [
    { key: 'users', label: 'Users' },
    { key: 'statements', label: 'Statements' },
    { key: 'reports', label: 'Reports', badge: reports.length },
  ];

  return (
    <div className="py-4">
      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-near-black">Admin Panel</h1>
        <p className="text-sm text-secondary mt-0.5">Manage the Statefy platform</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total Users"      value={stats.total_users}      color="text-primary" />
          <StatCard label="Total Statements" value={stats.total_statements} />
          <StatCard label="Total Votes"      value={stats.total_votes}      color="text-blue-600" />
          <StatCard label="Votes Today"      value={stats.votes_today}      color="text-green-600" />
        </div>
      )}

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 mb-4 bg-white rounded-t-card shadow-card overflow-hidden">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5
              ${tab === t.key ? 'text-primary border-b-2 border-primary -mb-px' : 'text-secondary hover:text-near-black'}`}>
            {t.label}
            {t.badge > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {t.badge > 9 ? '9+' : t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── USERS ── */}
      {tab === 'users' && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input value={userQuery} onChange={e => setUserQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchUsers(userQuery)}
              placeholder="Search by name, username or email…"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
            <button onClick={() => fetchUsers(userQuery)}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-hover">
              Search
            </button>
          </div>

          {userLoading ? <div className="py-8"><Spinner /></div> : (
            <div className="flex flex-col gap-2">
              {users.map(u => (
                <div key={u.id} className="bg-white rounded-card shadow-card p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <UserAvatar user={u} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-sm text-near-black">{u.display_name}</span>
                        {u.is_verified ? <VerifiedBadge /> : null}
                        {u.is_admin   ? <Badge color="primary">Admin</Badge>   : null}
                        {u.is_banned  ? <Badge color="red">Banned</Badge>      : null}
                        {u.is_deleted ? <Badge>Deleted</Badge>                 : null}
                      </div>
                      <p className="text-xs text-secondary">@{u.username} · {u.email}</p>
                      <p className="text-xs text-secondary">{u.follower_count} followers · Joined {timeAgo(u.created_at)}</p>
                    </div>
                  </div>

                  {!u.is_deleted && (
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => handleBan(u)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors
                          ${u.is_banned ? 'border-green-200 text-green-600 hover:bg-green-50' : 'border-red-200 text-red-600 hover:bg-red-50'}`}>
                        {u.is_banned ? 'Unban' : 'Ban'}
                      </button>
                      <button onClick={() => handleVerify(u)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-primary text-primary hover:bg-primary/5 transition-colors">
                        {u.is_verified ? 'Remove badge' : 'Verify'}
                      </button>
                      <button onClick={() => setManageTarget(u)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors flex items-center gap-1">
                        ⚙ Manage
                      </button>
                      {!u.is_admin && (
                        <button onClick={() => handleDeleteUser(u)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-secondary hover:border-red-200 hover:text-red-600 transition-colors ml-auto">
                          Delete account
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── STATEMENTS ── */}
      {tab === 'statements' && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input value={stmtQuery} onChange={e => setStmtQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchStatements(stmtQuery)}
              placeholder="Search statements…"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
            <button onClick={() => fetchStatements(stmtQuery)}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-hover">
              Search
            </button>
          </div>

          {stmtLoading ? <div className="py-8"><Spinner /></div> : (
            <div className="flex flex-col gap-2">
              {statements.map(s => (
                <div key={s.id} className="bg-white rounded-card shadow-card p-4">
                  <p className="text-sm text-near-black font-medium leading-relaxed mb-1">{s.content}</p>
                  <p className="text-xs text-secondary mb-3">by @{s.username} · {timeAgo(s.created_at)}</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="text-xs text-secondary flex items-center gap-1.5">
                      ❤ Likes:
                      <input type="number" defaultValue={s.like_count || 0}
                        onBlur={e => handleSetLikes(s, parseInt(e.target.value) || 0)}
                        className="w-20 border border-gray-200 rounded px-2 py-1 text-xs font-bold text-center focus:outline-none focus:border-primary" />
                    </label>
                    <span className="text-xs text-secondary">{s.vote_count} votes · {s.comment_count} comments · {s.view_count} views</span>
                    <button onClick={() => handleDeleteStatement(s)}
                      className="ml-auto text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── REPORTS ── */}
      {tab === 'reports' && (
        <div className="flex flex-col gap-3">
          {reportLoading ? <div className="py-8"><Spinner /></div> :
            reports.length === 0 ? (
              <div className="bg-white rounded-card shadow-card p-12 text-center">
                <p className="text-4xl mb-3">✅</p>
                <p className="font-semibold text-near-black">No reports</p>
                <p className="text-sm text-secondary mt-1">Everything looks clean</p>
              </div>
            ) : (
              reports.map(r => (
                <div key={r.id} className="bg-white rounded-card shadow-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge color="red">{r.target_type}</Badge>
                    <span className="text-xs text-secondary">reported by @{r.reporter_username} · {timeAgo(r.created_at)}</span>
                  </div>
                  <p className="text-sm font-semibold text-near-black mb-1">Reason: {r.reason}</p>
                  {r.target_content && (
                    <p className="text-sm text-secondary italic mb-3 line-clamp-3">"{r.target_content}"</p>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => handleDismissReport(r)}
                      className="flex-1 text-xs font-semibold px-3 py-2 rounded-lg border border-green-200 text-green-700 hover:bg-green-50 transition-colors">
                      ✓ Dismiss
                    </button>
                    <button onClick={() => handleDeleteReportedContent(r)}
                      className="flex-1 text-xs font-semibold px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                      🗑 Delete content
                    </button>
                  </div>
                </div>
              ))
            )
          }
        </div>
      )}

      {/* Manage modal */}
      {manageTarget && (
        <ManageModal
          user={manageTarget}
          onClose={() => setManageTarget(null)}
          onCountsSaved={(id, fc, fwc) => setUsers(prev => prev.map(u => u.id === id ? { ...u, follower_count: fc, following_count: fwc } : u))}
        />
      )}
    </div>
  );
}
