import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

function getBaseUrl(): string {
  // Allow explicit override via .env
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;

  // Expo Go on a physical device: the bundler host reveals the dev machine's IP.
  // Try the various Constants properties used across Expo SDK versions.
  const hostUri =
    // SDK 49+ new API
    (Constants.expoConfig as any)?.hostUri ??
    // Older manifest API
    (Constants as any).manifest?.debuggerHost ??
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ??
    "";

  const ip = hostUri.split(":")[0];
  if (ip && ip !== "localhost" && ip !== "") {
    return `http://${ip}:3001/api`;
  }

  // Simulator / default
  return "http://localhost:3001/api";
}

const BASE_URL = getBaseUrl();
console.log("[API] Base URL:", BASE_URL);

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("statefy_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
