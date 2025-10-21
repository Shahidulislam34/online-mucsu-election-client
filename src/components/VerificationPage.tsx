/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useAuth } from '../provider/AuthProvider';
import { CheckCircle, AlertCircle, Shield } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000').replace(/\/+$/, '');

async function fetchJson(path: string, options: RequestInit = {}) {
  const url = path.startsWith('/') ? `${API_BASE}${path}` : `${API_BASE}/${path}`;
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw data || { status: res.status, message: res.statusText };
  return data;
}

export default function VerificationPage() {
  const { voter } = useAuth();
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!voter) throw new Error('User not found');

      // Prefer verifying by voter id if available, fallback to email
      if (!voter.id) {
        // server endpoint: POST /api/voters/verify (body: { email, student_id })
        const res = await fetchJson('/api/voters/verify', {
          method: 'POST',
          body: JSON.stringify({ email: voter.email, student_id: studentId }),
        });
        if (res?.ok) setSuccess(true);
        else throw new Error(res?.error || 'Verification failed');
      } else {
        // server endpoint: POST /api/voters/:id/verify (body: { student_id })
        const res = await fetchJson(`/api/voters/${voter.id}/verify`, {
          method: 'POST',
          body: JSON.stringify({ student_id: studentId }),
        });
        if (res?.ok) setSuccess(true);
        else throw new Error(res?.error || 'Verification failed');
      }
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Successful!</h2>
            <p className="text-gray-600 mb-6">Your identity has been verified. Redirecting to voting page...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Verify Your Identity</h1>
            <p className="text-gray-600">Please confirm your student ID to proceed</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Welcome, {voter?.fullName ?? voter?.full_name ?? voter?.email}</strong>
              <br />
              Department: {voter?.department ?? '-'}
              <br />
              Email: {voter?.email}
            </p>
          </div>

          <form onSubmit={handleVerification} className="space-y-6">
            <div>
              <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-2">
                Student ID
              </label>
              <input
                id="studentId"
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
                className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Enter your student ID"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify Identity'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Your information is kept strictly confidential</p>
          </div>
        </div>
      </div>
    </div>
  );
}
