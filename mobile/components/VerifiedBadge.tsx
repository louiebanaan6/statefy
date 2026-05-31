import { View } from "react-native";
import { Check } from "lucide-react-native";
import { colors } from "../constants/colors";

export default function VerifiedBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  const dim = size === "md" ? 20 : 16;
  return (
    <View style={{ width: dim, height: dim, borderRadius: dim / 2, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
      <Check size={dim - 6} color={colors.white} strokeWidth={3} />
    </View>
  );
}
