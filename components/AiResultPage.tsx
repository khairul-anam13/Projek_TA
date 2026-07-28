"use client";

import React, { useState } from "react";
import { Sparkles, Check, LayoutTemplate, AlignCenter, Info } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";

interface AiResultPageProps {
  formData: any;
  aiRecommendation: {
    description: string;
    sub_information_options?: string[];
    layout_elements: any[];
  };
  onBack: () => void;
  onUseDesign: (modifiedElements?: any[]) => void;
}

export default function AiResultPage({
  formData,
  aiRecommendation,
  onBack,
  onUseDesign,
}: AiResultPageProps) {
  const [selectedSubInfoIdx, setSelectedSubInfoIdx] = useState(0);
  return (
    <div className="min-h-screen bg-canvas flex flex-col" id="ai-result-layout">
      <PageHeader
        onBack={onBack}
        backLabel="Kembali Ke Form"
        right={
          <div className="flex items-center gap-1.5 font-medium text-xs text-stone-500">
            <Sparkles className="w-3.5 h-3.5 text-brand-500 animate-pulse" />
            <span>Rekomendasi AI berhasil dibuat</span>
          </div>
        }
      />

      {/* Main recommendation display page */}
      <main className="max-w-5xl w-full mx-auto px-4 py-8 flex-grow">
        <div className="text-center mb-8">
          <span className="px-3 py-1 bg-amber-50 rounded-full text-amber-600 text-xs font-bold border border-amber-100 flex items-center gap-1.5 w-fit mx-auto">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>AI Layout Generator Selesai</span>
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-stone-950 mt-2 font-display-space">
            Rekomendasi Tata Letak: <span className="text-brand-600">{formData.mockupType}</span>
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Gemini AI telah memposisikan ulang seluruh elemen dan teks Anda sesuai standar cetak formal.
          </p>
        </div>

        {/* Bento Grid layout style card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="bento-recommendation-panel">

          {/* LEFT: Core Concept, Color and Typography details */}
          <div className="lg:col-span-8 space-y-6">

            {/* Description Card */}
            <Card className="p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-bl-full -mr-8 -mt-8" />
              <h3 className="font-bold text-stone-900 text-sm tracking-tight mb-3 uppercase text-brand-700 flex items-center gap-2">
                <LayoutTemplate size={16}/> Konsep & Hierarki
              </h3>
              <p className="text-stone-700 leading-relaxed text-sm">
                {aiRecommendation.description || "AI telah menyusun tata letak secara otomatis."}
              </p>
            </Card>

            {/* Elements Details */}
            <Card className="p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-brand-600">
                <AlignCenter className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-stone-900 text-sm tracking-tight uppercase">Komponen yang Dihasilkan</h3>
              </div>

              <div className="space-y-3">
                {aiRecommendation.layout_elements?.map((el, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-stone-100 bg-stone-50/50 hover:bg-stone-50 transition-colors gap-3">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-stone-800">{el.type === 'text' ? el.text : 'Logo / Icon (' + el.logoIcon + ')'}</span>
                      <span className="text-xs text-stone-500 mt-0.5">Tipe: {el.type} | Font: {el.fontFamily || '-'} | Ukuran: {el.fontSize || '-'}</span>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2.5 py-1 bg-white border border-stone-200 rounded-md text-[10px] font-mono text-stone-600 shadow-sm">
                        Posisi Y: {el.y}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

          </div>

          {/* RIGHT: Mockup preview and Action */}
          <div className="lg:col-span-4 space-y-6">
            {aiRecommendation.sub_information_options && aiRecommendation.sub_information_options.length > 0 && (
              <Card className="p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-5 h-5 text-brand-600" />
                  <h3 className="font-bold text-stone-900 text-sm tracking-tight uppercase">Opsi Sub Informasi</h3>
                </div>
                <p className="text-xs text-stone-500 mb-4">Pilih salah satu rekomendasi AI untuk informasi tambahan:</p>
                <div className="space-y-2">
                  {aiRecommendation.sub_information_options.map((opt, idx) => (
                    <label key={idx} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedSubInfoIdx === idx ? 'bg-brand-50 border-brand-500' : 'bg-stone-50 border-stone-200 hover:bg-stone-100'}`}>
                      <input
                        type="radio"
                        name="subInfoOption"
                        className="mt-0.5 text-brand-600 focus:ring-brand-500"
                        checked={selectedSubInfoIdx === idx}
                        onChange={() => setSelectedSubInfoIdx(idx)}
                      />
                      <span className={`text-xs font-medium ${selectedSubInfoIdx === idx ? 'text-brand-900' : 'text-stone-700'}`}>{opt}</span>
                    </label>
                  ))}
                </div>
              </Card>
            )}

            <div className="bg-gradient-to-br from-stone-900 to-stone-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between" style={{ minHeight: '320px' }}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20" />

              <div className="relative z-10">
                <span className="px-2 py-1 bg-white/10 rounded text-[10px] font-bold text-brand-300 tracking-wider uppercase mb-3 inline-block">
                  Next Step
                </span>
                <h3 className="text-xl font-bold font-display-space mb-2 leading-tight">Mulai Kustomisasi Layout</h3>
                <p className="text-stone-300 text-sm mb-6 leading-relaxed">
                  Buka editor untuk melihat hasil presisi penempatan yang telah dirumuskan AI, lalu tambahkan modifikasi akhir jika diperlukan.
                </p>
              </div>

              <button
                onClick={() => {
                  let modifiedElements = [...aiRecommendation.layout_elements];
                  if (aiRecommendation.sub_information_options && aiRecommendation.sub_information_options[selectedSubInfoIdx]) {
                    modifiedElements = modifiedElements.map(el =>
                      el.id === 'el_sub_info' ? { ...el, text: aiRecommendation.sub_information_options![selectedSubInfoIdx] } : el
                    );
                  }
                  onUseDesign(modifiedElements);
                }}
                className="relative z-10 w-full py-4 bg-white hover:bg-brand-50 text-brand-700 active:bg-brand-100 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition transform active:scale-95 cursor-pointer"
              >
                <Check className="w-5 h-5" />
                <span>Gunakan Layout Ini</span>
              </button>
            </div>

            <div className="bg-brand-50 border border-brand-100 p-4 rounded-xl flex gap-3 text-sm">
               <div className="text-brand-500 mt-0.5"><Sparkles size={16} /></div>
               <p className="text-brand-800 font-medium text-xs leading-relaxed">
                 Warna dasar bahan dan tinta (Foil/Sablon) akan tetap dikunci oleh konfigurasi Mockup Anda di editor.
               </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
