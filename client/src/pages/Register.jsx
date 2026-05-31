import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', username: '', display_name: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form.email, form.username, form.display_name, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const f = (key, val) => setForm({ ...form, [key]: val });

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2z" fill="#E8002D" />
              <path d="M8 10h8M8 13h5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="text-2xl font-bold text-near-black">Statefy</span>
          </div>
          <h1 className="text-xl font-bold text-near-black">Create your account</h1>
          <p className="text-secondary text-sm mt-1">Join the conversation</p>
        </div>

        <div className="bg-white rounded-card shadow-card p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-near-black mb-1">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => f('email', e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-near-black mb-1">Display name</label>
              <input
                type="text"
                required
                value={form.display_name}
                onChange={e => f('display_name', e.target.value)}
                placeholder="Your name"
                maxLength={30}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-near-black mb-1">Username</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-sm">@</span>
                <input
                  type="text"
                  required
                  value={form.username}
                  onChange={e => f('username', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                  placeholder="yourhandle"
                  maxLength={20}
                  className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <p className="text-xs text-secondary mt-1">3-20 characters, letters, numbers, underscores</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-near-black mb-1">Password</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={e => f('password', e.target.value)}
                placeholder="Min 8 characters"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-primary text-white font-semibold py-2.5 rounded-lg hover:bg-primary-hover disabled:opacity-60 transition-colors"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-secondary mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
