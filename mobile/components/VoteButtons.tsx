import { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { colors } from "../constants/colors";

const OPTION_COLORS = [
  { bar: "#22c55e", light: "#f0fdf4", border: "#bbf7d0", text: "#15803d" },
  { bar: "#ef4444", light: "#fef2f2", border: "#fecaca", text: "#b91c1c" },
  { bar: "#3b82f6", light: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
  { bar: "#f59e0b", light: "#fffbeb", border: "#fde68a", text: "#b45309" },
];

interface Props { statement: any; onVoted?: (option: string, results: any[]) => void; compact?: boolean; }

export default function VoteButtons({ statement, onVoted, compact = false }: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [localVote, setLocalVote] = useState<string | null>(statement.user_vote);
  const [localResults, setLocalResults] = useState<any[] | null>(statement.vote_results || null);

  const options: string[] = statement.options || [statement.option_a, statement.option_b];
  const hasVoted = !!localVote;
  const showResults = hasVoted || !user;
  const h = compact ? 36 : 44;

  const handleVote = async (option: string) => {
    if (!user) { router.push("/login"); return; }
    if (hasVoted || loading) return;
    setLoading(true);
    try {
      const res = await api.post(`/statements/${statement.id}/vote`, { option });
      setLocalVote(option);
      setLocalResults(res.data.results);
      onVoted?.(option, res.data.results);
    } catch (err: any) { alert(err.response?.data?.error || "Failed to vote"); }
    finally { setLoading(false); }
  };

  if (showResults && localResults) {
    const total = localResults.reduce((s, r) => s + r.count, 0);
    return (
      <View style={{ gap: 8 }}>
        {localResults.map((result, idx) => {
          const c = OPTION_COLORS[idx % OPTION_COLORS.length];
          const isChosen = result.option === localVote;
          return (
            <View key={result.option} style={{ height: h, borderRadius: 10, overflow: "hidden", backgroundColor: isChosen ? c.light : "#f5f5f5", borderWidth: isChosen ? 2 : 1, borderColor: isChosen ? c.border : "#e5e7eb" }}>
              <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${result.percentage}%`, backgroundColor: c.bar, opacity: 0.2 }} />
              <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12 }}>
                <Text style={{ fontWeight: "600", fontSize: 13, color: isChosen ? c.text : colors.nearBlack, flexShrink: 1 }} numberOfLines={1}>
                  {isChosen ? "✓ " : ""}{result.option}
                </Text>
                <Text style={{ fontWeight: "700", fontSize: 13, color: isChosen ? c.text : colors.secondary, marginLeft: 8 }}>{result.percentage}%</Text>
              </View>
            </View>
          );
        })}
        <Text style={{ fontSize: 12, color: colors.secondary, textAlign: "right" }}>{total} vote{total !== 1 ? "s" : ""}</Text>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {options.map((option, idx) => {
        const c = OPTION_COLORS[idx % OPTION_COLORS.length];
        return (
          <TouchableOpacity key={option} onPress={() => handleVote(option)} disabled={loading}
            style={{ flex: 1, height: h, borderRadius: 10, borderWidth: 2, borderColor: "#e5e7eb", alignItems: "center", justifyContent: "center", backgroundColor: colors.white, opacity: loading ? 0.6 : 1 }}
            activeOpacity={0.7}>
            {loading ? <ActivityIndicator size="small" color={c.bar} /> : <Text style={{ fontWeight: "600", fontSize: 13, color: colors.nearBlack }}>{option}</Text>}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
