import React, { useState } from "react";
import { Mail, Lock, Eye, EyeOff, LogIn } from "lucide-react";
import { motion } from "motion/react";
import { authClient } from "../../lib/auth-client";

interface LoginFormProps {
  onLoginSuccess: (profile: any) => void;
  onSwitchToRegister: () => void;
}

function loginErrorMessage(message?: string) {
  const normalized = (message || "").toLowerCase();
  if (normalized.includes("invalid") || normalized.includes("password") || normalized.includes("credential")) {
    return "Sign in failed. Check the email and password, then try again. If this is a new account, use Create one below.";
  }
  if (normalized.includes("profile")) {
    return "Signed in, but your contributor profile could not load. Refresh once, then contact support if it keeps happening.";
  }
  return "Sign in failed. Check your email and password, or create an account if you have not registered yet.";
}

export default function LoginForm({ onLoginSuccess, onSwitchToRegister }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    try {
      const { data, error: authError } = await authClient.signIn.email({
        email,
        password,
      });

      if (authError) throw new Error(loginErrorMessage(authError.message));

      // Fetch profile after successful sign in
      const profileRes = await fetch("/api/me", { credentials: "include" });
      const profileData = await profileRes.json();
      if (!profileRes.ok) {
        throw new Error(loginErrorMessage(profileData.error || "profile"));
      }

      onLoginSuccess(profileData.user);
    } catch (err: any) {
      setError(loginErrorMessage(err?.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="max-w-xl mx-auto bg-[#0a1020] rounded-3xl border border-slate-800 shadow-2xl overflow-hidden p-8 sm:p-10 space-y-8 relative glow-auth"
    >
      <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

      <div className="space-y-2 text-center sm:text-left">
        <span className="text-[10px] uppercase font-bold text-emerald-400 font-mono tracking-widest block">SECURE ACCESS</span>
        <h2 className="text-2xl font-bold font-display text-white tracking-tight">Sign In to Your Account</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Access your contributor dashboard, submit chat files, and track your earnings.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-900/50 text-red-300 text-xs font-semibold">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email */}
        <div className="space-y-2">
          <label htmlFor="login-email" className="text-xs font-bold text-slate-300 font-mono tracking-wide block">EMAIL ADDRESS</label>
          <div className="relative">
            <Mail className="absolute left-3 top-3.5 w-4 h-4 text-emerald-500/60" />
            <input
              id="login-email"
              type="email"
              placeholder="e.g. john@yourdomain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#070b16] border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-slate-100 placeholder-slate-600 font-medium"
              required
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-2">
          <label htmlFor="login-password" className="text-xs font-bold text-slate-300 font-mono tracking-wide block">PASSWORD</label>
          <div className="relative">
            <Lock className="absolute left-3 top-3.5 w-4 h-4 text-emerald-500/60" />
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-[#070b16] border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-slate-100 placeholder-slate-600 font-medium"
              required
            />
            <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              Sign In
            </>
          )}
        </button>

        {/* Switch to register */}
        <p className="text-center text-xs text-slate-400">
          Don't have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-emerald-400 font-bold hover:text-emerald-300 transition-colors"
          >
            Create one →
          </button>
        </p>
      </form>
    </motion.div>
  );
}
