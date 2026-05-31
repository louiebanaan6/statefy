import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import UserAvatar from '../components/UserAvatar';

export default function EditProfile() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    display_name: user?.display_name || '',
    username: user?.username || '',
    bio: user?.bio || '',
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [avatar, setAvatar] = useState(user?.avatar_url || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const f = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError('Avatar must be under 2MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setAvatar(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.new_password && form.new_password !== form.confirm_password) {
      setError('New passwords do not match');
      return;
    }

    const updates = {};
    if (form.display_name !== user.display_name) updates.display_name = form.display_name;
    if (form.username !== user.username) updates.username = form.username;
    if (form.bio !== (user.bio || '')) updates.bio = form.bio;
    if (avatar !== user.avatar_url) updates.avatar_url = avatar;
    if (form.new_password) {
      updates.current_password = form.current_password;
      updates.new_password = form.new_password;
    }

    if (Object.keys(updates).length === 0) {
      setError('No changes to save');
      return;
    }

    setLoading(true);
    try {
      const res = await api.put('/users/me', updates);
      updateUser(res.data.user);
      setSuccess('Profile updated successfully!');
      setForm(prev => ({ ...prev, current_password: '', new_password: '', confirm_password: '' }));
      setTimeout(() => navigate(`/profile/${res.data.user.username}`), 1000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const displayNameDays = user?.display_name_changed_at
    ? Math.max(0, Math.ceil(7 - (Date.now() - new Date(user.display_name_changed_at).getTime()) / 86400000))
    : 0;

  const usernameDays = user?.username_changed_at
    ? Math.max(0, Math.ceil(30 - (Date.now() - new Date(user.username_changed_at).getTime()) / 86400000))
    : 0;

  return (
    <div className="py-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-near-black">Edit Profile</h1>
        <p className="text-sm text-secondary mt-0.5">Update your profile information</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 rounded-lg">{success}</div>}

        {/* Avatar */}
        <div className="bg-white rounded-card shadow-card p-5">
          <h2 className="font-semibold text-near-black mb-4">Profile photo</h2>
          <div className="flex items-center gap-4">
            <div className="relative">
              {avatar ? (
                <img src={avatar} alt="Avatar" className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <UserAvatar user={user} size="xl" />
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 hover:opacity-100 transition-opacity"
              >
                <span className="text-white text-xs font-medium">Change</span>
              </button>
            </div>
            <div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-sm font-semibold text-primary hover:underline"
              >
                Upload photo
              </button>
              {avatar && (
                <button
                  type="button"
                  onClick={() => setAvatar(null)}
                  className="block text-sm text-secondary hover:text-red-500 mt-1"
                >
                  Remove photo
                </button>
              )}
              <p className="text-xs text-secondary mt-1">JPG, PNG, max 2MB</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </div>
        </div>

        {/* Profile info */}
        <div className="bg-white rounded-card shadow-card p-5">
          <h2 className="font-semibold text-near-black mb-4">Profile information</h2>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-near-black mb-1">Display name</label>
              <input
                type="text"
                value={form.display_name}
                onChange={e => f('display_name', e.target.value)}
                maxLength={30}
                disabled={displayNameDays > 0}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {displayNameDays > 0 && (
                <p className="text-xs text-secondary mt-1">Can be changed in {displayNameDays} day{displayNameDays !== 1 ? 's' : ''}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-near-black mb-1">Username</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-sm">@</span>
                <input
                  type="text"
                  value={form.username}
                  onChange={e => f('username', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                  maxLength={20}
                  disabled={usernameDays > 0}
                  className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              {usernameDays > 0 && (
                <p className="text-xs text-secondary mt-1">Can be changed in {usernameDays} day{usernameDays !== 1 ? 's' : ''}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-near-black mb-1">Bio</label>
              <textarea
                value={form.bio}
                onChange={e => f('bio', e.target.value)}
                maxLength={160}
                rows={3}
                placeholder="Tell people about yourself..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary resize-none"
              />
              <p className="text-xs text-secondary text-right">{160 - form.bio.length}</p>
            </div>
          </div>
        </div>

        {/* Change password */}
        <div className="bg-white rounded-card shadow-card p-5">
          <h2 className="font-semibold text-near-black mb-4">Change password</h2>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-near-black mb-1">Current password</label>
              <input
                type="password"
                value={form.current_password}
                onChange={e => f('current_password', e.target.value)}
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-near-black mb-1">New password</label>
              <input
                type="password"
                value={form.new_password}
                onChange={e => f('new_password', e.target.value)}
                placeholder="Min 8 characters"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-near-black mb-1">Confirm new password</label>
              <input
                type="password"
                value={form.confirm_password}
                onChange={e => f('confirm_password', e.target.value)}
                placeholder="Repeat new password"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-primary text-white font-bold py-3 rounded-full hover:bg-primary-hover disabled:opacity-60 transition-colors"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
