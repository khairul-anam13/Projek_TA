"use client";

import React, { useState } from "react";
import { motion, MotionConfig } from "motion/react";
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
    <MotionConfig reducedMotion="user">
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
            <span className="block text-[11px] text-stone-500 font-medium">
              Studio Desain Cetak
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
              <h1 className="text-3xl font-bold tracking-tight text-stone-950">
                Selamat datang
              </h1>
              <p className="text-stone-500 mt-2 text-sm">
                Masuk dengan akun Google untuk membuat sampul rapor siap cetak: pilih template, isi data sekolah, lalu ekspor file vektor untuk klise.
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
              <p className="text-xs text-stone-500 leading-relaxed">
                Dengan masuk, Anda menyetujui syarat penggunaan dan kebijakan privasi Page Free.
              </p>
            </div>
          </motion.div>

          {/* Quick Info */}
          <div className="mt-10 pt-6 border-t border-stone-100" id="feature-highlights">
            <p className="text-xs font-semibold text-stone-600 mb-3">Untuk operator percetakan</p>
            <div className="space-y-2.5">
              {[
                "Template sampul rapor ukuran A (23×34 cm) dan B (17×23 cm)",
                "Cek siap cetak: jendela mika, margin aman, warna tinta",
                "Ekspor PDF/SVG vektor ukuran asli, atau banyak sekolah sekaligus dari CSV",
              ].map((feat) => (
                <div key={feat} className="flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                  <span className="text-xs text-stone-600 leading-relaxed">{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center lg:text-left" id="login-footer">
          <p className="text-xs text-stone-500">
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
              {/* Sampul rapor: kartu gelap, teks emas foil, jendela mika nama */}
              <motion.div
                aria-hidden="true"
                className="relative mx-auto flex h-72 w-48 flex-col items-center rounded-xl border border-white/10 bg-stone-950 px-5 pt-8 shadow-2xl"
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
              >
                <span className="text-[11px] font-bold tracking-wide text-amber-300">RAPOR PESERTA DIDIK</span>
                <span className="mt-4 h-9 w-9 rounded-full border-2 border-amber-300/80" />
                <span className="mt-4 text-sm font-bold text-amber-300">NAMA SEKOLAH</span>
                <span className="mt-2 h-1 w-24 rounded-full bg-amber-300/40" />
                <span className="mt-1.5 h-1 w-20 rounded-full bg-amber-300/30" />
                <span className="absolute bottom-10 left-5 right-5 h-12 rounded-md border border-white/25 bg-white/15" />
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="mt-6"
            >
              <h2 className="text-2xl font-bold tracking-tight text-balance">
                Sampul rapor siap cetak, tanpa tebak-tebakan.
              </h2>
              <p className="text-stone-300 mt-3 text-sm leading-relaxed max-w-sm mx-auto text-balance">
                Data sekolah terisi dari sumber resmi, tata letak mengikuti ukuran mika, dan hasilnya berupa file vektor yang siap dibuat klise foil atau sablon.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
    </MotionConfig>
  );
}
