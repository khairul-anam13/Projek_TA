"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    setError("");
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Setelah Google selesai, redirect ke callback handler kita
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError("Gagal memulai login Google. Silakan coba lagi.");
      setIsLoading(false);
    }
    // Jika berhasil, browser akan redirect ke Google — tidak perlu setIsLoading(false)
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-canvas text-stone-900" id="login-layout">
      {/* Left Column: Form Panel */}
      <div className="lg:col-span-5 flex flex-col justify-between p-8 sm:p-12 lg:p-16 bg-surface shadow-xl z-10" id="login-sidebar">
        {/* Brand Header */}
        <div className="flex items-center gap-3" id="brand-header">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md" id="logo-icon-container">
            <img src="/pagefree.png" alt="Page Free Logo" className="w-full h-full object-cover bg-white" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight text-stone-900">
              Page <span className="text-brand-600">Free</span>
            </span>
            <span className="block text-[10px] text-stone-400 font-mono tracking-wider uppercase font-bold">
              AI-Powered Print Station
            </span>
          </div>
        </div>

        {/* Content Box */}
        <div className="my-auto py-12 max-w-sm w-full mx-auto" id="login-main-form-box">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-8" id="login-welcome-text">
              <h1 className="text-3xl font-bold tracking-tight text-stone-950 font-display-space">
                Selamat datang
              </h1>
              <p className="text-stone-500 mt-2 text-sm">
                Masuk dengan akun Google Anda untuk mulai mengonsep, menyusun, dan mencetak desain profesional dengan panduan AI.
              </p>
            </div>

            {error && (
              <div
                className="mb-5 p-3.5 bg-rose-50 text-rose-600 text-xs rounded-lg border border-rose-100 font-medium"
                id="login-error-alert"
              >
                {error}
              </div>
            )}

            <Button
              id="google-login-button"
              variant="secondary"
              size="lg"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-stone-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Menghubungkan ke Google...</span>
                </>
              ) : (
                <>
                  {/* Google "G" SVG Logo — brand mark colors kept as-is (Google's, not ours) */}
                  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  <span>Lanjutkan dengan Google</span>
                </>
              )}
            </Button>

            <div className="mt-6 text-center">
              <p className="text-xs text-stone-400 leading-relaxed">
                Dengan masuk, Anda menyetujui{" "}
                <span className="text-brand-600 font-medium">Syarat & Ketentuan</span>{" "}
                dan{" "}
                <span className="text-brand-600 font-medium">Kebijakan Privasi</span>{" "}
                Page Free.
              </p>
            </div>
          </motion.div>

          {/* Quick Info */}
          <div className="mt-10 pt-6 border-t border-stone-100" id="feature-highlights">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3 text-center">Mengapa Page Free?</p>
            <div className="space-y-2.5">
              {[
                "Rekomendasi warna & tipografi otomatis dari Gemini AI",
                "Proyek tersimpan aman di cloud — akses dari mana saja",
                "Editor kanvas interaktif siap pakai tanpa coding",
              ].map((feat) => (
                <div key={feat} className="flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                  <span className="text-xs text-stone-500">{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center lg:text-left" id="login-footer">
          <p className="text-xs text-stone-400 font-mono">
            Page Free v2.0.0 — © 2026 PT Kreatif Percetakan Indonesia
          </p>
        </div>
      </div>

      {/* Right Column: Dynamic Printing Illustration Side panel */}
      <div className="lg:col-span-7 hidden lg:block relative overflow-hidden bg-gradient-to-tr from-stone-900 via-teal-950 to-brand-900" id="login-hero-illustration">
        {/* Abstract Background Accents */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(45,212,191,0.25),transparent_45%)]" />
        <div className="absolute inset-0 opacity-15 bg-[linear-gradient(to_right,#292524_1px,transparent_1px),linear-gradient(to_bottom,#292524_1px,transparent_1px)] bg-[size:32px_32px]" />

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
              <div className="w-64 h-40 bg-gradient-to-tr from-brand-600 to-teal-500 rounded-2xl shadow-2xl relative border border-brand-400/30 flex items-center justify-center overflow-hidden mx-auto">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.1),transparent)]" />

                {/* Paper feeds in */}
                <motion.div
                  className="absolute bottom-4 left-6 right-6 h-28 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 p-3 overflow-hidden flex flex-col justify-between"
                  animate={{ y: [15, -5, 15] }}
                  transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                >
                  <div className="flex justify-between items-center">
                    <span className="w-12 h-2.5 bg-brand-400/50 rounded-full" />
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
                  className="absolute left-0 right-0 h-[3px] bg-cyan-300 shadow-lg shadow-cyan-200"
                  animate={{ top: ["10%", "90%", "10%"] }}
                  transition={{ repeat: Infinity, duration: 3.5, ease: "linear" }}
                />
              </div>

              {/* Smaller business card floating on top */}
              <motion.div
                className="absolute -bottom-6 -right-8 w-44 h-24 bg-white text-stone-900 rounded-xl shadow-2xl p-3 flex flex-col justify-between border border-stone-100"
                initial={{ rotate: 10, scale: 0.9 }}
                animate={{ y: [0, -10, 0], rotate: [10, 8, 10] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
              >
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-extrabold tracking-wider text-brand-600">CREATIVE CARD</span>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                </div>
                <div>
                  <span className="block text-[11px] font-bold text-stone-800">Dian Sastrowardoyo</span>
                  <span className="block text-[7px] text-stone-400">Head of Fashion Curation</span>
                </div>
                <div className="flex justify-between items-center text-[6px] text-stone-400 font-mono">
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
              <p className="text-stone-300 mt-3 text-sm leading-relaxed max-w-sm mx-auto">
                Rancang kebutuhan percetakan dalam sekejap. Rekomendasi palet warna, tipografi, dan slogan otomatis terintegrasi dari Gemini AI.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Small badge */}
        <div className="absolute bottom-8 right-8 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 text-[10px] font-mono tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>SUPABASE AUTH ACTIVE</span>
        </div>
      </div>
    </div>
  );
}
