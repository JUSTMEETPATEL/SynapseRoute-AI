"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Activity, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login, signup, error, clearError, isLoading } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    let success: boolean;
    if (mode === "signup") {
      success = await signup(name, email, password);
    } else {
      success = await login(email, password);
    }

    if (success) {
      router.push("/");
    }
  };

  return (
    <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
      {/* Ambient background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-cyber-green/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-pulse-red/5 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800">
            <Activity className="w-6 h-6 text-cyber-green" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-zinc-100 tracking-wide">SynapseRoute</h1>
            <p className="text-xs font-mono text-zinc-500">DELIVERY INTELLIGENCE</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-8 shadow-2xl shadow-black/50">
          {/* Mode toggle */}
          <div className="flex bg-zinc-900 rounded-xl p-1 mb-8">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); clearError(); }}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  mode === m
                    ? "bg-zinc-800 text-zinc-100 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {m === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name field (signup only) */}
            {mode === "signup" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="block text-xs uppercase tracking-wider font-semibold text-zinc-500 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required={mode === "signup"}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-cyber-green/50 focus:ring-1 focus:ring-cyber-green/20 transition-all text-sm"
                />
              </motion.div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-zinc-500 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-cyber-green/50 focus:ring-1 focus:ring-cyber-green/20 transition-all text-sm"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-zinc-500 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 pr-12 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-cyber-green/50 focus:ring-1 focus:ring-cyber-green/20 transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-pulse-red/10 border border-pulse-red/20 rounded-lg p-3 text-xs text-pulse-red"
              >
                {error}
              </motion.div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-zinc-100 hover:bg-white text-zinc-900 font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-zinc-400 border-t-zinc-900 rounded-full animate-spin" />
              ) : (
                <>
                  {mode === "login" ? "Sign In" : "Create Account"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-zinc-600 mt-6 font-mono">
          SYNAPSEROUTE AI • PREDICTIVE DELIVERY INTELLIGENCE
        </p>
      </motion.div>
    </main>
  );
}
