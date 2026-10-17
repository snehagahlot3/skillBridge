import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, type MeResponse, type User } from "../lib/api";

interface SignupData {
  email: string;
  password: string;
  name: string;
  profile?: Record<string, unknown>;
}

interface AuthContextValue {
  user: User | null;
  me: MeResponse | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (data: SignupData) => Promise<User>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      setMe(null);
      setLoading(false);
      return;
    }
    api.setToken(token);
    try {
      const data = await api.getMe();
      setUser(data.user);
      setMe(data);
    } catch {
      localStorage.removeItem("token");
      api.setToken(null);
      setUser(null);
      setMe(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email: string, password: string) {
    const res = await api.login(email, password);
    api.setToken(res.token);
    localStorage.setItem("token", res.token);
    setUser(res.user);
    await refresh();
    return res.user as User;
  }

  async function signup(data: SignupData) {
    const res = await api.signup(data);
    api.setToken(res.token);
    localStorage.setItem("token", res.token);
    setUser(res.user);
    await refresh();
    return res.user as User;
  }

  function logout() {
    localStorage.removeItem("token");
    api.setToken(null);
    setUser(null);
    setMe(null);
  }

  return (
    <AuthContext.Provider value={{ user, me, loading, login, signup, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
