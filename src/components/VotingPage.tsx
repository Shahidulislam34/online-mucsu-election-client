/* eslint-disable no-empty */
/* eslint-disable no-constant-binary-expression */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../provider/AuthProvider";
import { CheckCircle, AlertCircle, Vote, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Candidate {
  id: string;
  position?: string;
  full_name: string;
  student_id?: string;
  department?: string;
  photo_url?: string;
  manifesto?: string;
  display_order?: number;
  vote_count?: number;
  meta?: any;
}

interface ElectionConfigShape {
  _id?: string;
  electionTitle?: string;
  description?: string;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean;
  maxVotesPerVoter?: number;
  allowMultiplePositions?: boolean;
  resultVisibility?: string;
  [k: string]: any;
}

interface Voter {
  id?: string;
  full_name?: string;
  department?: string;
  has_voted?: boolean;
  role?: string;
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");

/*
  Single, robust fetch helper: normalizes stored token (strip "Bearer "),
  attaches Authorization header when token exists.
*/
async function fetchJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = path.startsWith("/") ? `${API_BASE}${path}` : `${API_BASE}/${path}`;
  function readToken(): string | null {
    try {
      const keys = ["token", "accessToken", "access_token", "authToken", "auth_token", "authorization"];
      for (const k of keys) {
        const v = localStorage.getItem(k);
        if (v) return v;
      }
      if (typeof document !== "undefined" && document.cookie) {
        const cookiePairs = document.cookie.split(";").map((c) => c.trim());
        for (const pair of cookiePairs) {
          const [name, ...rest] = pair.split("=");
          const val = rest.join("=");
          if (["token", "access_token", "auth_token"].includes(name)) return decodeURIComponent(val);
        }
      }
    } catch {}
    return null;
  }
  const raw = readToken();
  const token = raw ? (raw.startsWith("Bearer ") ? raw.replace(/^Bearer\s+/, "") : raw) : null;
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(options.headers as any) };
  if (token) headers["Authorization"] = `Bearer ${token}`;


  // eslint-disable-next-line no-console
  console.log("[fetchJson] ", options.method ?? "GET", url, "hasAuth:", !!headers["Authorization"]);

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    // eslint-disable-next-line no-console
    console.error("[fetchJson] error", res.status, data);
    throw data || { status: res.status, message: res.statusText };
  }
  return data as T;
}

// --- helpers for rehydration ---
function getStoredToken(): string | null {
  try {
    const raw =
      localStorage.getItem("token") ??
      localStorage.getItem("accessToken") ??
      localStorage.getItem("access_token") ??
      localStorage.getItem("authToken") ??
      localStorage.getItem("auth_token") ??
      null;
    if (!raw) return null;
    return raw.startsWith("Bearer ") ? raw.replace(/^Bearer\s+/, "") : raw;
  } catch {
    return null;
  }
}

