/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");

// read & normalize stored token (strip possible "Bearer " prefix) from common keys/cookies
function getStoredToken(): string | null {
  try {
    const keys = ["token", "accessToken", "access_token", "authToken", "auth_token", "authorization"];
    for (const k of keys) {
      const v = localStorage.getItem(k);
      if (v) return v.startsWith("Bearer ") ? v.replace(/^Bearer\s+/, "") : v;
    }

    if (typeof document !== "undefined" && document.cookie) {
      const cookiePairs = document.cookie.split(";").map((c) => c.trim());
      for (const pair of cookiePairs) {
        const [name, ...rest] = pair.split("=");
        const val = rest.join("=");
        if (["token", "access_token", "auth_token"].includes(name)) {
          const dec = decodeURIComponent(val);
          return dec.startsWith("Bearer ") ? dec.replace(/^Bearer\s+/, "") : dec;
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function clearAuthStorage() {
  try {
    const keys = [
      "token",
      "accessToken",
      "access_token",
      "authToken",
      "auth_token",
      "authorization",
      "refreshToken",
      "user",
      "currentUser",
      "profile",
      "auth_user",
      "authUser",
    ];
    for (const k of keys) localStorage.removeItem(k);

    // best-effort clear cookies
    if (typeof document !== "undefined" && document.cookie) {
      document.cookie.split(";").forEach((c) => {
        const name = c.split("=")[0].trim();
        if (!name) return;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      });
    }
  } catch {
    // ignore
  }
}

async function fetchJson(path: string, options: RequestInit = {}) {
  const url = path.startsWith("/") ? `${API_BASE}${path}` : `${API_BASE}/${path}`;
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (res.status === 401) {
    // clear local auth state to avoid stale credentials
    clearAuthStorage();
    throw { status: 401, message: "Unauthorized", data };
  }

  if (!res.ok) throw data || { status: res.status, message: res.statusText };
  return data;
}

export interface AuthContextType {
  user: any | null;
  voter?: any | null;
  loading: boolean;
  register: (payload: { email: string; password: string; fullName?: string; role?: string }) => Promise<any>;
  login?: (email: string, password: string) => Promise<any>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; token?: string; user?: any; error?: string }>;
  signOut: () => Promise<void>;
  setUser?: (u: any | null) => void;
  setVoter?: (v: any | null) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [voter, setVoter] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const register = async (payload: { email: string; password: string; fullName?: string; role?: string }) => {
    const res = await fetchJson("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const access = res?.data?.accessToken ?? res?.accessToken ?? res?.token;
    const refresh = res?.data?.refreshToken ?? res?.refreshToken ?? null;
    const userObj = res?.data?.user ?? res?.user ?? null;

    if (access) {
      const clean = access.replace?.(/^Bearer\s+/, "") ?? access;
      localStorage.setItem("token", clean);
      if (refresh) localStorage.setItem("refreshToken", refresh);
      setUser(userObj ?? null);

      // populate voter (if backend returns)
      try {
        const me = await fetchJson("/api/auth/me");
        const voterObj = me?.voter ?? me?.user ?? me ?? null;
        setVoter(voterObj ?? null);
      } catch {
        // ignore
      }
    }
    return res;
  };

  const signIn = async (email: string, password: string) => {
    try {
      const res = await fetchJson("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const access = res?.data?.accessToken ?? res?.accessToken ?? res?.token;
      const refresh = res?.data?.refreshToken ?? res?.refreshToken ?? null;
      const userObj = res?.data?.user ?? res?.user ?? null;

      if (access) {
        const clean = access.replace?.(/^Bearer\s+/, "") ?? access;
        localStorage.setItem("token", clean);
        if (refresh) localStorage.setItem("refreshToken", refresh);
        setUser(userObj ?? null);

        // populate voter using /me if available
        try {
          const me = await fetchJson("/api/auth/me");
          const voterObj = me?.voter ?? me?.user ?? me ?? null;
          setVoter(voterObj ?? (userObj ? { id: userObj.id ?? userObj._id ?? null, full_name: userObj.fullName ?? userObj.full_name ?? userObj.email } : null));
        } catch {
          setVoter(userObj ? { id: userObj.id ?? userObj._id ?? null, full_name: userObj.fullName ?? userObj.full_name ?? userObj.email } : null);
        }

        return { success: true, token: clean, user: userObj ?? null };
      }

      return { success: false, error: res?.error || res?.message || "Login failed" };
    } catch (err: any) {
      return { success: false, error: err?.error || err?.message || String(err) };
    }
  };

  const login = async (email: string, password: string) => {
    return signIn(email, password);
  };

  const signOut = async () => {
    try {
      const refresh = localStorage.getItem("refreshToken");
      // call backend logout if available, ignore errors
      await fetchJson("/api/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken: refresh }),
      }).catch(() => {});
    } catch {
      // ignore
    } finally {
      clearAuthStorage();
      setUser(null);
      setVoter(null);
    }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const token = getStoredToken();
        if (token) {
          try {
            const me = await fetchJson("/api/auth/me");
            const userObj = me?.user ?? me?.data?.user ?? me ?? null;
            if (mounted) setUser(userObj);
            const voterObj = me?.voter ?? me?.data?.voter ?? userObj ?? me ?? null;
            if (mounted) setVoter(voterObj);
          } catch (err) {
            // invalid/expired token or 401: clear everything
            clearAuthStorage();
            if (mounted) {
              setUser(null);
              setVoter(null);
            }
          }
        } else {
          // no token -> ensure no stale user present
          if (mounted) {
            setUser(null);
            setVoter(null);
          }
        }
      } catch {
        clearAuthStorage();
        if (mounted) {
          setUser(null);
          setVoter(null);
        }
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
    voter,
    loading,
    register,
    login,
    signIn,
    signOut,
    setUser,
    setVoter,
  };

  return <AuthContext.Provider value={authInfo}>{children}</AuthContext.Provider>;
};

export default AuthProvider;