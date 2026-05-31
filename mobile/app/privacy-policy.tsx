import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { colors } from "../constants/colors";

const SECTIONS = [
  {
    title: "The short version",
    body: "We only collect what we need to run Statefy. We never sell your data. We never run ads. You can delete your account at any time.",
    highlight: true,
  },
  {
    title: "1. Who we are",
    body: "Statefy is a social platform where users post statements, vote on opinions and debate in comments. This policy explains what data we collect and how we use it. Questions? Email support@statefy.eu.",
  },
  {
    title: "2. Data we collect",
    body: "Account information: email address (login only, never public), username, display name, password (bcrypt hash only), and optionally a profile photo and bio.\n\nActivity data: statements you post, votes you cast, comments and replies, likes, and follow relationships.\n\nTechnical data: IP address (security/abuse), browser and device type, timestamps, and statement view tracking.",
  },
  {
    title: "3. How we use your data",
    body: "To create and manage your account, display your content, send in-app notifications, detect spam and abuse, improve the platform, and enforce moderation decisions.\n\nWe do not sell your data. We do not run advertising. We do not share personal data with third parties for marketing.",
  },
  {
    title: "4. Storage & security",
    body: "Passwords are hashed with bcrypt and never stored in plain text. All connections use HTTPS. Database access is restricted to authorised team members. Regular backups are performed. If a breach occurs that affects your data, we will notify you as required by law.",
  },
  {
    title: "5. Your rights",
    body: "Access (request a copy of your data), correction (update your info at any time), deletion (delete your account), portability (request a data export), and objection (object to certain uses).\n\nContact support@statefy.eu to exercise any right.",
  },
  {
    title: "6. Cookies",
    body: "We use browser localStorage to store your login token (JWT). No advertising cookies. No third-party tracking cookies.",
  },
  {
    title: "7. Third parties",
    body: "We may use trusted hosting providers. They only access data necessary for their service and are bound by confidentiality agreements. We do not integrate advertising networks or cross-site tracking.",
  },
  {
    title: "8. Children",
    body: "Statefy is not intended for users under 13. We do not knowingly collect data from children under 13. Contact us at support@statefy.eu if you believe a child has registered.",
  },
  {
    title: "9. Account deletion",
    body: "When you delete your account: your email, password and personal details are permanently removed, your username becomes available again, past statements and comments show as [deleted account], and your votes are anonymised. Data may remain in backups for up to 30 days.",
  },
  {
    title: "10. Policy changes",
    body: "We update the date at the top when this policy changes. For significant changes we notify users via in-app notification. Continued use of Statefy constitutes acceptance.",
  },
  {
    title: "11. Contact",
    body: "support@statefy.eu",
  },
];

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={22} color={colors.primary} />
          <Text style={s.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={s.pageTitle}>Privacy Policy</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.updated}>Last updated: May 28, 2025</Text>

        {SECTIONS.map((section, i) => (
          <View key={i} style={[s.section, section.highlight && s.sectionHighlight]}>
            <Text style={[s.sectionTitle, section.highlight && s.sectionTitleHighlight]}>
              {section.title}
            </Text>
            <Text style={[s.sectionBody, section.highlight && s.sectionBodyHighlight]}>
              {section.body}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 2, width: 60 },
  backText: { color: colors.primary, fontWeight: "600", fontSize: 15 },
  pageTitle: { fontSize: 17, fontWeight: "800", color: colors.nearBlack },
  content: { padding: 16, paddingBottom: 48 },
  updated: { fontSize: 13, color: colors.secondary, marginBottom: 16, textAlign: "center" },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionHighlight: { backgroundColor: "#fff5f5", borderWidth: 1, borderColor: "#fecdd3" },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.nearBlack, marginBottom: 8 },
  sectionTitleHighlight: { color: colors.primary },
  sectionBody: { fontSize: 14, color: "#374151", lineHeight: 21 },
  sectionBodyHighlight: { fontStyle: "italic" },
});
