"use client";

import React, { useState } from "react";
import { Sparkles, ArrowLeft, BookOpen, ChevronRight, HelpCircle } from "lucide-react";
import { ProductType } from "../lib/types";

interface CreateProjectPageProps {
  initialProductType: ProductType;
  onBack: () => void;
  onGenerateAi: (formData: {
    name: string;
    category: string;
    audience: string;
    concept: string;
    productType: ProductType;
  }) => void;
}

const CATEGORY_SUGGESTIONS = [
  "Teknologi",
  "Pendidikan",
  "Kuliner (F&B)",
  "Fashion & Style",
  "Kesehatan & Medis",
  "Jasa Profesional",
  "Karya Kreatif",
  "Toko UMKM"
];

const CONCEPT_SUGGESTIONS = [
  "Minimalist & Clean",
  "Elegant & Premium",
  "Bold & Modern",
  "Corporate & Formal",
  "Playful & Creative",
  "Retro & Vintage"
];

export default function CreateProjectPage({
  initialProductType,
  onBack,
  onGenerateAi,
}: CreateProjectPageProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [audience, setAudience] = useState("");
  const [concept, setConcept] = useState(CONCEPT_SUGGESTIONS[0]);
  // Untuk saat ini hanya Sampul Rapor yang tersedia
  const productType: ProductType = "Sampul Rapor";
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  // Rotating tips shown during the AI generation process
  const loadingTips = [
    "Menganalisis kategori bisnis untuk penyelarasan warna...",
    "Merelasikan font Display & Body agar sesuai dengan target konsumen...",
    "Gemini AI sedang menyusun slogan kampanye promosi yang berkelas...",
    "Memformulasikan komposisi layout terbaik untuk cetak produk...",
    "Menyelesaikan paket rekomendasi desain high-fidelity Anda..."
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Nama Usaha / Sekolah wajib diisi.");
      return;
    }
    if (!category.trim()) {
      setError("Kategori Bisnis / Bidang wajib diisi.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    // Tip rotation timer
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev < loadingTips.length - 1 ? prev + 1 : prev));
    }, 1500);

    // Call dynamic AI generator
    setTimeout(() => {
      clearInterval(interval);
      onGenerateAi({
        name,
        category,
        audience,
        concept,
        productType
      });
      setIsSubmitting(false);
    }, 6000);
  };

  if (isSubmitting) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white" id="ai-loading-screen">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(59,130,246,0.25),transparent_50%)]" />
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:24px_24px]" />

        <div className="relative max-w-md w-full text-center z-10">
          {/* Animated glow orb */}
          <div className="relative w-28 h-28 mx-auto mb-8">
            <div className="absolute inset-0 bg-blue-500 rounded-full blur-2xl opacity-40 animate-pulse" />
            <div className="w-24 h-24 bg-slate-800 rounded-3xl border-2 border-blue-400 flex items-center justify-center shadow-2xl mx-auto animate-spin-slow">
              <Sparkles className="w-12 h-12 text-blue-400 animate-pulse" />
            </div>
          </div>

          <h2 className="text-2xl font-bold font-display-space tracking-tight">
            Menghubungi Desainer AI
          </h2>
          <p className="text-slate-400 text-xs mt-1.5 font-mono">
            POWERED BY GEMINI 3.5 FLASH
          </p>

          {/* Loader bar */}
          <div className="mt-8 bg-slate-800 h-2 rounded-full overflow-hidden w-full max-w-sm mx-auto">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-1000"
              style={{ width: `${((loadingStep + 1) / loadingTips.length) * 100}%` }}
            />
          </div>

          {/* Tips paragraph */}
          <p className="text-sm text-slate-300 font-medium mt-5 h-12 transition-all">
            {loadingTips[loadingStep]}
          </p>

          <div className="mt-12 bg-slate-800/50 border border-slate-700/50 p-4 rounded-2xl text-[11px] text-slate-400 text-left">
            💡 <strong className="text-slate-300">Tahukah Anda?</strong> AI memilih dari kombinasi skema warna offset CMYK percetakan profesional dan mencocokkannya secara dinamis dengan psikologi kategori bidang usaha yang Anda tentukan.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" id="create-project-layout">
      {/* Header */}
      <header className="bg-white border-b border-slate-200" id="create-project-navbar">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-950 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Dashboard</span>
          </button>
          
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-teal-600" />
            <span className="text-xs font-extrabold tracking-tight">PageFree</span>
          </div>
        </div>
      </header>

      {/* Main Form container */}
      <main className="max-w-2xl w-full mx-auto px-4 py-10 flex-grow">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-stone-900">
                  Buat Sampul Rapor Baru
                </h1>
                <p className="text-stone-500 text-xs mt-0.5">
                  AI akan merekomendasikan desain terbaik berdasarkan informasi sekolah Anda.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" id="ai-generator-form">
            {error && (
              <div className="p-3.5 bg-rose-50 text-rose-600 text-xs rounded-xl border border-rose-100 font-medium">
                {error}
              </div>
            )}

            {/* Hanya Sampul Rapor — indikator jenis produk */}
            <div className="flex items-center gap-3 p-3.5 bg-teal-50 border border-teal-100 rounded-xl">
              <span className="text-xl" role="img" aria-label="Sampul Rapor">📄</span>
              <div>
                <span className="block text-xs font-bold text-teal-800">Sampul Rapor</span>
                <span className="text-[10px] text-teal-600">Ukuran Standar A4 (210 × 297 mm)</span>
              </div>
            </div>

            {/* Nama Sekolah */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5" htmlFor="field-name">
                Nama Sekolah / Instansi
              </label>
              <input
                id="field-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: SMA Negeri 1 Yogyakarta"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all text-stone-900 font-semibold"
                required
              />
            </div>

            {/* Kategori Sekolah */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                Jenjang / Bidang Sekolah
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Contoh: SMA, SMK Jurusan RPL, SMP Negeri"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all text-stone-900 font-semibold mb-2"
                required
              />
              {/* Category Quick Suggestions */}
              <div className="flex flex-wrap gap-1.5" id="category-pills">
                {CATEGORY_SUGGESTIONS.map((catString) => (
                  <button
                    key={catString}
                    type="button"
                    onClick={() => setCategory(catString)}
                    className="px-2.5 py-1 text-[10px] font-bold bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-full transition cursor-pointer"
                  >
                    {catString}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Konsumen */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500" htmlFor="field-audience">
                  Nama Siswa / Kelas (Opsional)
                </label>
                <span className="text-stone-300 cursor-help" title="Opsional: digunakan untuk melengkapi isi desain secara otomatis.">
                  <HelpCircle className="w-3.5 h-3.5" />
                </span>
              </div>
              <input
                id="field-audience"
                type="text"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="Contoh: Siswa kelas XI, Tahun Pelajaran 2025/2026"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all text-stone-900 font-medium"
              />
            </div>

            {/* Konsep Desain */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Pilih Arah Konsep Kreatif
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" id="concept-grid">
                {CONCEPT_SUGGESTIONS.map((con) => (
                  <button
                    key={con}
                    type="button"
                    onClick={() => setConcept(con)}
                    className={`px-3 py-2 text-xs font-semibold rounded-xl border text-center transition cursor-pointer ${
                      concept === con
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {con}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Action Block */}
            <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <span className="text-[11px] text-stone-400 font-medium">
                Proses AI ±5 detik.
              </span>
              <button
                type="submit"
                className="px-6 py-3 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold rounded-xl text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer transform transition active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Buat dengan AI</span>
                <ChevronRight className="w-4 h-4" />
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
