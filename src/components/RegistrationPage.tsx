/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { useAuth } from "../provider/AuthProvider";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, User, Mail, Lock } from "lucide-react";

interface RegistrationResponse {
  refreshToken?: string;
  accessToken?: string;
  ok?: boolean;
  token?: string;
  success?: boolean;
  message?: string;
  error?: string;
  data?: {
    accessToken?: string;
    refreshToken?: string;
  };
}

export default function RegistrationPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"voter" | "candidate">("voter");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  // Basic email format check (prevents things like double @@)
  const BASIC_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Allowed MBSTU IT student emails:
  // it21|22|23|24|25 + 001..060  => it21001@mbstu.ac.bd ... it25060@mbstu.ac.bd
  const IT_EMAIL_REGEX = /^it(21|22|23|24|25)(00[1-9]|0[1-5][0-9]|060)@mbstu\.ac\.bd$/i;

  const validateEmail = (raw: string) => {
    const e = String(raw || "").trim().toLowerCase();
    if (!BASIC_EMAIL_REGEX.test(e)) return { ok: false, err: "Invalid email format." };
    if (!IT_EMAIL_REGEX.test(e))
      return {
        ok: false,
        err:
          "Invalid Institutional Email.",
      };
    return { ok: true, email: e };
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setMessage(null);
    setEmailError(null);

    const check = validateEmail(email);
    if (!check.ok) {
      setEmailError(check.err ?? null);
      return;
    }

    const normalizedEmail = (check as any).email as string;

    if (!password || password.length < 6) {
      setMessage({ type: "error", text: "Password required (minimum 6 characters)." });
      return;
    }

    setLoading(true);
    try {
      const res: RegistrationResponse = await register({
        email: normalizedEmail,
        password,
        fullName,
        role,
      });

      const success =
        Boolean(res?.ok) ||
        res?.success === true ||
        Boolean(res?.token) ||
        Boolean(res?.accessToken) ||
        Boolean(res?.data?.accessToken);

      if (success) {
        setMessage({ type: "success", text: res?.message || "Registration successful. Redirecting..." });
        setEmail("");
        setPassword("");
        setFullName("");
        setRole("voter");
        setTimeout(() => navigate("/", { replace: true }), 1200);
      } else {
        setMessage({ type: "error", text: res?.message || res?.error || "Registration failed" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "Registration failed" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100 p-4">
      <div className="w-full max-w-md bg-white shadow-xl rounded-2xl p-8 border border-gray-100">
        <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">🗳 Create an Account</h2>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-3.5 text-gray-400 h-5 w-5" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-medium mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 text-gray-400 h-5 w-5" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError(null);
                }}
                required
                placeholder="cs21001@mbstu.ac.bd"
                className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 outline-none transition ${
                  emailError ? "border-red-400 focus:ring-red-200" : "border-gray-300 focus:ring-indigo-400"
                }`}
              />
            </div>
            {emailError ? (
              <div className="mt-2 text-sm text-red-600">{emailError}</div>
            ) : (
              <div className="mt-2 text-xs text-slate-500">
                Please Use Institutional Email.
              </div>
            )}
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-medium mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 text-gray-400 h-5 w-5" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••"
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition shadow-md"
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        <div className="mt-5 text-center">
          <p className="text-gray-600 text-sm">Already have an account?</p>
          <button
            onClick={() => navigate("/login")}
            className="mt-2 inline-block px-5 py-2 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition font-medium"
          >
            Go to Login
          </button>
        </div>

        {message && (
          <div className={`mt-6 text-center text-sm font-medium ${message.type === "error" ? "text-red-600" : "text-green-600"}`}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}