function tryParseStoredUser(): any | null {
  try {
    const keys = ["user", "currentUser", "profile", "auth_user", "authUser"];
    for (const k of keys) {
      const v = localStorage.getItem(k);
      if (!v) continue;
      try {
        const parsed = JSON.parse(v);
        if (parsed && typeof parsed === "object") return parsed;
      } catch {
        // not JSON
      }
    }
  } catch {}
  return null;
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
// --- end helpers ---

export default function VotingPage() {
  const { voter, signOut } = useAuth();
  const navigate = useNavigate();
  const [currentVoter, setCurrentVoter] = useState<Voter | null>(voter ?? null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [electionConfig, setElectionConfig] = useState<ElectionConfigShape | null>(null);
  const [selectedByPosition, setSelectedByPosition] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    loadElectionData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep currentVoter in sync with context and try multiple rehydration strategies.
  // IMPORTANT: only rehydrate from localStorage or /me when a valid token exists.
  useEffect(() => {
    setCurrentVoter(voter ?? null);

    const ctxId = (voter as Voter)?.id;
    if (ctxId) {
      console.log("Voter id from context:", ctxId);
      return;
    }

    (async () => {
      try {
        const token = getStoredToken();
        if (!token) {
          console.log("No auth token present — skipping local/user rehydrate.");
          return;
        }

        // 1) Try stored user object only if token exists
        const stored = tryParseStoredUser();
        if (stored) {
          const id = stored._id ?? stored.id ?? stored.userId ?? stored.uid ?? stored.sub ?? null;
          if (id) {
            console.log("Voter id from localStorage user (with token):", id);
            setCurrentVoter({
              id: String(id),
              full_name: stored.full_name ?? stored.fullName ?? stored.name ?? stored.email ?? "",
              department: stored.department ?? stored.dept ?? "",
              has_voted: stored.has_voted ?? stored.hasVoted ?? false,
              role:
                stored.role ??
                stored.role_name ??
                (Array.isArray(stored.roles) ? (stored.roles[0]?.name ?? stored.roles[0]) : undefined),
            });
            return;
          }
        }

        // 2) Try decode token payload for id claim
        const payload = safeDecodeJwtPayload(token);
        if (payload) {
          const id = payload.sub ?? payload.userId ?? payload.uid ?? payload.id ?? null;
          if (id) {
            console.log("Voter id from token payload:", id);
            setCurrentVoter({
              id: String(id),
              full_name: payload.name ?? payload.fullName ?? payload.email ?? "",
              department: payload.department ?? "",
              has_voted: payload.has_voted ?? payload.hasVoted ?? false,
              role: payload.role ?? (Array.isArray(payload.roles) ? payload.roles[0] : undefined),
            });
            return;
          }
        }

        // 3) Fallback: fetch /api/auth/me using token (fetchJson attaches token)
        const endpoints = ["/api/auth/me", "/api/me", "/auth/me"];
        for (const ep of endpoints) {
          try {
            const me = await fetchJson<any>(ep).catch(() => null);
            if (!me) continue;
            const payloadMe = me.user ?? me.voter ?? me;
            const id = payloadMe?._id ?? payloadMe?.id ?? payloadMe?.userId ?? payloadMe?.uid ?? payloadMe?.sub ?? null;
            if (id) {
              console.log("Voter id from /api/auth/me:", id);
              setCurrentVoter({
                id: String(id),
                full_name: payloadMe?.full_name ?? payloadMe?.fullName ?? payloadMe?.name ?? payloadMe?.email ?? "",
                department: payloadMe?.department ?? payloadMe?.dept ?? "",
                has_voted: payloadMe?.has_voted ?? payloadMe?.hasVoted ?? false,
                role:
                  payloadMe?.role ??
                  payloadMe?.role_name ??
                  (Array.isArray(payloadMe?.roles) ? (payloadMe.roles[0]?.name ?? payloadMe.roles[0]) : undefined),
              });
              return;
            }
          } catch {
            // try next endpoint
          }
        }

        console.log("Unable to rehydrate voter id from any source despite token.");
      } catch (err) {
        console.error("rehydrate voter error:", err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voter]);

  const normalizeCandidates = (raw: any[]): Candidate[] =>
    (raw || []).map((c: any) => {
      const meta = c.meta ?? c.metadata ?? {};
      return {
        id: String(c._id ?? c.id ?? ""),
        full_name: c.full_name ?? c.fullName ?? c.name ?? meta.name ?? "",
        position: c.position ?? meta.position ?? (c.position_title ?? "") ?? "Unspecified",
        student_id: c.studentId ?? c.student_id ?? meta.studentId ?? "",
        department: c.department ?? meta.department ?? "",
        photo_url: c.photoUrl ?? c.photo_url ?? c.symbol ?? meta.photo_url ?? "",
        manifesto: c.manifesto ?? meta.manifesto ?? "",
        display_order: Number(c.displayOrder ?? c.display_order ?? meta.displayOrder ?? 0),
        vote_count: Number(c.votes ?? c.vote_count ?? c.voteCount ?? meta.votes ?? 0),
        meta,
      } as Candidate;
    });

  const normalizeConfig = (raw: any): ElectionConfigShape | null => {
    if (!raw) return null;
    const cfg = raw?.ok && raw?.config ? raw.config : raw.config ?? raw;
    if (!cfg) return null;
    return {
      ...cfg,
      startDate: cfg.startDate ?? cfg.start_date ?? cfg.voting_start_time ?? null,
      endDate: cfg.endDate ?? cfg.end_date ?? cfg.voting_end_time ?? null,
      isActive: cfg.isActive ?? cfg.is_active ?? false,
      maxVotesPerVoter: cfg.maxVotesPerVoter ?? cfg.max_votes_per_voter ?? 1,
    };
  };

  const loadElectionData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rawConfig, rawCandidates] = await Promise.all([
        fetchJson<any>("/api/election-config").catch(() => null),
        fetchJson<any>("/api/candidates").catch(() => null),
      ]);

      const cfg = normalizeConfig(rawConfig);
      let candArray: any[] = [];
      if (Array.isArray(rawCandidates) && rawCandidates.length > 0) candArray = rawCandidates;
      else if (rawCandidates?.data && Array.isArray(rawCandidates.data)) candArray = rawCandidates.data;
      else if (rawCandidates?.candidates && Array.isArray(rawCandidates.candidates)) candArray = rawCandidates.candidates;

      if ((!Array.isArray(candArray) || candArray.length === 0) && rawConfig) {
        candArray =
          rawConfig?.data?.candidates ??
          rawConfig?.candidates ??
          rawConfig?.data?.items ??
          rawConfig?.items ??
          rawConfig?.data ??
          rawConfig?.candidatesList ??
          [];
      }

      const normalized = normalizeCandidates(Array.isArray(candArray) ? candArray : []);
      normalized.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0) || a.full_name.localeCompare(b.full_name));

      setElectionConfig(cfg);
      setCandidates(normalized);
    } catch (err: any) {
      console.error("loadElectionData error:", err);
      setError(err?.message || "Failed to load election data");
    } finally {
      setLoading(false);
    }
  };

  const isVotingOpen = (): boolean => {
    if (!electionConfig) return false;
    const now = new Date();
    const start = electionConfig.startDate ? new Date(electionConfig.startDate) : null;
    const end = electionConfig.endDate ? new Date(electionConfig.endDate) : null;
    if (!electionConfig.isActive) return false;
    if (start && end) return now >= start && now <= end;
    if (start && !end) return now >= start;
    if (!start && end) return now <= end;
    return true;
  };

  const grouped = useMemo(() => {
    const map = new Map<string, Candidate[]>();
    for (const c of candidates) {
      const pos = c.position?.trim() || "Unspecified";
      if (!map.has(pos)) map.set(pos, []);
      map.get(pos)!.push(c);
    }
    for (const [k, arr] of map) {
      arr.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0) || a.full_name.localeCompare(b.full_name));
      map.set(k, arr);
    }
    return map;
  }, [candidates]);

  const positionKeys = Array.from(grouped.keys());
  const maxAllowed = Math.max(1, positionKeys.length);
  const loggedIn = Boolean((currentVoter as Voter)?.id ?? (voter as Voter)?.id);
  const votingOpen = loggedIn || isVotingOpen();
  const hasVoted = Boolean((currentVoter as Voter)?.has_voted ?? (voter as Voter)?.has_voted);

  const selectCandidate = (position: string, candidateId: string) => {
    setError(null);
    setToast(null);
    setSelectedByPosition((prev) => ({ ...prev, [position]: candidateId }));
  };

  const clearSelection = (position?: string) => {
    setSelectedByPosition((prev) => {
      if (!position) return {};
      const next = { ...prev };
      delete next[position];
      return next;
    });
  };


  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      if (!votingOpen) {
        setError("Voting is not currently open. Please ensure the election is active.");
        return;
      }
      if (hasVoted) {
        setError("You have already voted.");
        return;
      }
      const selectedEntries = Object.entries(selectedByPosition).filter(([, cid]) => cid);
      if (selectedEntries.length === 0) {
        setError("Please select at least one candidate to submit.");
        return;
      }

      const voterId =
        (currentVoter as Voter)?.id ??
        (voter as Voter)?.id ??
        (() => {
          const s = tryParseStoredUser();
          return s?._id ?? s?.id ?? s?.userId ?? s?.uid ?? s?.sub ?? null;
        })() ??
        (() => {
          const payload = safeDecodeJwtPayload(getStoredToken());
          return payload ? payload.sub ?? payload.userId ?? payload.uid ?? payload.id ?? null : null;
        })();

      if (!voterId) {
        setError("You must be logged in to vote (missing voter id). Please login and try again.");
        return;
      }

      const votesToInsert = selectedEntries.map(([position, candidate_id]) => ({
        voter_id: voterId,
        voterId: voterId,
        candidate_id,
        candidateId: candidate_id,
        position,
      }));

      
      // eslint-disable-next-line no-console
      // console.log("Prepared votes payload:", votesToInsert);

      // Try batch first, fall back to single requests
      let submitted = false;
      try {
        const resp = await fetchJson("/api/votes", {
          method: "POST",
          body: JSON.stringify({ votes: votesToInsert }),
        });
        // eslint-disable-next-line no-console
        console.log("/api/votes response:", resp);
        submitted = true;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("/api/votes batch failed, trying single requests...", err);
        try {
          for (const v of votesToInsert) {
            await fetchJson("/api/votes", {
              method: "POST",
              body: JSON.stringify({ voterId: v.voterId, candidateId: v.candidateId, position: v.position }),
            });
          }
          submitted = true;
        } catch (err2) {
          // eslint-disable-next-line no-console
          console.error("single vote submissions failed:", err2);
          throw err2;
        }
      }

      if (submitted) {
        setToast("Votes submitted successfully.");
        setSelectedByPosition({});
        await loadElectionData();

        // show toast briefly then redirect to results page
                  setTimeout(() => {
                  // redirect to voter dashboard (include voterId when available)
                  const id = voterId ? String(voterId) : undefined;
                  try {
                    navigate(id ? `/voter-dashboard/${id}` : "/voter-dashboard");
                  } catch {
                    // fallback to basic navigation if navigate throws
                    window.location.href = id ? `/voter-dashboard/${id}` : "/voter-dashboard";
                  }
                }, 1500);


      }
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("submit vote error:", err);
      setError(err?.message || err?.error || "Failed to submit vote");
    } finally {
      setSubmitting(false);
      // keep clearing toast after a bit (existing behavior)
      setTimeout(() => setToast(null), 3500);
    }
  };



  
  useEffect(() => {
    const id = (currentVoter as Voter)?.id ?? (voter as Voter)?.id ?? null;
    // console.log("Voter ID (current):", id, "context voter:", voter, "currentVoter:", currentVoter);
  }, [currentVoter, voter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading election data...</p>
        </div>
      </div>
    );
  }

