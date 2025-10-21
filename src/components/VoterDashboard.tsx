
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../provider/AuthProvider";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { FaUserCircle, FaDownload, FaVoteYea, FaExclamationCircle, FaBuilding, FaFlag } from "react-icons/fa";

type Candidate = {
  _id: string;
  position?: string;
  name: string;
  studentId?: string;
  department?: string;
  photoUrl?: string;
  photo_url?: string;
  displayOrder?: number;
  manifesto?: string;
  party?: string;
  symbol?: string;
  votes?: number;
};

type VotedItem = {
  position: string;
  candidate?: Candidate | null;
  _id: string;
};

type VoterResponse = {
  id: string;
  name: string;
  votedCandidates: Candidate[];
  voted: VotedItem[];
};

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

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");

const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'><rect fill='#e5e7eb' width='100%' height='100%'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#6b7280' font-size='24'>No image</text></svg>`
  );

function safePhotoUrl(url?: string) {
  if (!url) return "";
  try {
    const normalized = url.trim();
    return normalized;
  } catch {
    return "";
  }
}

function getPhotoFromCandidate(c?: Candidate | null): string {
  if (!c) return "";
  return c.photoUrl ?? c.photo_url ?? "";
}

const VoterDashboard: React.FC = () => {
  const printRef = useRef<HTMLDivElement | null>(null);
  const { voterId: paramVoterId } = useParams<{ voterId?: string }>();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const inferredId = (user && (user.id ?? user._id ?? (user as any).voterId ?? (user as any).email)) as string | undefined;
  const voterId = paramVoterId ?? inferredId;

  const [data, setData] = useState<VoterResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);

  useEffect(() => {
    if (!voterId) {
      setError("Voter ID not provided.");
      setLoading(false);
      return;
    }

    const ac = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const tokenFromStorage = getStoredToken();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (tokenFromStorage) headers["Authorization"] = `Bearer ${tokenFromStorage}`;

        const res = await fetch(`${API_BASE}/api/votes/${voterId}`, {
          signal: ac.signal,
          headers,
        });

        const text = await res.text();
        let payload: any = null;
        try {
          payload = text ? JSON.parse(text) : null;
        } catch {
          payload = text;
        }

        if (!res.ok) {
          const msg = typeof payload === "string" ? payload : JSON.stringify(payload);
          throw new Error(msg || `Server responded ${res.status}`);
        }

        setData(payload as VoterResponse);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setError(err?.message ? err.message : String(err));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    return () => ac.abort();
  }, [voterId, user]);

  function createCloneWithoutImages(root: HTMLElement) {
    const clone = root.cloneNode(true) as HTMLElement;

    const imgs = Array.from(clone.querySelectorAll("img"));
    imgs.forEach((img) => {
      const w = img.getAttribute("width") || `${img.clientWidth}px`;
      const h = img.getAttribute("height") || `${img.clientHeight}px`;
      const alt = img.getAttribute("alt") || "Image";
      const placeholder = document.createElement("div");
      placeholder.style.width = img.style.width || w;
      placeholder.style.height = img.style.height || h;
      placeholder.style.display = "flex";
      placeholder.style.alignItems = "center";
      placeholder.style.justifyContent = "center";
      placeholder.style.background = "#e5e7eb";
      placeholder.style.color = "#6b7280";
      placeholder.style.fontSize = "12px";
      placeholder.style.padding = "4px";
      placeholder.innerText = alt;
      img.replaceWith(placeholder);
    });

    clone.style.background = "#ffffff";
    clone.style.padding = getComputedStyle(root).padding;

    return clone;
  }

  const handleDownloadPdf = async () => {
    if (!printRef.current || !data) return;
    setExporting(true);
    try {
      const clone = createCloneWithoutImages(printRef.current as HTMLElement);
      clone.style.position = "fixed";
      clone.style.left = "-9999px";
      clone.style.top = "0";
      clone.style.width = getComputedStyle(printRef.current).width;
      document.body.appendChild(clone);

      const canvas = await html2canvas(clone as HTMLElement, {
        scale: 2,
        useCORS: false,
        allowTaint: false,
        backgroundColor: "#ffffff",
      } as any);

      document.body.removeChild(clone);

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const pxPerMm = canvas.width / pdfWidth;
      const pageHeightPx = Math.floor(pdfHeight * pxPerMm);

      let y = 0;
      while (y < canvas.height) {
        const sliceHeight = Math.min(pageHeightPx, canvas.height - y);
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;
        const ctx = pageCanvas.getContext("2d");
        if (!ctx) break;
        ctx.drawImage(canvas, 0, y, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

        const pageData = pageCanvas.toDataURL("image/png");
        const imgPropsHeight = (sliceHeight * pdfWidth) / canvas.width;

        if (y > 0) pdf.addPage();
        pdf.addImage(pageData, "PNG", 0, 0, pdfWidth, imgPropsHeight);

        y += sliceHeight;
      }

      const fileName = `voter-${data.id ?? "dashboard"}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      setError((err as any)?.message ?? "Failed to generate PDF");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    const auto = searchParams.get("pdf");
    if (auto !== "1") return;
    if (!data) return;
    const t = setTimeout(() => {
      handleDownloadPdf();
    }, 500);
    return () => clearTimeout(t);
  }, [searchParams, data]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight flex items-center">
            <FaVoteYea className="text-indigo-600 mr-3" /> Voter Dashboard
          </h1>
          <button
            onClick={handleDownloadPdf}
            disabled={!data || exporting}
            className="flex items-center bg-indigo-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-300 shadow-lg transform hover:scale-105"
            aria-label="Download PDF"
          >
            <FaDownload className="mr-2" /> {exporting ? "Exporting..." : "Download PDF"}
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-10">
            <div className="bg-white rounded-xl shadow-lg p-8 animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="h-6 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-6 bg-gray-200 rounded w-2/3"></div>
                </div>
                <div className="space-y-4">
                  <div className="h-6 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-8 animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="rounded-xl border p-3">
                    <div className="h-36 w-full bg-gray-200 rounded"></div>
                    <div className="mt-3 space-y-2">
                      <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl text-center shadow-sm">
            <FaExclamationCircle className="inline text-2xl mr-2" />
            Error: {error}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && !data && (
          <div className="text-center py-20 bg-white rounded-xl shadow-lg">
            <FaUserCircle className="text-6xl text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No data available for this voter.</p>
          </div>
        )}

        {/* Main Content */}
        {data && (
          <div ref={printRef} className="space-y-10 bg-white rounded-xl shadow-lg p-8">
            {/* Profile Information */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <FaUserCircle className="text-indigo-600 mr-2" /> Profile Information
              </h2>
              <div className="grid md:grid-cols-2 gap-6 text-gray-800 border-t border-gray-200 pt-4">
                <div className="space-y-2">
                  <p className="flex items-center">
                    <span className="font-semibold w-24">Name:</span>
                    <span>{data.name}</span>
                  </p>
                  <p className="flex items-center">
                    <span className="font-semibold w-24">Voter ID:</span>
                    <span>{data.id}</span>
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="flex items-center">
                    <span className="font-semibold w-24">Votes Cast:</span>
                    <span>{data.voted.length}</span>
                  </p>
                </div>
              </div>
            </section>

            {/* Votes Section */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <FaVoteYea className="text-indigo-600 mr-2" /> Your Votes
              </h2>

              {data.voted.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <FaVoteYea className="text-4xl text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg italic">You haven’t voted yet.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data.voted.map((v) => {
                    const cand = v.candidate ?? null;
                    if (!cand) {
                      return (
                        <div
                          key={v._id}
                          className="rounded-xl border p-4 bg-white shadow-sm hover:shadow-xl transition duration-300"
                        >
                          <div className="h-36 w-full bg-gray-200 rounded-lg flex items-center justify-center text-gray-500">
                            Candidate data unavailable
                          </div>
                          <div className="mt-4">
                            <h3 className="text-lg font-semibold text-gray-900">Unknown</h3>
                            {/* Highlighted Position */}
                            <p
                              className="text-base font-bold text-indigo-700 bg-indigo-100 px-3 py-1 rounded-full mt-2 flex items-center"
                              aria-label={`Position: ${v.position}`}
                            >
                              <FaVoteYea className="mr-2 text-indigo-600 text-lg" />
                              {v.position}
                            </p>
                          </div>
                        </div>
                      );
                    }

                    const rawPhoto = getPhotoFromCandidate(cand);
                    const photoSrc = safePhotoUrl(rawPhoto) || PLACEHOLDER;

                    return (
                      <div
                        key={v._id}
                        className="rounded-xl border p-4 bg-white shadow-sm hover:shadow-xl transition duration-300 transform hover:scale-105"
                      >
                        <div className="h-36 w-full bg-gray-200 rounded-lg overflow-hidden relative">
                          <img
                            src={photoSrc}
                            alt={cand.name ?? "Candidate"}
                            className="object-cover w-full h-full"
                            loading="lazy"
                            onError={(e) => {
                              const img = e.target as HTMLImageElement;
                              img.onerror = null;
                              img.src = PLACEHOLDER;
                              img.style.objectFit = "contain";
                            }}
                          />
                          {cand.party && (
                            <span className="absolute top-2 right-2 bg-indigo-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
                              {cand.party}
                            </span>
                          )}
                        </div>
                        <div className="mt-4">
                          <h3 className="text-lg font-semibold text-gray-900">{cand.name}</h3>
                          {/* Highlighted Position */}
                          <p
                            className="text-base font-bold text-indigo-700 bg-indigo-100 px-3 py-1 rounded-full mt-2 flex items-center"
                            aria-label={`Position: ${v.position}`}
                          >
                            <FaVoteYea className="mr-2 text-indigo-600 text-lg" />
                            {v.position}
                          </p>
                          {cand.department && (
                            <p className="text-sm text-gray-600 mt-1 flex items-center">
                              <FaBuilding className="mr-2 text-indigo-600" />
                              <strong>Dept:</strong> {cand.department}
                            </p>
                          )}
                          {cand.party && (
                            <p className="text-sm text-gray-600 mt-1 flex items-center">
                              <FaFlag className="mr-2 text-indigo-600" />
                              <strong>Party:</strong> {cand.party}
                            </p>
                          )}
                          {cand.manifesto && (
                            <p className="text-sm text-gray-700 mt-2 italic">“{cand.manifesto}”</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoterDashboard;