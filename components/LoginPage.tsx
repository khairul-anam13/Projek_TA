"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import { Sparkles, Printer, Lock, Mail, ArrowRight } from "lucide-react";

interface LoginPageProps {
  onLogin: (email: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState("anamjumantono4@gmail.com");
  const [password, setPassword] = useState("password123");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Email wajib diisi.");
      return;
    }
    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }
    setError("");
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      onLogin(email);
    }, 1200);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-slate-50 text-slate-900" id="login-layout">
      {/* Left Column: Form Panel */}
      <div className="lg:col-span-5 flex flex-col justify-between p-8 sm:p-12 lg:p-16 bg-white shadow-xl z-10" id="login-sidebar">
        {/* Brand Header */}
        <div className="flex items-center gap-3" id="brand-header">
          <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-md shadow-blue-200" id="logo-icon-container">
            <Printer className="w-6 h-6" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900">
              Page <span className="text-blue-600">Free</span>
            </span>
            <span className="block text-[10px] text-slate-400 font-mono tracking-wider uppercase font-bold">
              AI-Powered Print Station
            </span>
          </div>
        </div>

        {/* Content Box */}
        <div className="my-auto py-12 max-w-sm w-full mx-auto" id="login-main-form-box">
          <div className="mb-8" id="login-welcome-text">
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 font-display-space">
              Selamat datang kembali
            </h1>
            <p className="text-slate-500 mt-2 text-sm">
              Masuk untuk mulai mengonsep, menyusun, dan mencetak desain profesional Anda dengan panduan AI.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" id="login-form">
            {error && (
              <div className="p-3.5 bg-rose-50 text-rose-600 text-xs rounded-lg border border-rose-100 font-medium animate-shake" id="login-error-alert">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5" htmlFor="email-input">
                Alamat Email
              </label>
              <div className="relative" id="email-field-container">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  id="email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all text-slate-900 font-medium"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500" htmlFor="password-input">
                  Kata Sandi
                </label>
                <a href="#forgot" className="text-xs text-blue-600 hover:underline font-medium" id="forgot-password-link">
                  Lupa Sandi?
                </a>
              </div>
              <div className="relative" id="password-field-container">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all text-slate-900 font-medium"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="flex items-center" id="remember-me-container">
              <input
                id="remember"
                type="checkbox"
                defaultChecked
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="remember" className="ml-2 text-xs text-slate-500 cursor-pointer font-medium select-none">
                Ingatkan saya di browser ini
              </label>
            </div>

            <button
              id="login-submit-button"
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 text-white font-semibold rounded-xl shadow-lg shadow-blue-100 hover:shadow-blue-200 flex items-center justify-center gap-2 transform transition-all active:scale-[0.98] cursor-pointer"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Membuka Akses Premium...</span>
                </>
              ) : (
                <>
                  <span>Masuk Ruang Desain</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Assist */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center" id="demo-info-panel">
            <p className="text-xs text-slate-400 font-medium">Bekerja dalam Mode Demo Instan</p>
            <button
              onClick={() => onLogin("anamjumantono4@gmail.com")}
              className="mt-2.5 text-xs text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
              <span>Gunakan Akun Default (Anam Jumantono)</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center lg:text-left" id="login-footer">
          <p className="text-xs text-slate-400 font-mono">
            Page Free v1.4.0 — © 2026 PT Kreatif Percetakan Indonesia
          </p>
        </div>
      </div>

      {/* Right Column: Dynamic Printing Illustration Side panel */}
      <div className="lg:col-span-7 hidden lg:block relative overflow-hidden bg-gradient-to-tr from-slate-900 via-blue-950 to-blue-900" id="login-hero-illustration">
        {/* Abstract Background Accents */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(59,130,246,0.3),transparent_45%)]" />
        <div className="absolute inset-0 opacity-15 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:32px_32px]" />

        {/* Animated Printing Core Elements */}
        <div className="absolute inset-0 flex flex-col justify-center items-center p-12 text-white" id="illustration-stage">
          <div className="relative max-w-lg text-center" id="quote-and-animation">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-8 relative inline-block"
            >
              {/* Symbolic Printer Plate Floating item */}
              <div className="w-64 h-40 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl shadow-2xl relative border border-blue-400/30 flex items-center justify-center overflow-hidden mx-auto">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.1),transparent)]" />
                
                {/* Paper feeds in */}
                <motion.div
                  className="absolute bottom-4 left-6 right-6 h-28 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 p-3 overflow-hidden flex flex-col justify-between"
                  animate={{ y: [15, -5, 15] }}
                  transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                >
                  <div className="flex justify-between items-center">
                    <span className="w-12 h-2.5 bg-blue-400/50 rounded-full" />
                    <Sparkles className="w-4 h-4 text-amber-300" />
                  </div>
                  <div className="space-y-1.5 py-2">
                    <span className="block w-full h-1.5 bg-white/40 rounded-full" />
                    <span className="block w-4/5 h-1.5 bg-white/30 rounded-full" />
                    <span className="block w-2/3 h-1.5 bg-white/20 rounded-full" />
                  </div>
                </motion.div>

                {/* Laser scan line */}
                <motion.div
                  className="absolute left-0 right-0 h-[3px] bg-cyan-400 shadow-lg shadow-cyan-300"
                  animate={{ top: ["10%", "90%", "10%"] }}
                  transition={{ repeat: Infinity, duration: 3.5, ease: "linear" }}
                />
              </div>

              {/* Smaller business card floating on top */}
              <motion.div
                className="absolute -bottom-6 -right-8 w-44 h-24 bg-white text-slate-900 rounded-xl shadow-2xl p-3 flex flex-col justify-between border border-slate-100"
                initial={{ rotate: 10, scale: 0.9 }}
                animate={{ y: [0, -10, 0], rotate: [10, 8, 10] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
              >
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-extrabold tracking-wider text-blue-600">CREATIVE CARD</span>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                </div>
                <div>
                  <span className="block text-[11px] font-bold text-slate-800">Dian Sastrowardoyo</span>
                  <span className="block text-[7px] text-slate-400">Head of Fashion Curation</span>
                </div>
                <div className="flex justify-between items-center text-[6px] text-slate-400 font-mono">
                  <span>☏ +62 811-9233</span>
                  <span>🌐 fashion.studio</span>
                </div>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="mt-6"
            >
              <h2 className="text-2xl font-bold tracking-tight font-display-space">
                Kreativitas Canva. Kepresisian Figma.
              </h2>
              <p className="text-slate-300 mt-3 text-sm leading-relaxed max-w-sm mx-auto">
                Rancang kebutuhan percetakan dalam sekejap. Rekomendasi palet warna, tipografi, dan slogan otomatis terintegrasi dari Gemini AI.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Small badge */}
        <div className="absolute bottom-8 right-8 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 text-[10px] font-mono tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>PREVIEW iFRAME MODE ACTIVE</span>
        </div>
      </div>
    </div>
  );
}
