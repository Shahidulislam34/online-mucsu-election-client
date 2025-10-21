
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef } from "react";
import { Trophy, Medal, Award, Lock, TrendingUp, Download } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

type Candidate = {
  id: string;
  position: string;
  full_name: string;
  student_id?: string;
  department?: string;
  photo_url?: string;
  manifesto?: string;
  display_order?: number;
  vote_count?: number;
  party?: string;
  symbol?: string;
  [k: string]: any;
};

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");

function getStoredToken(): string | null {
  try {
    const raw =
      localStorage.getItem("token") ??
      localStorage.getItem("accessToken") ??
      localStorage.getItem("access_token");
    if (!raw) return null;
    return raw.startsWith("Bearer ") ? raw.replace(/^Bearer\s+/, "") : raw;
  } catch {
    return null;
  }
}

async function fetchJson(path: string, options: RequestInit = {}) {
  const url = path.startsWith("/") ? `${API_BASE}${path}` : `${API_BASE}/${path}`;
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as any),
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
  if (!res.ok) throw data || { status: res.status, message: res.statusText };
  return data;
}

export default function ResultsPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [positions, setPositions] = useState<string[]>([]);
  const [totalVotesAll, setTotalVotesAll] = useState<number | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadResults();
  }, []);

  const normalize = (c: any): Candidate => ({
    id: String(c._id ?? c.id ?? ""),
    position: c.position ?? "Unspecified",
    full_name: c.name ?? c.full_name ?? "",
    student_id: c.studentId ?? c.student_id ?? "",
    department: c.department ?? "",
    photo_url: c.photoUrl ?? c.photo_url ?? "",
    manifesto: c.manifesto ?? "",
    display_order: Number(c.displayOrder ?? c.display_order ?? 0),
    vote_count: Number(c.votes ?? c.vote_count ?? 0),
    party: c.party ?? "",
    symbol: c.symbol ?? "",
    ...c,
  });

  const loadResults = async () => {
    setLoading(true);
    try {
      const res = await fetchJson("/api/results");
      const list = Array.isArray(res)
        ? res
        : res?.candidates || res?.data?.candidates || [];
      const normalized = list.map(normalize);
      normalized.sort(
        (a: { display_order: any; full_name: string; }, b: { display_order: any; full_name: any; }) =>
          (a.display_order ?? 0) - (b.display_order ?? 0) ||
          a.full_name.localeCompare(b.full_name)
      );
      setCandidates(normalized);

      // compute and store total votes across all positions so the setter is used
      const total = normalized.reduce((sum: any, c: { vote_count: any; }) => sum + (c.vote_count ?? 0), 0);
      setTotalVotesAll(total);

      const uniquePositions = Array.from(
        new Set(
          normalized.map((c: { position: any; }) => String(c.position ?? "Unspecified").trim())
        )
      ).filter(Boolean) as string[];
      setPositions(uniquePositions);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const candidatesByPosition = (pos: string) =>
    candidates
      .filter((c) => (c.position ?? "Unspecified") === pos)
      .sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0));

  const totalVotesForPosition = (pos: string) =>
    candidatesByPosition(pos).reduce((s, c) => s + (c.vote_count ?? 0), 0);

  const percent = (votes: number, pos: string) => {
    const total = totalVotesForPosition(pos);
    return total > 0 ? ((votes / total) * 100).toFixed(1) : "0.0";
  };

  const rankIcon = (i: number) => {
    switch (i) {
      case 0:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 1:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 2:
        return <Award className="w-6 h-6 text-orange-600" />;
      default:
        return <div className="w-6 h-6 text-gray-500 font-bold">{i + 1}</div>;
    }
  };

  const downloadPdf = async () => {
    if (!printRef.current) return;
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      } as any);
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const position = 0;
      pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, pdfHeight);
      pdf.save("election-results.pdf");
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("❌ Failed to generate PDF. Try again.");
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-green-100">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-700 font-medium">Loading election results…</p>
        </div>
      </div>
    );

  if (!candidates.length)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md bg-white shadow-lg rounded-2xl p-6 text-center">
          <Lock className="w-10 h-10 text-yellow-600 mx-auto mb-3" />
          <h2 className="text-xl font-bold">Results Not Available</h2>
          <p className="text-gray-500 mt-2">
            Please check back after the official announcement.
          </p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 py-10">
      <div className="max-w-6xl mx-auto px-4">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-blue-700 to-green-600 rounded-2xl shadow-xl text-white flex flex-col md:flex-row items-center justify-between p-8 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <Trophy className="w-12 h-12 text-yellow-300" />
              <h1 className="text-3xl md:text-4xl font-bold">Election Results</h1>
            </div>
            {totalVotesAll && (
              <p className="mt-2 text-blue-100 text-sm">
                Total Votes Cast: {totalVotesAll}
              </p>
            )}
          </div>

          <button
            onClick={downloadPdf}
            type="button"
            className="mt-4 md:mt-0 flex items-center gap-2 bg-white text-blue-700 px-4 py-2 rounded-lg shadow hover:bg-blue-50 transition-all"
          >
            <Download className="w-4 h-4" /> Download PDF
          </button>
        </div>

        {/* RESULTS */}
        <div ref={printRef} className="bg-white rounded-2xl shadow-md p-8">
          {positions.map((pos) => {
            const list = candidatesByPosition(pos);
            const totalPos = totalVotesForPosition(pos);
            return (
              <section key={pos} className="mb-10 border-b pb-6 last:border-0">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">{pos}</h2>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Total Votes</p>
                    <p className="text-lg font-semibold text-blue-600">{totalPos}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {list.map((c, idx) => {
                    const pct = percent(c.vote_count ?? 0, pos);
                    return (
                      <div
                        key={c.id}
                        className={`p-5 rounded-xl border transition-all hover:shadow-md ${
                          idx === 0
                            ? "border-yellow-300 bg-yellow-50"
                            : "border-gray-200 bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          {rankIcon(idx)}
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-800">
                                  {c.full_name}
                                  {c.party && (
                                    <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                      {c.party}
                                    </span>
                                  )}
                                </h3>
                                <p className="text-sm text-gray-500">
                                  {c.student_id} {c.department && `| ${c.department}`}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-gray-900">
                                  {c.vote_count ?? 0}
                                </p>
                                <p className="text-sm text-gray-500">votes</p>
                              </div>
                            </div>

                            <div className="mt-3">
                              <div className="flex justify-between items-center mb-1 text-sm">
                                <span className="flex items-center gap-1 text-gray-700">
                                  <TrendingUp className="w-4 h-4" />
                                  {pct}%
                                </span>
                              </div>
                              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  style={{ width: `${pct}%` }}
                                  className={`h-full ${
                                    idx === 0
                                      ? "bg-yellow-500"
                                      : "bg-blue-500"
                                  } transition-all`}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}

          <p className="text-center text-gray-500 text-sm mt-10">
            🗳️ Official results published by the Election Committee
          </p>
        </div>
      </div>
    </div>
  );
}
