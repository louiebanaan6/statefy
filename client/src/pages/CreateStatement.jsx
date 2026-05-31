import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const MAX_CHARS = 280;

export default function CreateStatement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [useCustomOptions, setUseCustomOptions] = useState(false);
  const [optionA, setOptionA] = useState('Agree');
  const [optionB, setOptionB] = useState('Disagree');
  const [customOptions, setCustomOptions] = useState(['', '', '', '']);
  const [numCustom, setNumCustom] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const remaining = MAX_CHARS - content.length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!content.trim()) { setError('Please write your statement'); return; }
    if (content.length > MAX_CHARS) { setError('Statement too long'); return; }

    let body = { content: content.trim() };

    if (useCustomOptions) {
      const opts = customOptions.slice(0, numCustom).map(o => o.trim()).filter(Boolean);
      if (opts.length < 2) { setError('Please fill in at least 2 vote options'); return; }
      body.custom_options = opts;
    } else {
      if (!optionA.trim() || !optionB.trim()) { setError('Please fill in both vote options'); return; }
      body.option_a = optionA.trim();
      body.option_b = optionB.trim();
    }

    setLoading(true);
    try {
      const res = await api.post('/statements', body);
      navigate(`/statement/${res.data.statement.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to post statement');
    } finally {
      setLoading(false);
    }
  };

  const updateCustomOption = (idx, val) => {
    const next = [...customOptions];
    next[idx] = val;
    setCustomOptions(next);
  };

  const optionColors = ['border-green-300 focus:border-green-500', 'border-red-300 focus:border-red-500', 'border-blue-300 focus:border-blue-500', 'border-amber-300 focus:border-amber-500'];

  return (
    <div className="py-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-near-black">Create Statement</h1>
        <p className="text-sm text-secondary mt-0.5">Post a bold take for others to vote on</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
        )}

        {/* Statement input */}
        <div className="bg-white rounded-card shadow-card p-4">
          <label className="block text-sm font-semibold text-near-black mb-2">Your statement</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Write a bold, thought-provoking statement..."
            maxLength={MAX_CHARS}
            rows={4}
            className="w-full text-near-black resize-none focus:outline-none text-base leading-relaxed placeholder-gray-300"
          />
          <div className={`text-right text-xs font-medium mt-2 ${remaining < 20 ? 'text-red-500' : remaining < 50 ? 'text-amber-500' : 'text-secondary'}`}>
            {remaining}
          </div>
        </div>

        {/* Vote options */}
        <div className="bg-white rounded-card shadow-card p-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-near-black">Vote options</label>
            <button
              type="button"
              onClick={() => setUseCustomOptions(!useCustomOptions)}
              className="text-xs font-medium text-primary hover:underline"
            >
              {useCustomOptions ? 'Use default' : 'Customize options'}
            </button>
          </div>

          {useCustomOptions ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: numCustom }).map((_, i) => (
                <input
                  key={i}
                  value={customOptions[i]}
                  onChange={e => updateCustomOption(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  maxLength={50}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors ${optionColors[i]}`}
                />
              ))}
              <div className="flex gap-2 mt-1">
                {numCustom < 4 && (
                  <button type="button" onClick={() => setNumCustom(n => n + 1)} className="text-xs text-primary hover:underline font-medium">
                    + Add option
                  </button>
                )}
                {numCustom > 2 && (
                  <button type="button" onClick={() => setNumCustom(n => n - 1)} className="text-xs text-secondary hover:underline font-medium">
                    - Remove option
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={optionA}
                onChange={e => setOptionA(e.target.value)}
                placeholder="Option A"
                maxLength={50}
                className="flex-1 border border-green-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 transition-colors"
              />
              <input
                value={optionB}
                onChange={e => setOptionB(e.target.value)}
                placeholder="Option B"
                maxLength={50}
                className="flex-1 border border-red-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>
          )}
        </div>

        {/* Preview */}
        {content.trim() && (
          <div className="bg-white rounded-card shadow-card p-4 opacity-75">
            <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-3">Preview</p>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">
                {user?.display_name?.[0]?.toUpperCase()}
              </div>
              <div>
                <span className="font-semibold text-sm text-near-black">{user?.display_name}</span>
                <span className="text-xs text-secondary ml-1">@{user?.username}</span>
              </div>
            </div>
            <p className="text-near-black font-medium text-sm mb-3">{content}</p>
            <div className="flex gap-2">
              {(useCustomOptions
                ? customOptions.slice(0, numCustom).filter(Boolean)
                : [optionA, optionB].filter(Boolean)
              ).map((opt, i) => (
                <span key={i} className="flex-1 text-center text-sm py-2 rounded-lg bg-surface border border-gray-200 text-near-black font-medium">
                  {opt}
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="bg-primary text-white font-bold py-3 rounded-full hover:bg-primary-hover disabled:opacity-60 transition-colors text-base"
        >
          {loading ? 'Posting...' : 'Post Statement'}
        </button>
      </form>
    </div>
  );
}
