"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, ChevronRight, PenTool, Search, Loader2, CheckCircle2, AlertCircle, ListFilter } from "lucide-react";
import { MockupType, PrintSize, ProductType } from "../lib/types";
import { Button, Input, Textarea, PageHeader } from "@/components/ui";
import { cn } from "@/lib/utils";
import { getCardRatio } from "../lib/canvasConstraints";
import { COVER_TEMPLATES, DEFAULT_TEMPLATE_ID, buildTemplatePreviewProject } from "../lib/templates";
import { DesignCanvas } from "./DesignCanvas";

const SEARCH_DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH_FOR_AUTO_SEARCH = 3;

interface SekolahSuggestion {
  nama: string;
  npsn?: string;
  kabupaten: string | null;
  provinsi: string | null;
  /** Skor kemiripan 0-1 terhadap ketikan user (lib/fuzzyMatch.ts). */
  score?: number;
}

interface SchoolLookupState {
  status: "idle" | "loading" | "success" | "error" | "choices";
  message: string;
  suggestions: SekolahSuggestion[];
}

interface CreateProjectFormData {
  mockupType: MockupType;
  dynamicData: {
    judulRapor: string;
    namaSekolah: string;
    alamatSekolah: string;
    subInformasi: string;
  };
  templateId?: string;
  printSize?: PrintSize;
}

interface CreateProjectPageProps {
  initialProductType: ProductType;
  /** Isian awal opsional — dipakai saat pengguna kembali dari halaman hasil AI
   * agar form tidak kosong. Kalau tidak diberikan, perilaku default (form
   * kosong) tetap sama seperti sebelumnya. */
  initialFormData?: CreateProjectFormData;
  onBack: () => void;
  onSkipAi: (formData: any) => void | Promise<void>;
  onGenerateAi: (formData: any) => void | Promise<void>;
}

const MOCKUPS: MockupType[] = ["Rapor SD", "Rapor SMP", "Rapor SMA/SMK", "Rapor MAN"];

const PRINT_SIZES: { value: PrintSize; label: string; note: string }[] = [
  { value: "Size A (23x34cm)", label: "Ukuran A", note: "23 × 34 cm" },
  { value: "Size B (17x23cm)", label: "Ukuran B", note: "17 × 23 cm" },
];

const TEMPLATE_THUMB_WIDTH = 116;

