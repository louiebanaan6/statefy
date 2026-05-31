import { View, Text, Image } from "react-native";
import { colors } from "../constants/colors";

interface Props {
  user?: { display_name?: string; username?: string; avatar_url?: string | null } | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

const SIZES = {
  xs: { wh: 28, fontSize: 11 },
  sm: { wh: 36, fontSize: 13 },
  md: { wh: 40, fontSize: 14 },
  lg: { wh: 56, fontSize: 20 },
  xl: { wh: 80, fontSize: 30 },
};

export default function UserAvatar({ user, size = "md" }: Props) {
  const { wh, fontSize } = SIZES[size] || SIZES.md;
  const letter = ((user?.display_name || user?.username || "?")[0] || "?").toUpperCase();
  const r = wh / 2;

  if (user?.avatar_url) {
    return <Image source={{ uri: user.avatar_url }} style={{ width: wh, height: wh, borderRadius: r }} />;
  }

  return (
    <View style={{ width: wh, height: wh, borderRadius: r, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize, color: colors.white, fontWeight: "700" }}>{letter}</Text>
    </View>
  );
}