return (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex items-center justify-center px-4 py-10">
    <div className="w-full max-w-6xl bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-700 to-emerald-600 px-6 sm:px-10 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-md">
            {electionConfig?.electionTitle ?? "MUCSU Election Ballot"}
          </h1>
          <p className="text-blue-100 text-sm sm:text-base">
            {electionConfig?.description ?? "Cast your vote for your leaders"}
          </p>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-5 py-2.5 rounded-xl font-medium transition-all duration-300 hover:scale-105"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </header>

      {/* Voter Info */}
      <section className="px-6 sm:px-10 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex-1 bg-gradient-to-r from-blue-50 to-emerald-50 border border-gray-200 rounded-2xl p-5 shadow-sm">
            <p className="text-lg font-semibold text-gray-800">
              <span className="text-blue-700">Voter:</span> {currentVoter?.full_name ?? voter?.full_name ?? "—"}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {currentVoter?.department ?? voter?.department ?? ""}
            </p>
            {((currentVoter as any)?.role ?? (voter as any)?.role) && (
              <p className="text-sm text-gray-500 mt-1">
                Role: {(currentVoter as any)?.role ?? (voter as any)?.role}
              </p>
            )}
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-gray-700">
            <p><strong>Status:</strong> "🟢 Active"</p>
            <p><strong>Allowed:</strong> {maxAllowed} {maxAllowed === 1 ? "vote" : "votes"}</p>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl">
            <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}
        {toast && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-6 py-4 rounded-xl text-center font-semibold shadow-sm">
            {toast}
          </div>
        )}

        {/* Candidate Lists */}
        <div className="space-y-8">
          {positionKeys.map((position) => {
            const group = grouped.get(position) ?? [];
            const selectedId = selectedByPosition[position];
            return (
              <div key={position} className="border border-gray-200 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 bg-white/90 backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-between border-b border-gray-100 p-5 bg-gradient-to-r from-gray-50 to-white rounded-t-2xl">
                  <h3 className="text-xl font-bold text-gray-800">{position}</h3>
                  <span className="text-sm text-gray-500">
                    {group.length} candidate{group.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <ul className="divide-y divide-gray-100">
                  {group.map((c) => {
                    const isSelected = selectedId === c.id;
                    return (
                      <li
                        key={c.id}
                        onClick={() => votingOpen && !hasVoted && selectCandidate(position, c.id)}
                        className={`flex items-center justify-between gap-4 p-5 cursor-pointer transition-all duration-200 ${
                          isSelected ? "bg-blue-50 border-l-4 border-blue-500" : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <input
                            type="radio"
                            checked={isSelected}
                            onChange={() => {}}
                            disabled={!votingOpen || hasVoted}
                            className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex items-center gap-4">
                            {c.photo_url ? (
                              <img
                                src={c.photo_url}
                                alt={c.full_name}
                                className="w-14 h-14 rounded-full object-cover border-2 border-blue-200 shadow-sm"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 border-2 border-gray-300">
                                <Vote className="w-7 h-7" />
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-gray-900">{c.full_name}</p>
                              <p className="text-sm text-gray-600">
                                {c.student_id ?? ""}{c.department ? ` • ${c.department}` : ""}
                              </p>
                              {c.manifesto && (
                                <p className="text-sm text-gray-700 mt-1 italic line-clamp-2">{c.manifesto}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        {isSelected && <CheckCircle className="w-6 h-6 text-blue-600" />}
                      </li>
                    );
                  })}
                </ul>
                <div className="flex justify-end p-4">
                  <button
                    type="button"
                    onClick={() => clearSelection(position)}
                    disabled={!selectedId || !votingOpen || hasVoted}
                    className="text-sm text-gray-600 hover:text-gray-900 underline disabled:text-gray-400 transition-all"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Submit Button */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-gray-700 font-medium text-center sm:text-left">
            Selected:{" "}
            <span className="font-semibold text-blue-600">
              {Object.keys(selectedByPosition).filter((k) => selectedByPosition[k]).length}
            </span>{" "}
            of {maxAllowed}
          </div>
          <button
            onClick={handleSubmit}
            disabled={
              submitting ||
              Object.keys(selectedByPosition).filter((k) => selectedByPosition[k]).length === 0 ||
              !votingOpen ||
              hasVoted
            }
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-semibold py-3 px-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting
              ? "Submitting..."
              : !votingOpen
              ? "Voting Closed"
              : hasVoted
              ? "Already Voted"
              : "Submit Votes"}
          </button>
        </div>
      </section>
    </div>
  </div>
);

};

