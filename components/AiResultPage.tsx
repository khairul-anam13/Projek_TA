"use client";

import React, { useState } from "react";
import { Sparkles, ArrowLeft, Check, Copy, RefreshCw, Palette, Type, Compass, FileText, ChevronRight } from "lucide-react";

interface AiResultPageProps {
  formData: {
    name: string;
    category: string;
    audience: string;
    concept: string;
    productType: "Kartu Nama" | "Sampul Rapor";
  };
  aiRecommendation: {
    color_palette: {
      primary_color: string;
      secondary_color: string;
      accent_color: string;
      explanation: string;
    };
    typography: {
      title_font: string;
      body_font: string;
      explanation: string;
    };
    layout: "Modern Center" | "Minimalist" | "Corporate" | "Creative";
    slogan: string;
    description: string;
  };
  onBack: () => void;
  onUseDesign: () => void;
}

export default function AiResultPage({
  formData,
  aiRecommendation,
  onBack,
  onUseDesign,
}: AiResultPageProps) {
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  const copyToClipboard = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedColor(hex);
    setTimeout(() => setCopiedColor(null), 1500);
  };

  const paletteColors = [
    { label: "Warna Utama (Primary)", hex: aiRecommendation.color_palette.primary_color },
    { label: "Warna Sekunder (Secondary)", hex: aiRecommendation.color_palette.secondary_color },
    { label: "Semburat Aksen (Accent Color)", hex: aiRecommendation.color_palette.accent_color },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" id="ai-result-layout">
      {/* Header */}
      <header className="bg-white border-b border-slate-200" id="ai-result-navbar">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-950 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali Ke Form</span>
          </button>
          
          <div className="flex items-center gap-1.5 font-mono text-xs text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-spin" />
            <span>AI recommendation successfully generated</span>
          </div>
        </div>
      </header>

      {/* Main recommendation display page */}
      <main className="max-w-5xl w-full mx-auto px-4 py-8 flex-grow">
        <div className="text-center mb-8">
          <span className="px-3 py-1 bg-amber-50 rounded-full text-amber-600 text-xs font-bold border border-amber-100 flex items-center gap-1.5 w-fit mx-auto">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Rekomendasi Desain Gemini AI Selesai</span>
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 mt-2 font-display-space">
            Kombinasi Konsep Desain: <span className="text-blue-600">{formData.name}</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1 font-mono">
            Produk: {formData.productType} &bull; Kategori: {formData.category}
          </p>
        </div>

        {/* Bento Grid layout style card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="bento-recommendation-panel">
          
          {/* LEFT: Core Concept, Color and Typography details */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Color Palette Card Box */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-blue-600">
                <Palette className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm tracking-tight uppercase">Skema Palet Warna Cetak</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {paletteColors.map((color, idx) => (
                  <div
                    key={idx}
                    onClick={() => copyToClipboard(color.hex)}
                    className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl flex flex-col justify-between items-center text-center cursor-pointer relative group transition-all"
                  >
                    <div
                      className="w-12 h-12 rounded-full shadow-md border border-slate-200 flex items-center justify-center text-white"
                      style={{ backgroundColor: color.hex }}
                    >
                      {copiedColor === color.hex && <Check className="w-5 h-5 bg-black/40 rounded-full p-1" />}
                    </div>
                    <div className="mt-3">
                      <span className="block text-[10px] text-slate-400 font-bold uppercase truncate max-w-[120px]">{color.label}</span>
                      <strong className="text-xs font-mono text-slate-700 block mt-0.5">{color.hex}</strong>
                    </div>

                    <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400">
                      <Copy className="w-3 h-3" />
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 text-xs text-slate-600 leading-relaxed">
                👉 <strong className="text-blue-700 font-bold">Arti Warna:</strong> {aiRecommendation.color_palette.explanation}
              </div>
            </div>

            {/* Typography Card Box */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-emerald-600">
                <Type className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-sm tracking-tight uppercase">Rekomendasi Tipografi Font</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/50">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Font Utama (Display/Head)</span>
                  <p
                    className="text-xl font-bold text-slate-900 mt-2"
                    style={{ fontFamily: aiRecommendation.typography.title_font }}
                  >
                    {aiRecommendation.typography.title_font}
                  </p>
                  <span className="text-[10px] text-slate-400 font-mono italic mt-1 block">Tingkat kontras visual ideal</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/50">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Font Pendukung (Body text)</span>
                  <p
                    className="text-xl font-bold text-slate-900 mt-2"
                    style={{ fontFamily: aiRecommendation.typography.body_font }}
                  >
                    {aiRecommendation.typography.body_font}
                  </p>
                  <span className="text-[10px] text-slate-400 font-mono italic mt-1 block">Tingkat legibilitas terbaca tinggi</span>
                </div>
              </div>

              <div className="mt-4 p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs text-slate-600 leading-relaxed">
                ✏️ <strong className="text-emerald-700 font-bold">Arti Tipografi:</strong> {aiRecommendation.typography.explanation}
              </div>
            </div>
          </div>

          {/* RIGHT: Layout selection, Slogan details, Concept description & CTA button */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Slogan and layout card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-full">
              <div>
                {/* Generated Brand Slogan Badge */}
                <div className="p-4 bg-gradient-to-tr from-amber-500/10 to-amber-600/5 border border-amber-200 rounded-2xl mb-5 text-center">
                  <span className="text-[10px] text-amber-600 font-bold block tracking-widest uppercase">Tagline / Slogan Bisnis</span>
                  <blockquote className="text-lg font-extrabold text-amber-800 italic mt-1 font-serif">
                    &ldquo;{aiRecommendation.slogan || "Solusi Hebat Sederhana"}&rdquo;
                  </blockquote>
                  <span className="text-[9px] text-slate-400 block mt-1">Dicocokkan dengan segmentasi: {formData.audience || "Publik"}</span>
                </div>

                {/* Slogan details and layout recommendations */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                      <Compass className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Bentuk Layout Rekomendasi</span>
                      <strong className="text-sm text-slate-800">{aiRecommendation.layout}</strong>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Konsep Desain Ringkas</span>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {aiRecommendation.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTION CALL: Apply design setting to Canvas Editor */}
              <div className="pt-6 border-t border-slate-100 mt-6 space-y-2">
                <button
                  onClick={onUseDesign}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-100 hover:shadow-blue-200 flex items-center justify-center gap-2 cursor-pointer transform transition active:scale-95"
                >
                  <span>Gunakan Desain & Buka Editor</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <p className="text-[10px] text-slate-400 text-center font-medium">
                  Konsep warna & font akan otomatis diaplikasikan ke canvas editor.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer info */}
      <footer className="text-center py-6 text-xs text-slate-400 font-mono">
        Rekomendasi ini disusun secara khusus oleh Gemini AI model &bull; Page Free 2026
      </footer>
    </div>
  );
}
