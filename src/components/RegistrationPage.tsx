/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { useAuth } from "../provider/AuthProvider";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, User, Mail, Lock } from "lucide-react";

interface RegistrationResponse {
  refreshToken: string | undefined;
  res: string | undefined;
  accessToken: string | undefined;
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
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"voter" | "candidate">("voter"); // Default role is voter
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res: RegistrationResponse = await register({ email, password, fullName, role });
      const success = Boolean(res?.ok) || Boolean(res?.token) || res?.success === true;

      // Normalize tokens from different backend shapes
      const access =
        res?.data?.accessToken ?? res?.accessToken ?? res?.token ?? null;
      const refresh = res?.data?.refreshToken ?? res?.refreshToken ?? null;

      if (success) {
        // Log tokens for debugging
        if (access) console.log("Registration accessToken:", access);
        if (refresh) console.log("Registration refreshToken:", refresh);
        console.log("Registered user (response):", res);

        setMessage({
          type: "success",
          text: res?.message || `Registration successful as ${role}! Redirecting to voting page...`,
        });
        // Clear form
        setEmail("");
        setPassword("");
        setFullName("");
        setRole("voter"); // Reset role to default
        // Redirect to voting page after a short delay
        setTimeout(() => {
          navigate("/", { replace: true });
        }, 1500); // 1.5 second delay for user to see success message
      } else {
        setMessage({
          type: "error",
          text: res?.message || res?.error || "Registration failed",
        });
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
        <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">
          🗳 Create an Account
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-3.5 text-gray-400 h-5 w-5" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none transition"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 text-gray-400 h-5 w-5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none transition"
              />
            </div>
          </div>

          {/* Password */}
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
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

       
          {/* Register Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition shadow-md"
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        {/* Login Button */}
        <div className="mt-5 text-center">
          <p className="text-gray-600 text-sm">Already have an account?</p>
          <button
            onClick={() => navigate("/login")}
            className="mt-2 inline-block px-5 py-2 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition font-medium"
          >
            Go to Login
          </button>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mt-6 text-center text-sm font-medium ${
              message.type === "error" ? "text-red-600" : "text-green-600"
            }`}
          >
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}