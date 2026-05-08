"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  fullName: string | null;
  role: "STUDENT" | "INSTRUCTOR" | "ADMIN";
  createdAt: string;
  plan?: string;
  planExpiresAt?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  loginAsDemo: () => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem("classy_token");
    if (storedToken) {
      setToken(storedToken);
      fetchMe(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  async function fetchMe(t: string) {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        localStorage.removeItem("classy_token");
        setToken(null);
      }
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string): Promise<{ error?: string }> {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error || "Giriş başarısız." };

    localStorage.setItem("classy_token", data.token);
    setToken(data.token);
    setUser(data.user);
    return {};
  }

  function loginAsDemo() {
    setUser({
      id: "demo",
      email: "demo@classy.com",
      fullName: "Demo Kullanıcı",
      role: "STUDENT",
      createdAt: new Date().toISOString(),
    });
    setToken("demo");
  }

  function logout() {
    localStorage.removeItem("classy_token");
    setToken(null);
    setUser(null);
    router.push("/login");
  }

  async function refreshUser() {
    const t = localStorage.getItem("classy_token");
    if (t) await fetchMe(t);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, loginAsDemo, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
