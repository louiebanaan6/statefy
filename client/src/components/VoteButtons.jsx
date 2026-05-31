import { useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const OPTION_COLORS = [
  { bg: 'bg-green-500', light: 'bg-green-50 border-green-200', text: 'text-green-700', hover: 'hover:bg-green-50 hover:border-green-300' },
  { bg: 'bg-red-500', light: 'bg-red-50 border-red-200', text: 'text-red-700', hover: 'hover:bg-red-50 hover:border-red-300' },
  { bg: 'bg-blue-500', light: 'bg-blue-50 border-blue-200', text: 'text-blue-700', hover: 'hover:bg-blue-50 hover:border-blue-300' },
  { bg: 'bg-amber-500', light: 'bg-amber-50 border-amber-200', text: 'text-amber-700', hover: 'hover:bg-amber-50 hover:border-amber-300' },
];

export default function VoteButtons({ statement, onVoted, compact = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [localVote, setLocalVote] = useState(statement.user_vote);
  const [localResults, setLocalResults] = useState(statement.vote_results || null);

  const options = statement.options || [statement.option_a, statement.option_b];
  const hasVoted = !!localVote;
  const showResults = hasVoted || !user;

  const handleVote = async (option) => {
    if (!user) { navigate('/login'); return; }
    if (hasVoted || loading) return;
    setLoading(true);
    try {
      const res = await api.post(`/statements/${statement.id}/vote`, { option });
      setLocalVote(option);
      setLocalResults(res.data.results);
      onVoted?.(option, res.data.results);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to vote');
    } finally {
      setLoading(false);
    }
  };

  if (showResults && localResults) {
    const total = localResults.reduce((s, r) => s + r.count, 0);
    return (
      <div className={`flex flex-col gap-2 ${compact ? 'gap-1.5' : 'gap-2'}`}>
        {localResults.map((result, idx) => {
          const color = OPTION_COLORS[idx % OPTION_COLORS.length];
          const isChosen = result.option === localVote;
          return (
            <div key={result.option} className="relative">
              <div className={`relative overflow-hidden rounded-lg border ${compact ? 'h-9' : 'h-11'} ${isChosen ? color.light + ' border-2' : 'bg-gray-50 border-gray-200'}`}>
                <div
                  className={`absolute left-0 top-0 h-full ${color.bg} opacity-20 transition-all duration-500`}
                  style={{ width: `${result.percentage}%` }}
                />
                <div className="relative flex items-center justify-between h-full px-3">
                  <span className={`font-medium text-sm truncate ${isChosen ? color.text : 'text-near-black'}`}>
                    {isChosen && <span className="mr-1">✓</span>}
                    {result.option}
                  </span>
                  <span className={`font-bold text-sm ml-2 flex-shrink-0 ${isChosen ? color.text : 'text-secondary'}`}>
                    {result.percentage}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <p className="text-xs text-secondary text-right">{total} vote{total !== 1 ? 's' : ''}</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap gap-2`}>
      {options.map((option, idx) => {
        const color = OPTION_COLORS[idx % OPTION_COLORS.length];
        return (
          <button
            key={option}
            onClick={() => handleVote(option)}
            disabled={loading}
            className={`flex-1 min-w-[120px] ${compact ? 'py-2 text-sm' : 'py-2.5'} px-4 rounded-lg border-2 border-gray-200 font-semibold
              text-near-black transition-all ${color.hover} disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {loading ? '...' : option}
          </button>
        );
      })}
    </div>
  );
}
