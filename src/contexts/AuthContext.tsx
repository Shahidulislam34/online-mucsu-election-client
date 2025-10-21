/* eslint-disable react-refresh/only-export-components */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");

async function fetchJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = path.startsWith("/") ? `${API_BASE}${path}` : `${API_BASE}/${path}`;
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let data: T | null = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text as unknown as T;
  }
  if (!res.ok) throw data || { status: res.status, message: res.statusText };
  return data as T;
}

export interface AuthContextType {
  user: any | null; // Replace 'any' with specific user type if known
  loading: boolean;
  register: (payload: { email: string; password: string; fullName?: string }) => Promise<any>;
  login?: (email: string, password: string) => Promise<any>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; token?: string; user?: any; error?: string }>;
  logout: () => Promise<void>;
  setUser?: (u: any | null) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null); // Replace 'any' with specific user type
  const [loading, setLoading] = useState(true);

  const register = async (payload: { email: string; password: string; fullName?: string }) => {
    const res = await fetchJson<{ token?: string; user?: any; error?: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (res?.token) {
      localStorage.setItem("token", res.token);
      setUser(res.user ?? null);
    }
    return res;
  };

  const signIn = async (email: string, password: string): Promise<{ success: boolean; token?: string; user?: any; error?: string }> => {
    try {
      const res = await fetchJson<{
        [x: string]: string | undefined; token?: string; user?: any; error?: string
      }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (res?.token) {
        localStorage.setItem("token", res.token);
        setUser(res.user ?? null);
        return { success: true, token: res.token, user: res.user ?? null };
      }

      return { success: false, error: res?.error || res?.message || "Login failed" };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  };

  const login = async (email: string, password: string) => {
    return signIn(email, password);
  };

  const logout = async () => {
    try {
      await fetchJson<void>("/api/auth/logout", { method: "POST" }).catch(() => { });
    } finally {
      localStorage.removeItem("token");
      setUser(null);
    }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (token) {
          const res = await fetchJson<any>("/api/auth/me");
          if (mounted) setUser(res?.user ?? res ?? null);
        } else {
          if (mounted) setUser(null);
        }
      } catch {
        localStorage.removeItem("token");
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const authInfo: AuthContextType = {
    user,
    loading,
    register,
    login,
    signIn,
    logout,
    setUser,
  };

  return <AuthContext.Provider value={authInfo}>{children}</AuthContext.Provider>;
};

export default AuthProvider;