export default function CreateProjectPage({
  initialProductType,
  initialFormData,
  onBack,
  onSkipAi,
  onGenerateAi,
}: CreateProjectPageProps) {
  const [mockupType, setMockupType] = useState<MockupType>(initialFormData?.mockupType ?? "Rapor SD");

  // Dynamic fields
  const [judulRapor, setJudulRapor] = useState(initialFormData?.dynamicData.judulRapor ?? "RAPOR PESERTA DIDIK");
  const [namaSekolah, setNamaSekolah] = useState(initialFormData?.dynamicData.namaSekolah ?? "");
  const [alamatSekolah, setAlamatSekolah] = useState(initialFormData?.dynamicData.alamatSekolah ?? "");
  const [subInformasi, setSubInformasi] = useState(initialFormData?.dynamicData.subInformasi ?? "");
  const [printSize, setPrintSize] = useState<PrintSize>(initialFormData?.printSize ?? "Size A (23x34cm)");
  const [templateId, setTemplateId] = useState(initialFormData?.templateId ?? DEFAULT_TEMPLATE_ID);

  // Pratinjau tiap template dengan data & ukuran yang sedang diisi.
  const templatePreviews = useMemo(
    () =>
      COVER_TEMPLATES.map((template) => ({
        template,
        project: buildTemplatePreviewProject(template.id, {
          data: { judulRapor, namaSekolah, alamatSekolah, subInformasi },
          mockupType,
          printSize,
        }),
      })),
    [judulRapor, namaSekolah, alamatSekolah, subInformasi, mockupType, printSize]
  );

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [isUsingAi, setIsUsingAi] = useState(true);

  const [schoolLookup, setSchoolLookup] = useState<SchoolLookupState>({
    status: "idle",
    message: "",
    suggestions: [],
  });

  // Token pencarian terbaru — dipakai supaya respons dari request yang sudah
  // "basi" (ada request lebih baru yang menyusul, mis. saat debounce menembak
  // beberapa kali berturut-turut) tidak menimpa hasil pencarian yang lebih baru.
  const searchTokenRef = useRef(0);

  const runSearch = useCallback(async (rawQuery: string, kabupaten?: string) => {
    const query = rawQuery.trim();
    if (!query) {
      setSchoolLookup({ status: "idle", message: "", suggestions: [] });
      return;
    }

    const token = ++searchTokenRef.current;
    setSchoolLookup({ status: "loading", message: "", suggestions: [] });

    try {
      const res = await fetch("/api/gemini/sekolah", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ namaSekolah: query, kabupaten }),
      });
      const data = await res.json();
      if (token !== searchTokenRef.current) return; // ada pencarian lebih baru; abaikan hasil ini

      if (data.success) {
        setAlamatSekolah(data.result.alamat);
        setSubInformasi(data.result.sub_informasi);
        setSchoolLookup({
          status: "success",
          message: `Ditemukan: ${data.result.nama_sekolah} (NPSN ${data.result.npsn}). Data dari sumber resmi Kemendikdasmen — silakan periksa & edit bila perlu.`,
          suggestions: [],
        });
        return;
      }

      if (data.needsChoice && Array.isArray(data.candidates) && data.candidates.length > 0) {
        setSchoolLookup({
          status: "choices",
          message: data.error || "Ditemukan beberapa sekolah yang mirip — pilih salah satu:",
          suggestions: data.candidates,
        });
        return;
      }

      setSchoolLookup({
        status: "error",
        message: data.error || "Sekolah tidak ditemukan.",
        suggestions: [],
      });
    } catch (err) {
      if (token !== searchTokenRef.current) return;
      console.error(err);
      setSchoolLookup({
        status: "error",
        message: "Gagal terhubung ke server pencarian sekolah. Coba lagi.",
        suggestions: [],
      });
    }
  }, []);

  // Set saat handlePickCandidate mengubah namaSekolah secara terprogram —
  // mencegah efek auto-search di bawah menembak ULANG tanpa filter kabupaten
  // segera setelahnya, yang bisa membatalkan kandidat yang baru saja dipilih
  // user (nama yang sama tanpa kabupaten bisa kembali ambigu / balik ke
  // status "choices", menimpa hasil "success" yang baru didapat).
  const skipNextAutoSearchRef = useRef(false);

  const handlePickCandidate = useCallback((s: SekolahSuggestion) => {
    skipNextAutoSearchRef.current = true;
    setNamaSekolah(s.nama);
    runSearch(s.nama, s.kabupaten ?? undefined);
  }, [runSearch]);

  // Auto-search dengan debounce (mirip autocomplete search engine): menembak
  // sendiri beberapa saat setelah user berhenti mengetik, supaya tidak perlu
  // selalu menekan tombol cari. Dilewati pada render pertama supaya nama
  // sekolah yang sudah terisi (mis. kembali dari halaman hasil AI) tidak
  // langsung memicu request sebelum user benar-benar mengetik sesuatu.
  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (skipNextAutoSearchRef.current) {
      skipNextAutoSearchRef.current = false;
      return;
    }
    const trimmed = namaSekolah.trim();
    if (trimmed.length < MIN_QUERY_LENGTH_FOR_AUTO_SEARCH) return;

    const timer = setTimeout(() => runSearch(trimmed), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [namaSekolah, runSearch]);

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
    templateId,
    printSize,
    dynamicData: {
      judulRapor,
      namaSekolah,
      alamatSekolah,
      subInformasi
    }
  };

  const handleSkipAi = async () => {
    if (isSubmitting) return;
    if (!handleValidation()) return;
    setIsSubmitting(true);
    setIsUsingAi(false);
    try {
      await onSkipAi(formData);
    } catch (err) {
      console.error(err);
      setError("Gagal membuat proyek. Coba lagi.");
      setIsSubmitting(false);
    }
  };

  const handleSubmitAi = async (e?: React.FormEvent) => {
    e?.preventDefault();
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
      <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-center p-6 text-white" id="ai-loading-screen">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(20,184,166,0.25),transparent_50%)]" />
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#292524_1px,transparent_1px),linear-gradient(to_bottom,#292524_1px,transparent_1px)] bg-[size:24px_24px]" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-lg w-full">
          <div className="w-20 h-20 bg-stone-800/80 rounded-2xl flex items-center justify-center mb-8 shadow-2xl border border-stone-700/50 backdrop-blur-sm relative">
            <div className="absolute inset-0 rounded-2xl border-2 border-brand-500/30 animate-ping" />
            <Sparkles className="w-10 h-10 text-brand-400 animate-pulse" />
          </div>

          <h2 className="text-2xl font-bold mb-3 tracking-tight text-stone-100">AI Mengenerate Tata Letak</h2>

          <div className="w-full bg-stone-800/50 rounded-full h-2 mb-6 border border-stone-700/50 overflow-hidden">
            <div
              className="bg-gradient-to-r from-brand-500 via-teal-400 to-brand-400 h-2 rounded-full transition-all duration-1000 ease-out relative"
              style={{ width: `${Math.max(15, (loadingStep / loadingTips.length) * 100)}%` }}
            >
              <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_1s_infinite]" />
            </div>
          </div>

          <p className="text-sm text-stone-400 font-medium h-6 animate-pulse">
            {loadingTips[loadingStep] || loadingTips[loadingTips.length - 1]}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col" id="create-project-page">
      <PageHeader onBack={onBack} title="PageFree" />

      <main className="flex-grow p-6 py-10" id="create-form-container">
        <div className="max-w-3xl mx-auto bg-surface rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="p-8 border-b border-stone-100 bg-gradient-to-br from-stone-50 to-white">
            <h2 className="text-xl font-bold text-stone-800 mb-2">Pilih Jenis Mockup & Informasi</h2>
            <p className="text-sm text-stone-500">
              Data ini akan digunakan untuk menyusun tata letak (layout) dan tipografi sampul secara otomatis.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSkipAi();
            }}
            className="p-8 space-y-8"
          >
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-600 text-sm font-medium">
                <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
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
                          ? "border-brand-500 bg-brand-50 text-brand-700 shadow-sm"
                          : "border-stone-200 text-stone-500 hover:border-stone-300 hover:bg-stone-50"
                      }`}
                    >
                      {m}
                    </div>
                  ))}
                </div>
              </div>

              {/* Ukuran cetak */}
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">Ukuran Cetak</label>
                <div className="grid grid-cols-2 gap-3 max-w-md">
                  {PRINT_SIZES.map((size) => (
                    <button
                      key={size.value}
                      type="button"
                      onClick={() => setPrintSize(size.value)}
                      className={cn(
                        "px-4 py-3 rounded-xl border-2 cursor-pointer transition text-center",
                        printSize === size.value
                          ? "border-brand-500 bg-brand-50 text-brand-700 shadow-sm"
                          : "border-stone-200 text-stone-500 hover:border-stone-300 hover:bg-stone-50"
                      )}
                    >
                      <span className="block text-sm font-semibold">{size.label}</span>
                      <span className="block text-[11px] opacity-70">{size.note}</span>
                    </button>
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
                  <Input
                    type="text"
                    value={judulRapor}
                    onChange={(e) => setJudulRapor(e.target.value)}
                    placeholder="Contoh: RAPOR PESERTA DIDIK"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1.5">
                    Nama Sekolah <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      className="font-semibold text-stone-800 placeholder:font-normal"
                      value={namaSekolah}
                      onChange={(e) => setNamaSekolah(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          runSearch(namaSekolah);
                        }
                      }}
                      placeholder="Contoh: SMA NEGERI 1 JAKARTA"
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      className="shrink-0 px-3"
                      disabled={schoolLookup.status === "loading" || !namaSekolah.trim()}
                      onClick={() => runSearch(namaSekolah)}
                      title="Cari data sekolah dari Kemendikdasmen"
                    >
                      {schoolLookup.status === "loading" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  {schoolLookup.status === "loading" && (
                    <p className="mt-1.5 text-xs text-stone-500 flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Mencari data sekolah di database resmi Kemendikdasmen...
                    </p>
                  )}
                  {schoolLookup.status === "success" && (
                    <p className="mt-1.5 text-xs text-brand-700 flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>{schoolLookup.message}</span>
                    </p>
                  )}
                  {schoolLookup.status === "choices" && (
                    <div className="mt-1.5 border border-stone-200 rounded-xl overflow-hidden shadow-sm">
                      <p className="px-3 py-2 bg-stone-50 border-b border-stone-200 flex items-center gap-1.5 text-xs font-semibold text-stone-600">
                        <ListFilter className="w-3.5 h-3.5 shrink-0" />
                        {schoolLookup.message}
                      </p>
                      <ul className="max-h-56 overflow-y-auto divide-y divide-stone-100">
                        {schoolLookup.suggestions.map((s, i) => (
                          <li key={i}>
                            <button
                              type="button"
                              onClick={() => handlePickCandidate(s)}
                              className="w-full text-left px-3 py-2.5 hover:bg-brand-50 transition flex items-center justify-between gap-2 cursor-pointer"
                            >
                              <span className="min-w-0">
                                <span className="block text-sm font-semibold text-stone-800 truncate">{s.nama}</span>
                                <span className="block text-xs text-stone-400 truncate">
                                  {[s.kabupaten, s.provinsi].filter(Boolean).join(", ") || "Lokasi tidak diketahui"}
                                  {s.npsn ? ` · NPSN ${s.npsn}` : ""}
                                </span>
                              </span>
                              {typeof s.score === "number" && (
                                <span className="shrink-0 text-[10px] font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded-full">
                                  {Math.round(s.score * 100)}%
                                </span>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {schoolLookup.status === "error" && (
                    <div className="mt-1.5 text-xs text-rose-600">
                      <p className="flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>{schoolLookup.message}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5">
                  Alamat Sekolah
                </label>
                <Input
                  type="text"
                  value={alamatSekolah}
                  onChange={(e) => setAlamatSekolah(e.target.value)}
                  placeholder="Contoh: Jl. Pendidikan No. 123, Kota X"
                />
                <p className="mt-1 text-xs text-stone-400">
                  Bisa diisi otomatis lewat tombol cari di atas, atau diedit manual.
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5">
                  Sub Informasi & Keterangan Tambahan
                </label>
                <Textarea
                  className="h-24"
                  value={subInformasi}
                  onChange={(e) => setSubInformasi(e.target.value)}
                  placeholder={"Contoh: NPSN: 12345678\nTahun Pelajaran: 2026/2027\nTerakreditasi A"}
                />
              </div>
            </div>

            {/* Template sampul */}
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-1">Template Sampul</label>
              <p className="text-xs text-stone-400 mb-3">
                Pratinjau memakai data sekolah dan ukuran cetak di atas. Posisi jendela mika sudah dihitung per ukuran.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" id="template-gallery">
                {templatePreviews.map(({ template, project }) => {
                  const selected = template.id === templateId;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setTemplateId(template.id)}
                      className={cn(
                        "text-left rounded-xl border-2 p-2.5 cursor-pointer transition",
                        selected
                          ? "border-brand-500 bg-brand-50 shadow-sm"
                          : "border-stone-200 hover:border-stone-300 hover:bg-stone-50"
                      )}
                    >
                      <div className="flex justify-center rounded-lg bg-stone-100 py-3 mb-2.5">
                        <DesignCanvas
                          project={project}
                          width={TEMPLATE_THUMB_WIDTH}
                          height={Math.round(TEMPLATE_THUMB_WIDTH / getCardRatio(printSize))}
                          borderRadius={3}
                        />
                      </div>
                      <p className="text-sm font-semibold text-stone-800">{template.nama}</p>
                      <p className="text-[11px] leading-snug text-stone-400">{template.deskripsi}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions Block */}
            <div className="pt-6 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => handleSubmitAi()}
                disabled={isSubmitting}
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Susun Layout dengan AI</span>
              </Button>

              <Button type="submit" variant="primary" size="lg" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenTool className="w-4 h-4" />}
                <span>{isSubmitting ? "Memproses..." : "Buat Sampul dari Template"}</span>
                {!isSubmitting && <ChevronRight className="w-4 h-4" />}
              </Button>
            </div>
          </form>
        </div>
      </main>

      <footer className="text-center py-6 text-[11px] text-stone-400">
        Page Free Generator Platform — 2026 PT Indonesia
      </footer>
    </div>
  );
}
