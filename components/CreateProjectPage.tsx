"use client";

import React, { useState } from "react";
import { Sparkles, ArrowLeft, BookOpen, ChevronRight, PenTool } from "lucide-react";
import { MockupType, ProductType } from "../lib/types";

interface CreateProjectPageProps {
  initialProductType: ProductType;
  onBack: () => void;
  onSkipAi: (formData: any) => void;
  onGenerateAi: (formData: any) => void;
}

const MOCKUPS: MockupType[] = ["Rapor SD", "Rapor SMP", "Rapor SMA/SMK", "Rapor MAN"];

export default function CreateProjectPage({
  initialProductType,
  onBack,
  onSkipAi,
  onGenerateAi,
}: CreateProjectPageProps) {
  const [mockupType, setMockupType] = useState<MockupType>("Rapor SD");
  
  // Dynamic fields
  const [judulRapor, setJudulRapor] = useState("RAPOR PESERTA DIDIK");
  const [namaSekolah, setNamaSekolah] = useState("");
  const [alamatSekolah, setAlamatSekolah] = useState("");
  const [subInformasi, setSubInformasi] = useState("");

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [isUsingAi, setIsUsingAi] = useState(true);

  // Rotating tips shown during the AI generation process
  const loadingTips = [
    "Menyesuaikan grid dan layout dengan format cetak standar...",
    "Merelasikan font Display & Body agar pas dengan margin mockup...",
    "Gemini AI sedang menyusun komposisi teks terbaik...",
    "Memformulasikan tata letak agar presisi dengan ukuran A4/F4...",
    "Menyelesaikan paket rekomendasi desain high-fidelity Anda..."
  ];

  const handleValidation = () => {
    if (!namaSekolah.trim()) {
      setError("Nama Sekolah wajib diisi.");
      return false;
    }
    setError("");
    return true;
  };

  const formData = {
    mockupType,
    dynamicData: {
      judulRapor,
      namaSekolah,
      alamatSekolah,
      subInformasi
    }
  };

  const handleSkipAi = () => {
    if (isSubmitting) return;
    if (!handleValidation()) return;
    setIsSubmitting(true);
    setIsUsingAi(false);
    onSkipAi(formData);
  };

  const handleSubmitAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!handleValidation()) return;

    setIsSubmitting(true);
    setIsUsingAi(true);

    // Tip rotation timer
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev < loadingTips.length - 1 ? prev + 1 : prev));
    }, 2500);

    // Force React to render the full-screen loading state before we do anything else
    await new Promise((resolve) => setTimeout(resolve, 100));

    try {
      await onGenerateAi(formData);
    } catch (err) {
      console.error(err);
      setError("Gagal menghasilkan tata letak AI.");
    } finally {
      clearInterval(interval);
      setIsSubmitting(false);
    }
  };

  if (isSubmitting && isUsingAi) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white" id="ai-loading-screen">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(59,130,246,0.25),transparent_50%)]" />
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:24px_24px]" />
        
        <div className="relative z-10 flex flex-col items-center text-center max-w-lg w-full">
          <div className="w-20 h-20 bg-slate-800/80 rounded-2xl flex items-center justify-center mb-8 shadow-2xl border border-slate-700/50 backdrop-blur-sm relative">
            <div className="absolute inset-0 rounded-2xl border-2 border-teal-500/30 animate-ping" />
            <Sparkles className="w-10 h-10 text-teal-400 animate-pulse" />
          </div>

          <h2 className="text-2xl font-bold mb-3 tracking-tight text-slate-100">AI Mengenerate Tata Letak</h2>
          
          <div className="w-full bg-slate-800/50 rounded-full h-2 mb-6 border border-slate-700/50 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-teal-500 via-blue-500 to-teal-400 h-2 rounded-full transition-all duration-1000 ease-out relative"
              style={{ width: `${Math.max(15, (loadingStep / loadingTips.length) * 100)}%` }}
            >
              <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_1s_infinite]" />
            </div>
          </div>

          <p className="text-sm text-slate-400 font-medium h-6 animate-pulse">
            {loadingTips[loadingStep] || loadingTips[loadingTips.length - 1]}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col" id="create-project-page">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-stone-100 text-stone-500 transition-colors"
            title="Kembali"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden shadow-sm">
              <img src="/pagefree.png" alt="Page Free Logo" className="w-full h-full object-cover bg-white" />
            </div>
            <h1 className="text-lg font-bold text-stone-800">PageFree</h1>
          </div>
        </div>
      </header>

      <main className="flex-grow p-6 py-10" id="create-form-container">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="p-8 border-b border-stone-100 bg-gradient-to-br from-stone-50 to-white">
            <h2 className="text-xl font-bold text-stone-800 mb-2">Pilih Jenis Mockup & Informasi</h2>
            <p className="text-sm text-stone-500">
              Data ini akan digunakan untuk menyusun tata letak (layout) dan tipografi sampul secara otomatis.
            </p>
          </div>

          <form onSubmit={handleSubmitAi} className="p-8 space-y-8">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm font-medium">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                {error}
              </div>
            )}

            <div className="space-y-6">
              {/* Mockup Type Selection */}
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">Jenis Mockup</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {MOCKUPS.map((m) => (
                    <div
                      key={m}
                      onClick={() => setMockupType(m)}
                      className={`px-4 py-3 rounded-xl border-2 cursor-pointer transition text-center text-sm font-semibold ${
                        mockupType === m
                          ? "border-teal-500 bg-teal-50 text-teal-700 shadow-sm"
                          : "border-stone-200 text-stone-500 hover:border-stone-300 hover:bg-stone-50"
                      }`}
                    >
                      {m}
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-stone-100 my-2" />

              {/* Dynamic Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1.5">
                    Judul Rapor
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition shadow-sm text-sm"
                    value={judulRapor}
                    onChange={(e) => setJudulRapor(e.target.value)}
                    placeholder="Contoh: RAPOR PESERTA DIDIK"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1.5">
                    Nama Sekolah <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition shadow-sm text-sm font-semibold text-stone-800 placeholder:font-normal"
                    value={namaSekolah}
                    onChange={(e) => setNamaSekolah(e.target.value)}
                    placeholder="Contoh: SMA NEGERI 1 JAKARTA"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5">
                  Alamat Sekolah
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition shadow-sm text-sm"
                  value={alamatSekolah}
                  onChange={(e) => setAlamatSekolah(e.target.value)}
                  placeholder="Contoh: Jl. Pendidikan No. 123, Kota X"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5">
                  Sub Informasi & Keterangan Tambahan
                </label>
                <textarea
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition shadow-sm text-sm h-24 resize-none"
                  value={subInformasi}
                  onChange={(e) => setSubInformasi(e.target.value)}
                  placeholder="Contoh: NPSN: 12345678&#10;Tahun Pelajaran: 2026/2027&#10;Terakreditasi A"
                />
              </div>
            </div>

            {/* Actions Block */}
            <div className="pt-6 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleSkipAi}
                disabled={isSubmitting}
                className="px-5 py-2.5 border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 font-semibold rounded-xl text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PenTool className="w-4 h-4" />
                Lewati AI (Template Standar)
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold rounded-xl text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer transform transition active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isSubmitting ? (
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <Sparkles className="w-4 h-4 text-amber-300" />
                )}
                <span>{isSubmitting ? "Memproses..." : "Gunakan AI untuk Layout"}</span>
                {!isSubmitting && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </form>
        </div>
      </main>

      <footer className="text-center py-6 text-[11px] text-slate-400 font-mono">
        Page Free Generator Platform — 2026 PT Indonesia
      </footer>
    </div>
  );
}
