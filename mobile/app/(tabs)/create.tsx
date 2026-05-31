import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet, Image, Modal, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { ImagePlus, X, PlusCircle, Music, Search, ChevronLeft } from "lucide-react-native";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { colors, card } from "../../constants/colors";
import AudioPlayer from "../../components/AudioPlayer";

const MAX = 280;
const OPT_COLORS = ["#bbf7d0", "#fecaca", "#bfdbfe", "#fde68a"];
const SPOTIFY_GREEN = "#1DB954";

export default function CreateScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [content, setContent] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [optionA, setOptionA] = useState("Agree");
  const [optionB, setOptionB] = useState("Disagree");
  const [customOptions, setCustomOptions] = useState(["", "", "", ""]);
  const [numCustom, setNumCustom] = useState(2);
  const [loading, setLoading] = useState(false);

  // Foto
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // Audio (gedeeld tussen Spotify en file upload)
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioTitle, setAudioTitle] = useState("");
  const [audioArt, setAudioArt] = useState<string | null>(null);
  const [audioUploading, setAudioUploading] = useState(false);

  // Muziek zoek modal
  const [spotifyModal, setSpotifyModal] = useState(false);
  const [spotifyQuery, setSpotifyQuery] = useState("");
  const [spotifyResults, setSpotifyResults] = useState<any[]>([]);
  const [spotifySearching, setSpotifySearching] = useState(false);
  const [recommended, setRecommended] = useState<any[]>([]);

  useEffect(() => {
    if (spotifyModal && recommended.length === 0) {
      api.get("/spotify/search").then(res => setRecommended(res.data.tracks)).catch(() => {});
    }
  }, [spotifyModal]);

  if (!user) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, padding: 32 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <PlusCircle size={32} color={colors.secondary} />
        </View>
        <Text style={{ fontSize: 20, fontWeight: "800", color: colors.nearBlack, marginBottom: 8, textAlign: "center" }}>Log in to create statements</Text>
        <Text style={{ fontSize: 14, color: colors.secondary, textAlign: "center", marginBottom: 24 }}>Share your take and let others vote</Text>
        <TouchableOpacity onPress={() => router.push("/login")} style={{ backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 32, paddingVertical: 12 }}>
          <Text style={{ color: colors.white, fontWeight: "700", fontSize: 15 }}>Log in</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Foto ───────────────────────────────────────────────────────────────────
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setPhotoUri(uri);
      setPhotoUploading(true);
      try {
        const fd = new FormData();
        fd.append("image", { uri, name: "photo.jpg", type: "image/jpeg" } as any);
        const res = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
        setPhotoUrl(res.data.url);
      } catch {
        Alert.alert("Upload failed", "Could not upload image. Try again.");
        setPhotoUri(null);
      } finally { setPhotoUploading(false); }
    }
  };
  const removePhoto = () => { setPhotoUri(null); setPhotoUrl(null); };

  // ─── Spotify zoeken ──────────────────────────────────────────────────────────
  const searchSpotify = async () => {
    if (!spotifyQuery.trim()) return;
    setSpotifySearching(true);
    try {
      const res = await api.get(`/spotify/search?q=${encodeURIComponent(spotifyQuery)}`);
      setSpotifyResults(res.data.tracks);
    } catch {
      Alert.alert("Error", "Could not search Spotify. Check the server.");
    } finally { setSpotifySearching(false); }
  };

  const selectTrack = (track: any) => {
    setAudioUrl(track.previewUrl);
    setAudioTitle(`${track.name} — ${track.artist}`);
    setAudioArt(track.albumArt);
    setSpotifyModal(false);
    setSpotifyQuery("");
    setSpotifyResults([]);
  };

  // ─── File upload (fallback) ──────────────────────────────────────────────────
  const pickAudioFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "audio/*", copyToCacheDirectory: true });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const name = asset.name.replace(/\.[^.]+$/, "");
      setAudioTitle(name);
      setAudioArt(null);
      setAudioUploading(true);
      try {
        const fd = new FormData();
        fd.append("audio", { uri: asset.uri, name: asset.name, type: asset.mimeType || "audio/mpeg" } as any);
        fd.append("title", name);
        const res = await api.post("/upload/audio", fd, { headers: { "Content-Type": "multipart/form-data" } });
        setAudioUrl(res.data.url);
        setAudioTitle(res.data.title);
      } catch {
        Alert.alert("Upload failed", "Could not upload audio. Try again.");
        setAudioUrl(null);
        setAudioTitle("");
      } finally { setAudioUploading(false); }
    }
  };

  const removeAudio = () => { setAudioUrl(null); setAudioTitle(""); setAudioArt(null); };

  // ─── Submit ──────────────────────────────────────────────────────────────────
  const updateOpt = (idx: number, val: string) => { const n = [...customOptions]; n[idx] = val; setCustomOptions(n); };

  const handleSubmit = async () => {
    if (!content.trim()) { Alert.alert("Error", "Please write your statement"); return; }
    if (content.length > MAX) { Alert.alert("Error", "Statement too long"); return; }
    if (photoUploading) { Alert.alert("Please wait", "Photo is still uploading"); return; }
    if (audioUploading) { Alert.alert("Please wait", "Audio is still uploading"); return; }
    let body: any = { content: content.trim(), photo_url: photoUrl, audio_url: audioUrl, audio_title: audioTitle || null };
    if (useCustom) {
      const opts = customOptions.slice(0, numCustom).map(o => o.trim()).filter(Boolean);
      if (opts.length < 2) { Alert.alert("Error", "Fill in at least 2 options"); return; }
      body.custom_options = opts;
    } else {
      if (!optionA.trim() || !optionB.trim()) { Alert.alert("Error", "Fill in both vote options"); return; }
      body.option_a = optionA.trim();
      body.option_b = optionB.trim();
    }
    setLoading(true);
    try {
      const res = await api.post("/statements", body);
      setContent(""); setOptionA("Agree"); setOptionB("Disagree");
      setCustomOptions(["", "", "", ""]); setUseCustom(false);
      setPhotoUri(null); setPhotoUrl(null);
      setAudioUrl(null); setAudioTitle(""); setAudioArt(null);
      router.push(`/statement/${res.data.statement.id}` as any);
    } catch (err: any) { Alert.alert("Error", err.response?.data?.error || "Failed to post"); }
    finally { setLoading(false); }
  };

  const remaining = MAX - content.length;

  return (
    <>
      <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={[s.section, card]}>
          <Text style={s.sectionTitle}>Your statement</Text>
          <TextInput value={content} onChangeText={setContent} placeholder="Write a bold, thought-provoking statement..."
            placeholderTextColor="#9ca3af" multiline maxLength={MAX} numberOfLines={5}
            style={{ fontSize: 16, color: colors.nearBlack, lineHeight: 24, minHeight: 100, textAlignVertical: "top" }} />
          <Text style={{ textAlign: "right", fontSize: 12, fontWeight: "600", marginTop: 8,
            color: remaining < 20 ? "#ef4444" : remaining < 50 ? "#f59e0b" : colors.secondary }}>{remaining}</Text>

          {/* Foto */}
          {photoUri ? (
            <View style={{ marginTop: 12, position: "relative" }}>
              <Image source={{ uri: photoUri }} style={{ width: "100%", height: 200, borderRadius: 10 }} resizeMode="cover" />
              {photoUploading && (
                <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 10, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Uploading...</Text>
                </View>
              )}
              <TouchableOpacity onPress={removePhoto} style={s.removeBtn}>
                <X size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={pickImage} style={s.addBtn} activeOpacity={0.7}>
              <ImagePlus size={18} color={colors.primary} />
              <Text style={s.addBtnText}>Add photo</Text>
            </TouchableOpacity>
          )}

          {/* Muziek */}
          {audioUrl ? (
            <View style={{ marginTop: 12, position: "relative" }}>
              {audioArt && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <Image source={{ uri: audioArt }} style={{ width: 40, height: 40, borderRadius: 6 }} />
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: "700", color: colors.nearBlack }}>{audioTitle}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: SPOTIFY_GREEN }} />
                      <Text style={{ fontSize: 11, color: SPOTIFY_GREEN, fontWeight: "600" }}>Spotify · 30s preview</Text>
                    </View>
                  </View>
                </View>
              )}
              {audioUploading ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#f8f9ff", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#e0e7ff" }}>
                  <Music size={18} color={colors.primary} />
                  <Text style={{ fontSize: 13, color: colors.secondary, flex: 1 }}>Uploading audio...</Text>

                </View>
              ) : (
                <AudioPlayer url={audioUrl} title={audioArt ? "" : audioTitle} />
              )}
              <TouchableOpacity onPress={removeAudio} style={[s.removeBtn, { top: audioArt ? 0 : 8 }]}>
                <X size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <TouchableOpacity onPress={() => setSpotifyModal(true)} style={[s.addBtn, { flex: 1, justifyContent: "center", borderColor: SPOTIFY_GREEN }]} activeOpacity={0.7}>
                <Music size={18} color={SPOTIFY_GREEN} />
                <Text style={[s.addBtnText, { color: SPOTIFY_GREEN }]}>Search music</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={pickAudioFile} style={[s.addBtn, { borderColor: "#d1d5db" }]} activeOpacity={0.7}>
                <Text style={{ color: colors.secondary, fontSize: 12, fontWeight: "600" }}>Upload</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={[s.section, card]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <Text style={s.sectionTitle}>Vote options</Text>
            <TouchableOpacity onPress={() => setUseCustom(!useCustom)}>
              <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 13 }}>{useCustom ? "Use default" : "Customize"}</Text>
            </TouchableOpacity>
          </View>
          {useCustom ? (
            <View style={{ gap: 8 }}>
              {Array.from({ length: numCustom }).map((_, i) => (
                <TextInput key={i} value={customOptions[i]} onChangeText={v => updateOpt(i, v)} placeholder={`Option ${i + 1}`}
                  placeholderTextColor="#9ca3af" maxLength={50} style={[s.optInput, { borderColor: OPT_COLORS[i] }]} />
              ))}
              <View style={{ flexDirection: "row", gap: 16, marginTop: 4 }}>
                {numCustom < 4 && <TouchableOpacity onPress={() => setNumCustom(n => n + 1)}><Text style={{ color: colors.primary, fontWeight: "600", fontSize: 13 }}>+ Add option</Text></TouchableOpacity>}
                {numCustom > 2 && <TouchableOpacity onPress={() => setNumCustom(n => n - 1)}><Text style={{ color: colors.secondary, fontWeight: "600", fontSize: 13 }}>- Remove</Text></TouchableOpacity>}
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput value={optionA} onChangeText={setOptionA} placeholder="Option A" placeholderTextColor="#9ca3af" maxLength={50} style={[s.optInput, { flex: 1, borderColor: OPT_COLORS[0] }]} />
              <TextInput value={optionB} onChangeText={setOptionB} placeholder="Option B" placeholderTextColor="#9ca3af" maxLength={50} style={[s.optInput, { flex: 1, borderColor: OPT_COLORS[1] }]} />
            </View>
          )}
        </View>

        <TouchableOpacity onPress={handleSubmit} disabled={loading || !content.trim() || photoUploading || audioUploading} activeOpacity={0.8}
          style={{ backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 16, alignItems: "center", opacity: loading || !content.trim() || photoUploading || audioUploading ? 0.6 : 1 }}>
          <Text style={{ color: colors.white, fontWeight: "700", fontSize: 16 }}>{loading ? "Posting..." : "Post Statement"}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ─── Spotify zoek modal ─────────────────────────────────────────────── */}
      <Modal visible={spotifyModal} animationType="slide" onRequestClose={() => setSpotifyModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#fff" }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          {/* Header */}
          <View style={[m.header, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity onPress={() => { setSpotifyModal(false); setSpotifyResults([]); setSpotifyQuery(""); }} style={m.backBtn}>
              <ChevronLeft size={22} color={colors.nearBlack} />
            </TouchableOpacity>
            <Text style={m.title}>Search music</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Zoekbalk */}
          <View style={m.searchBar}>
            <TextInput
              value={spotifyQuery}
              onChangeText={setSpotifyQuery}
              onSubmitEditing={searchSpotify}
              placeholder="Search for a song or artist..."
              placeholderTextColor="#9ca3af"
              returnKeyType="search"
              style={m.searchInput}
              autoFocus
            />
            <TouchableOpacity onPress={searchSpotify} style={m.searchBtn} activeOpacity={0.8}>
              {spotifySearching ? <ActivityIndicator color="#fff" size="small" /> : <Search size={18} color="#fff" />}
            </TouchableOpacity>
          </View>

          {/* Resultaten */}
          {spotifyResults.length === 0 && !spotifySearching && recommended.length > 0 && (
            <Text style={{ paddingHorizontal: 16, paddingBottom: 8, fontSize: 12, fontWeight: "700", color: colors.secondary, textTransform: "uppercase", letterSpacing: 0.5 }}>Trending</Text>
          )}
          {spotifyResults.length === 0 && !spotifySearching && recommended.length === 0 ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Music size={48} color="#e5e7eb" />
              <Text style={{ color: colors.secondary, marginTop: 12, fontSize: 14 }}>Search a song to get started</Text>
            </View>
          ) : (
            <FlatList
              data={spotifyResults.length > 0 ? spotifyResults : recommended}
              keyExtractor={item => item.id}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 16 }}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: "#f3f4f6" }} />}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => selectTrack(item)} style={m.trackItem} activeOpacity={0.7}>
                  {item.albumArt ? (
                    <Image source={{ uri: item.albumArt }} style={m.trackArt} />
                  ) : (
                    <View style={[m.trackArt, { backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" }]}>
                      <Music size={20} color={colors.secondary} />
                    </View>
                  )}
                  <View style={{ flex: 1, marginHorizontal: 12 }}>
                    <Text numberOfLines={1} style={m.trackName}>{item.name}</Text>
                    <Text numberOfLines={1} style={m.trackArtist}>{item.artist}</Text>
                    <Text numberOfLines={1} style={m.trackAlbum}>{item.album}</Text>
                  </View>
                  <View style={m.previewBadge}>
                    <Text style={{ color: SPOTIFY_GREEN, fontSize: 9, fontWeight: "800" }}>30s</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  section: { padding: 16, marginBottom: 16 },
  sectionTitle: { fontWeight: "700", fontSize: 14, color: colors.nearBlack, marginBottom: 8 },
  optInput: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.nearBlack, backgroundColor: colors.white },
  addBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1.5, borderColor: colors.primary, borderRadius: 10, borderStyle: "dashed", alignSelf: "flex-start", gap: 6 },
  addBtnText: { color: colors.primary, fontWeight: "600", fontSize: 14 },
  removeBtn: { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 999, padding: 4 },
});

const m = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontWeight: "700", color: colors.nearBlack },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 10, margin: 16 },
  searchInput: { flex: 1, borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: colors.nearBlack },
  searchBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: SPOTIFY_GREEN, alignItems: "center", justifyContent: "center" },
  trackItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  trackArt: { width: 52, height: 52, borderRadius: 6 },
  trackName: { fontSize: 14, fontWeight: "700", color: colors.nearBlack },
  trackArtist: { fontSize: 13, color: colors.secondary, marginTop: 2 },
  trackAlbum: { fontSize: 11, color: "#9ca3af", marginTop: 1 },
  previewBadge: { borderWidth: 1.5, borderColor: SPOTIFY_GREEN, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
});
