import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../api/axios";

interface User {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  is_verified: number;
  is_admin: number;
  is_banned: number;
  follower_count: number;
  following_count: number;
  created_at: string;
  username_changed_at: string | null;
  display_name_changed_at: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, username: string, display_name: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem("statefy_token").then((token) => {
      if (token) {
        api
          .get("/auth/me")
          .then((res) => setUser(res.data.user))
          .catch(() => AsyncStorage.removeItem("statefy_token"))
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password });
    await AsyncStorage.setItem("statefy_token", res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (email: string, username: string, display_name: string, password: string) => {
    const res = await api.post("/auth/register", { email, username, display_name, password });
    await AsyncStorage.setItem("statefy_token", res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = async () => {
    await AsyncStorage.removeItem("statefy_token");
    setUser(null);
  };

  const updateUser = (updates: Partial<User>) => setUser((prev) => prev ? { ...prev, ...updates } : null);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
