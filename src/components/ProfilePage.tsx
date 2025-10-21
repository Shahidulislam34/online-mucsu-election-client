
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../provider/AuthProvider";
import { FaUserCircle, FaSignOutAlt, FaVoteYea } from "react-icons/fa"; // Import icons for visual enhancement

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");

function getStoredToken() {
  try {
    return (
      localStorage.getItem("token") ??
      localStorage.getItem("accessToken") ??
      localStorage.getItem("access_token") ??
      localStorage.getItem("authToken") ??
      localStorage.getItem("auth_token") ??
      null
    );
  } catch {
    return null;
  }
}

function safeDecodeJwtPayload(token: string | null) {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(payload)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const [remoteUser, setRemoteUser] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true); // Added loading state
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); // Start loading
      const token = getStoredToken();
      if (!token) {
        setLoading(false);
        return;
      }
      const headers: Record<string, string> = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
      const endpoints = ["/api/auth/me", "/api/me", "/auth/me"];
      for (const ep of endpoints) {
        try {
          const res = await fetch(`${API_BASE}${ep}`, { method: "GET", headers, credentials: "omit" });
          if (!res.ok) continue;
          const data = await res.json();
          const payload = data.user ?? data;
          if (!cancelled) setRemoteUser(payload);
          break;
        } catch {
          // try next endpoint
        }
      }
      setLoading(false); // End loading
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const mergedCandidate = { ...(user ?? {}), ...(remoteUser ?? {}) };
    const hasRole = mergedCandidate.role ?? mergedCandidate.role_name ?? mergedCandidate.meta?.role;
    if (!hasRole) {
      const token = getStoredToken();
      const payload = safeDecodeJwtPayload(token);
      if (payload) {
        const possible =
          payload.role ??
          payload.roles ??
          payload["role"] ??
          payload["roles"] ??
          payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ??
          null;
        if (possible) {
          const normalized = Array.isArray(possible) ? String(possible[0]) : String(possible);
          setRemoteUser((prev: any | null) => ({ ...(prev ?? {}), role: normalized }));
        }
      }
    }
  }, [user, remoteUser]);

  const merged = { ...(user ?? {}), ...(remoteUser ?? {}) };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100 flex items-center justify-center">
        <div className="max-w-3xl w-full mx-auto p-8">
          <div className="bg-white rounded-xl shadow-lg p-8 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
              <div className="h-6 bg-gray-200 rounded w-2/3"></div>
              <div className="h-6 bg-gray-200 rounded w-2/3"></div>
              <div className="h-6 bg-gray-200 rounded w-2/3"></div>
            </div>
            <div className="mt-6 flex gap-3">
              <div className="h-10 bg-gray-200 rounded w-24"></div>
              <div className="h-10 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!merged || Object.keys(merged).length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100 flex items-center justify-center">
        <div className="max-w-md mx-auto p-8 text-center bg-white rounded-xl shadow-lg">
          <FaUserCircle className="text-6xl text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg mb-6">No user data. Please login to continue.</p>
          <button
            onClick={() => navigate("/login")}
            className="bg-indigo-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-indigo-700 transition duration-300 shadow-lg transform hover:scale-105"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const role = merged.role ?? merged.role_name ?? merged.meta?.role ?? "-";

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100 flex items-center justify-center">
      <div className="max-w-3xl w-full mx-auto p-8">
        <div className="bg-white rounded-xl shadow-lg p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 to-purple-50 opacity-50"></div>
          <div className="relative z-10">
            <div className="flex items-center mb-6">
              <FaUserCircle className="text-5xl text-indigo-600 mr-4" />
              <h2 className="text-3xl font-bold text-gray-900">Your Profile</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center">
                <span className="font-semibold text-gray-700 w-24">Name:</span>
                <span className="text-gray-900">{merged.fullName ?? merged.full_name ?? "-"}</span>
              </div>
              <div className="flex items-center">
                <span className="font-semibold text-gray-700 w-24">Email:</span>
                <span className="text-gray-900">{merged.email ?? merged.email_address ?? "-"}</span>
              </div>
              <div className="flex items-center">
                <span className="font-semibold text-gray-700 w-24">Role:</span>
                <span className="text-gray-900">{role}</span>
              </div>
            </div>
            <div className="mt-8 flex gap-4">
              <button
                onClick={handleLogout}
                className="flex items-center bg-red-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-red-700 transition duration-300 shadow-lg transform hover:scale-105"
                aria-label="Logout"
              >
                <FaSignOutAlt className="mr-2" /> Logout
              </button>
              <button
                onClick={() => navigate("/voting-page")}
                className="flex items-center bg-indigo-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-indigo-700 transition duration-300 shadow-lg transform hover:scale-105"
                aria-label="Go to Voting Page"
              >
                <FaVoteYea className="mr-2" /> Go to Voting
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}