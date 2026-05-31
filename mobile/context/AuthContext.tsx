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
  login: (email: string, password: string) => Promise<User | { requiresVerification: true; email: string }>;
  register: (email: string, username: string, display_name: string, password: string) => Promise<{ requiresVerification: true; email: string }>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  setCurrentUser: (user: User) => void;
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
    try {
      const res = await api.post("/auth/login", { email, password });
      await AsyncStorage.setItem("statefy_token", res.data.token);
      setUser(res.data.user);
      return res.data.user;
    } catch (err: any) {
      if (err.response?.data?.requiresVerification) {
        return { requiresVerification: true as const, email: err.response.data.email };
      }
      throw err;
    }
  };

  const register = async (email: string, username: string, display_name: string, password: string) => {
    const res = await api.post("/auth/register", { email, username, display_name, password });
    return { requiresVerification: true as const, email: res.data.email };
  };

  const logout = async () => {
    await AsyncStorage.removeItem("statefy_token");
    setUser(null);
  };

  const updateUser = (updates: Partial<User>) => setUser((prev) => prev ? { ...prev, ...updates } : null);
  const setCurrentUser = (u: User) => setUser(u);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, setCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
