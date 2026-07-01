"use client";

import React from "react";
import { Sparkles, ArrowLeft, Check, LayoutTemplate, AlignCenter, ChevronRight } from "lucide-react";

interface AiResultPageProps {
  formData: any;
  aiRecommendation: {
    description: string;
    layout_elements: any[];
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
          
          <div className="flex items-center gap-1.5 font-medium text-xs text-stone-500">
            <Sparkles className="w-3.5 h-3.5 text-teal-500 animate-pulse" />
            <span>Rekomendasi AI berhasil dibuat</span>
          </div>
        </div>
      </header>

      {/* Main recommendation display page */}
      <main className="max-w-5xl w-full mx-auto px-4 py-8 flex-grow">
        <div className="text-center mb-8">
          <span className="px-3 py-1 bg-amber-50 rounded-full text-amber-600 text-xs font-bold border border-amber-100 flex items-center gap-1.5 w-fit mx-auto">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>AI Layout Generator Selesai</span>
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 mt-2">
            Rekomendasi Tata Letak: <span className="text-blue-600">{formData.mockupType}</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Gemini AI telah memposisikan ulang seluruh elemen dan teks Anda sesuai standar cetak formal.
          </p>
        </div>

        {/* Bento Grid layout style card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="bento-recommendation-panel">
          
          {/* LEFT: Core Concept, Color and Typography details */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Description Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-bl-full -mr-8 -mt-8" />
              <h3 className="font-bold text-slate-900 text-sm tracking-tight mb-3 uppercase text-teal-700 flex items-center gap-2">
                <LayoutTemplate size={16}/> Konsep & Hierarki
              </h3>
              <p className="text-slate-700 leading-relaxed text-sm">
                {aiRecommendation.description || "AI telah menyusun tata letak secara otomatis."}
              </p>
            </div>

            {/* Elements Details */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-blue-600">
                <AlignCenter className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm tracking-tight uppercase">Komponen yang Dihasilkan</h3>
              </div>
              
              <div className="space-y-3">
                {aiRecommendation.layout_elements?.map((el, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors gap-3">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-slate-800">{el.type === 'text' ? el.text : 'Logo / Icon (' + el.logoIcon + ')'}</span>
                      <span className="text-xs text-slate-500 mt-0.5">Tipe: {el.type} | Font: {el.fontFamily || '-'} | Ukuran: {el.fontSize || '-'}</span>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2.5 py-1 bg-white border border-slate-200 rounded-md text-[10px] font-mono text-slate-600 shadow-sm">
                        Posisi Y: {el.y}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT: Mockup preview and Action */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between" style={{ minHeight: '320px' }}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20" />
              
              <div className="relative z-10">
                <span className="px-2 py-1 bg-white/10 rounded text-[10px] font-bold text-blue-300 tracking-wider uppercase mb-3 inline-block">
                  Next Step
                </span>
                <h3 className="text-xl font-bold font-display-space mb-2 leading-tight">Mulai Kustomisasi Layout</h3>
                <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                  Buka editor untuk melihat hasil presisi penempatan yang telah dirumuskan AI, lalu tambahkan modifikasi akhir jika diperlukan.
                </p>
              </div>

              <button
                onClick={onUseDesign}
                className="relative z-10 w-full py-4 bg-white hover:bg-blue-50 text-blue-700 active:bg-blue-100 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition transform active:scale-95"
              >
                <Check className="w-5 h-5" />
                <span>Gunakan Layout Ini</span>
              </button>
            </div>
            
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 text-sm">
               <div className="text-blue-500 mt-0.5"><Sparkles size={16} /></div>
               <p className="text-blue-800 font-medium text-xs leading-relaxed">
                 Warna dasar bahan dan tinta (Foil/Sablon) akan tetap dikunci oleh konfigurasi Mockup Anda di editor.
               </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
