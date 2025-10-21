
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import { useAuth } from "../provider/AuthProvider";
import { Trash2, Edit, PlusCircle, LogOut, RefreshCcw } from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");

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

async function fetchJson(path: string, options: RequestInit = {}) {
  const url = path.startsWith("/") ? `${API_BASE}${path}` : `${API_BASE}/${path}`;
  const token = getStoredToken();
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(options.headers as any) };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, { mode: "cors", ...options, headers });
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

interface CandidateForm {
  id?: string;
  name: string;
  position: string;
  studentId?: string;
  department?: string;
  photoUrl?: string;
  manifesto?: string;
  displayOrder?: number;
}

export default function AdminDashboard() {
  const { signOut, user } = useAuth();
  const [candidates, setCandidates] = useState<CandidateForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // success modal state
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>("");

  const [form, setForm] = useState<CandidateForm>({
    name: "",
    position: "",
    studentId: "",
    department: "",
    photoUrl: "",
    manifesto: "",
    displayOrder: 0,
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // auto-dismiss non-confirmation toasts
  useEffect(() => {
    if (!toast) return;
    if (pendingDeleteId) return; // keep modal-related messages until action
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast, pendingDeleteId]);

  const loadCandidates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchJson("/api/candidates");
      const arr = Array.isArray(res) ? res : res?.data ?? res?.candidates ?? res?.items ?? [];
      const normalized = (arr || []).map((c: any) => ({
        id: String(c._id ?? c.id ?? ""),
        name: c.name ?? c.full_name ?? c.fullName ?? "",
        position: c.position ?? "",
        studentId: c.studentId ?? c.student_id ?? "",
        department: c.department ?? "",
        photoUrl: c.photoUrl ?? c.photo_url ?? c.photo_url ?? "",
        manifesto: c.manifesto ?? "",
        displayOrder: Number(c.displayOrder ?? c.display_order ?? 0),
      }));
      setCandidates(normalized);
    } catch (err: any) {
      setError(err?.message || err?.error || "Failed to load candidates");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () =>
    setForm({
      name: "",
      position: "",
      studentId: "",
      department: "",
      photoUrl: "",
      manifesto: "",
      displayOrder: 0,
    });

  const handleChange = (k: keyof CandidateForm, v: any) => setForm((s) => ({ ...s, [k]: v }));

  const startEdit = (c: CandidateForm) => {
    setEditingId(c.id ?? null);
    setForm({ ...c });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    resetForm();
  };

  const saveCandidate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload: any = {
        name: form.name,
        position: form.position,
        studentId: form.studentId,
        department: form.department,
        photoUrl: form.photoUrl,
        manifesto: form.manifesto,
        displayOrder: Number(form.displayOrder ?? 0),
      };

      if (editingId) {
        // use PATCH for partial updates
        await fetchJson(`/api/candidates/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        // show success modal for update
        setSuccessMessage("Candidate updated successfully");
        setSuccessModalOpen(true);
      } else {
        await fetchJson("/api/candidates", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        // show success modal for add
        setSuccessMessage("Successfully added candidate");
        setSuccessModalOpen(true);
      }

      setEditingId(null);
      resetForm();
      await loadCandidates();
    } catch (err: any) {
      setError(err?.message || err?.error || "Failed to save candidate");
    } finally {
      setSaving(false);
      // auto-close success modal after 2.5s
      setTimeout(() => {
        setSuccessModalOpen(false);
      }, 2500);
    }
  };

  // open modal: set pending delete id
  const removeCandidate = (id?: string) => {
    if (!id) return;
    setPendingDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    setDeleting(true);
    setError(null);
    try {
      await fetchJson(`/api/candidates/${pendingDeleteId}`, { method: "DELETE" });
      setToast("🗑️ Deleted successfully!");
      await loadCandidates();
    } catch (err: any) {
      setError(err?.message || err?.error || "Failed to delete candidate");
    } finally {
      setDeleting(false);
      setPendingDeleteId(null);
      setTimeout(() => setToast(null), 2500);
    }
  };

  const cancelDelete = () => {
    setPendingDeleteId(null);
    setToast("Deletion cancelled");
    setTimeout(() => setToast(null), 1500);
  };

  return (
    <>
      {/* centered modal for delete confirmation */}
      {pendingDeleteId && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={cancelDelete} />
          <div className="relative bg-white rounded-lg shadow-lg w-full max-w-md mx-4 p-6 z-10">
            <h3 className="text-lg font-semibold mb-2">Confirm deletion</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete this candidate? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* centered success modal (shows on add/update) */}
      {successModalOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSuccessModalOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-lg w-full max-w-sm mx-4 p-6 z-10 text-center">
            <h3 className="text-lg font-semibold mb-2">Success</h3>
            <p className="text-sm text-gray-700 mb-4">{successMessage}</p>
            <div className="flex justify-center">
              <button
                onClick={() => setSuccessModalOpen(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* top-center toast */}
      <div className="fixed inset-x-0 top-4 z-40 flex justify-center pointer-events-none">
        {toast && (
          <div className="pointer-events-auto bg-white border border-gray-200 text-gray-800 px-4 py-2 rounded-md shadow-md">
            <div className="text-sm">{toast}</div>
          </div>
        )}
      </div>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 p-8">
        <div className="max-w-6xl mx-auto bg-white shadow-xl rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-gray-800">Admin Dashboard</h2>
            <div className="flex items-center gap-3">
              <span className="text-gray-600">{user?.email}</span>
              <button
                onClick={signOut}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Section */}
            <form onSubmit={saveCandidate} className="bg-gray-50 p-5 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">
                {editingId ? "✏️ Edit Candidate" : "➕ Add Candidate"}
              </h3>

              {[
                ["Name", "name"],
                ["Position", "position"],
                ["Student ID", "studentId"],
                ["Department", "department"],
                ["Photo URL", "photoUrl"],
              ].map(([label, key]) => (
                <div key={key} className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    required={!editingId}
                    value={(form as any)[key]}
                    onChange={(e) => handleChange(key as keyof CandidateForm, e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none"
                  />
                </div>
              ))}

              <label className="block text-sm font-medium text-gray-700 mb-1">Manifesto</label>
              <textarea
                required={!editingId}
                value={form.manifesto}
                onChange={(e) => handleChange("manifesto", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none mb-3"
                rows={3}
              />

              <label className="block text-sm font-medium text-gray-700 mb-1">Display order</label>
              <input
                required={!editingId}
                type="number"
                value={form.displayOrder ?? 0}
                onChange={(e) => handleChange("displayOrder", Number(e.target.value))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none mb-4"
              />

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
                >
                  <PlusCircle className="w-4 h-4" />
                  {saving ? "Saving..." : editingId ? "Update" : "Add"}
                </button>
                {editingId && (
                  <button type="button" onClick={cancelEdit} className="px-4 py-2 bg-gray-200 rounded-md">
                    Cancel
                  </button>
                )}
              </div>

              {error && <div className="mt-3 text-red-600 text-sm">{error}</div>}
            </form>

            {/* Candidate List */}
            <div className="col-span-2 bg-gray-50 p-5 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg text-gray-800">Candidates ({candidates.length})</h3>
                <button onClick={loadCandidates} className="flex items-center gap-2 text-blue-600 hover:underline">
                  <RefreshCcw className="w-4 h-4" /> Refresh
                </button>
              </div>

              {loading ? (
                <div className="text-center py-6 text-gray-600">Loading...</div>
              ) : candidates.length === 0 ? (
                <div className="text-gray-500">No candidates available.</div>
              ) : (
                <ul className="space-y-3">
                  {candidates.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm hover:shadow-md transition"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-full overflow-hidden flex items-center justify-center">
                          {c.photoUrl ? (
                            <img src={c.photoUrl} alt={c.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-gray-400 text-xs">No Photo</div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">{c.name}</div>
                          <div className="text-sm text-gray-500">
                            {c.position} {c.studentId ? `• ${c.studentId}` : ""}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(c)}
                          className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 transition text-sm"
                        >
                          <Edit className="w-4 h-4" /> Edit
                        </button>
                        <button
                          onClick={() => removeCandidate(c.id)}
                          className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition text-sm"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}