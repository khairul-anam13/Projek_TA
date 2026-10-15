"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Upload, X, Wand2, Download, Save, RotateCcw, TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button, IconButton } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  LogoTraceMode,
  LogoTraceResult,
  RgbaImage,
  suggestMode,
  traceLogo,
  workingSize,
} from "@/lib/logoTrace";

interface Props {
  /** `size` = ukuran viewBox hasil trace, dipakai editor untuk menentukan rasio kotak elemen. */
  onInsertSVG: (svgString: string, size: { width: number; height: number }) => void;
  onClose: () => void;
}

type Phase = "idle" | "loading" | "ready" | "error";

interface Params {
  mode: LogoTraceMode;
  /** null = otomatis. */
  threshold: number | null;
  speckle: number;
  smooth: number;
  /** null = otomatis (sebanding dengan ukuran gambar). */
  lineWidth: number | null;
  invert: boolean;
}

const DEFAULT_PARAMS: Params = {
  mode: "detail",
  threshold: null,
  speckle: 12,
  smooth: 1,
  lineWidth: null,
  invert: false,
};

const MODES: { id: LogoTraceMode; title: string; hint: string }[] = [
  { id: "garis", title: "Garis tepi", hint: "Hanya kontur antar-area dengan tebal seragam. Cocok untuk logo berwarna atau bergradasi." },
  { id: "detail", title: "Detail", hint: "Bagian gelap jadi tinta, bagian terang kosong. Cocok untuk logo hitam-putih dan teks." },
  { id: "siluet", title: "Siluet", hint: "Seluruh bentuk jadi blok tinta padat." },
];

const THRESHOLD_UI: Record<LogoTraceMode, { label: string; min: number; max: number; hint: string }> = {
  detail: { label: "Batas gelap-terang", min: 10, max: 245, hint: "Naikkan agar warna yang lebih terang ikut jadi tinta." },
  siluet: { label: "Toleransi latar", min: 10, max: 200, hint: "Naikkan agar area pucat dianggap latar." },
  garis: { label: "Ambang tepi", min: 8, max: 160, hint: "Naikkan untuk garis yang lebih sedikit dan tegas." },
};

const NODE_WARNING = 1500;
const INK_WARNING = 0.55;

export default function ImageToVectorConverter({ onInsertSVG, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [loadingText, setLoadingText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [params, setParams] = useState<Params>(DEFAULT_PARAMS);
  const [useAi, setUseAi] = useState(false);
  const [source, setSource] = useState<RgbaImage | null>(null);
  // Hasil disimpan bersama masukan penghasilnya; "memperbarui" = masukan sekarang belum terproses.
  const [traced, setTraced] = useState<{ source: RgbaImage; params: Params; result: LogoTraceResult } | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const fileRef = useRef<File | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
    };
  }, [originalUrl]);

  /** Trace ulang (debounce) setiap piksel sumber atau parameter berubah. */
  useEffect(() => {
    if (!source) return;
    const id = setTimeout(() => {
      try {
        setTraced({ source, params, result: traceLogo(source, params) });
      } catch (err) {
        console.error(err);
        setErrorMsg(err instanceof Error ? err.message : "Gagal memproses gambar.");
        setPhase("error");
      }
    }, 120);
    return () => clearTimeout(id);
  }, [source, params]);

  const loadSource = useCallback(async (file: File, ai: boolean, firstLoad: boolean) => {
    setPhase("loading");
    setErrorMsg("");
    try {
      let blob: Blob = file;
      if (ai) {
        setLoadingText("Menyiapkan penghapus latar AI. Unduhan model hanya sekali.");
        // Dimuat saat dibutuhkan saja: paket ini besar dan tidak perlu untuk logo berlatar polos.
        const { removeBackground } = await import("@imgly/background-removal");
        blob = await removeBackground(file, {
          progress: (key: string, current: number, total: number) => {
            if (key.startsWith("fetch") && total > 0) {
              setLoadingText(`Mengunduh model AI ${Math.round((current / total) * 100)}%`);
            } else {
              setLoadingText("Menghapus latar dengan AI");
            }
          },
        });
      }

      setLoadingText("Membaca piksel gambar");
      const bitmap = await createImageBitmap(blob);
      const { width, height } = workingSize(bitmap.width, bitmap.height);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("Canvas tidak tersedia di peramban ini.");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, 0, 0, width, height);
      bitmap.close();
      const pixels = ctx.getImageData(0, 0, width, height);

      if (firstLoad) {
        setParams({ ...DEFAULT_PARAMS, mode: suggestMode(pixels) });
        setOriginalUrl(URL.createObjectURL(file));
      }
      setTraced(null);
      setSource(pixels);
      setPhase("ready");
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Gagal membaca gambar.");
      setPhase("error");
    }
  }, []);

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setErrorMsg("Format tidak didukung. Gunakan JPG, PNG, atau WebP.");
      setPhase("error");
      return;
    }
    fileRef.current = file;
    loadSource(file, useAi, true);
  };

  const toggleAi = (checked: boolean) => {
    setUseAi(checked);
    if (fileRef.current && phase === "ready") loadSource(fileRef.current, checked, false);
  };

  const patch = (p: Partial<Params>) => setParams((prev) => ({ ...prev, ...p }));

  const reset = () => {
    setPhase("idle");
    setSource(null);
    setTraced(null);
    setOriginalUrl(null);
    fileRef.current = null;
  };

  /** Disimpan ke aset pengguna hanya saat logo dipakai (bukan tiap geser slider). */
  const saveToSupabase = async (original: File, svg: string) => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const timestamp = Date.now();
      const safeName = original.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const svgPath = `${user.id}/vector_${timestamp}_${safeName}.svg`;
      const origPath = `${user.id}/orig_${timestamp}_${safeName}`;

      // Bucket 'user_assets' dibuat manual (lihat supabase/assets_schema.sql).
      const { error: svgError } = await supabase.storage
        .from("user_assets")
        .upload(svgPath, new Blob([svg], { type: "image/svg+xml" }));
      if (svgError) {
        console.error("Gagal mengunggah SVG ke storage:", svgError);
        await supabase.from("user_assets").insert({ user_id: user.id, name: original.name, vector_svg: svg });
        return;
      }

      await supabase.storage.from("user_assets").upload(origPath, original);
      await supabase
        .from("user_assets")
        .insert({ user_id: user.id, name: original.name, original_path: origPath, vector_svg: svg });
    } catch (e) {
      console.error("Gagal menyimpan aset ke Supabase:", e);
    }
  };

  const downloadSVG = () => {
    if (!result || result.empty) return;
    const url = URL.createObjectURL(new Blob([result.svg], { type: "image/svg+xml" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(fileRef.current?.name ?? "logo").replace(/\.[^.]+$/, "")}-vektor.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleInsert = () => {
    if (!result || result.empty) return;
    onInsertSVG(result.svg, { width: result.width, height: result.height });
    if (fileRef.current) saveToSupabase(fileRef.current, result.svg);
    onClose();
  };

  const result = traced?.result ?? null;
  const tracing = phase === "ready" && (!traced || traced.source !== source || traced.params !== params);
  const ui = THRESHOLD_UI[params.mode];
  const thresholdValue = params.threshold ?? result?.threshold ?? ui.min;
  const lineWidthValue = params.lineWidth ?? result?.lineWidth ?? 4;
  const warning = !result
    ? null
    : result.empty
      ? "Tidak ada bentuk yang terdeteksi. Turunkan batas, coba mode Siluet, atau aktifkan Balik terang/gelap."
      : result.inkRatio > INK_WARNING
        ? "Hampir seluruh area jadi tinta. Coba Balik terang/gelap atau mode Garis tepi."
        : result.nodes > NODE_WARNING
          ? `Hasil sangat rapat (${result.nodes} titik) dan sulit dicetak. Naikkan Pembersih bintik atau pilih mode Siluet.`
          : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tracing logo ke vektor"
        className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <IconButton onClick={onClose} className="absolute right-3 top-3" title="Tutup">
          <X size={18} />
        </IconButton>

        <div className="border-b border-stone-200 p-5 pr-14">
          <h2 className="flex items-center gap-2 text-lg font-bold text-stone-900">
            <Wand2 className="text-brand-600" size={20} /> Tracing logo ke vektor
          </h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-stone-500">
            Ubah logo berwarna (JPG/PNG) menjadi vektor satu tinta untuk klise foil atau sablon. Diproses di perangkat
            Anda, tidak diunggah.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {phase === "idle" && (
            <div className="p-5">
              <label
                className="flex h-56 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 text-center transition hover:border-brand-500 hover:bg-stone-50 focus-within:border-brand-500"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  pickFile(e.dataTransfer.files[0]);
                }}
              >
                <Upload className="mb-2 h-8 w-8 text-stone-400" />
                <span className="text-sm font-semibold text-stone-700">Pilih atau seret logo ke sini</span>
                <span className="mt-1 max-w-xs text-xs text-stone-500">
                  JPG, PNG, atau WebP. Hasil paling bersih dari logo berlatar polos.
                </span>
                <input
                  type="file"
                  className="sr-only"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    pickFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              <AiToggle checked={useAi} onChange={setUseAi} className="mt-4" />
            </div>
          )}

          {phase === "loading" && (
            <div className="flex h-56 flex-col items-center justify-center p-5" role="status">
              <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
              <p className="text-sm font-semibold text-stone-700">{loadingText || "Memproses"}</p>
              <p className="mt-1 text-xs text-stone-400">Proses berjalan di perangkat Anda.</p>
            </div>
          )}

          {phase === "error" && (
            <div className="flex h-56 flex-col items-center justify-center p-5 text-center" role="alert">
              <X className="mb-2 h-9 w-9 text-rose-500" />
              <p className="max-w-sm text-sm font-semibold text-rose-600">{errorMsg}</p>
              <Button variant="secondary" size="sm" className="mt-4" onClick={reset}>
                Pilih gambar lain
              </Button>
            </div>
          )}

          {phase === "ready" && (
            <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_300px]">
              <div>
                <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-white p-6">
                  {result && !result.empty ? (
                    <div
                      className="h-full w-full [&>svg]:h-full [&>svg]:w-full"
                      aria-label="Pratinjau hasil vektor"
                      role="img"
                      dangerouslySetInnerHTML={{ __html: result.svg }}
                    />
                  ) : (
                    <p className="max-w-xs text-center text-sm text-stone-400">
                      {result?.empty ? "Belum ada bentuk yang terdeteksi." : "Membuat pratinjau"}
                    </p>
                  )}
                  {originalUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={originalUrl}
                      alt="Gambar asli"
                      className="absolute left-2 top-2 h-16 w-16 rounded-lg border border-stone-200 bg-stone-50 object-contain"
                    />
                  )}
                  {tracing && (
                    <span className="absolute bottom-2 right-2 rounded-full bg-stone-900/80 px-2.5 py-1 text-[11px] font-medium text-white">
                      Memperbarui
                    </span>
                  )}
                </div>
                {warning && (
                  <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-800" role="status">
                    <TriangleAlert size={14} className="mt-0.5 shrink-0" />
                    {warning}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-5 text-xs">
                <fieldset>
                  <legend className="mb-2 text-sm font-semibold text-stone-800">Gaya hasil</legend>
                  <div role="radiogroup" className="flex flex-col gap-1.5">
                    {MODES.map((m) => {
                      const on = params.mode === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => patch({ mode: m.id, threshold: null })}
                          className={cn(
                            "rounded-xl border px-3 py-2 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
                            on ? "border-brand-600 bg-brand-50" : "border-stone-200 hover:border-stone-300 hover:bg-stone-50"
                          )}
                        >
                          <span className="block text-[13px] font-semibold text-stone-900">{m.title}</span>
                          <span className="mt-0.5 block leading-snug text-stone-500">{m.hint}</span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <Slider
                  id="trace-threshold"
                  label={ui.label}
                  hint={ui.hint}
                  value={thresholdValue}
                  min={ui.min}
                  max={ui.max}
                  onChange={(v) => patch({ threshold: v })}
                  action={
                    params.threshold !== null && (
                      <button
                        type="button"
                        onClick={() => patch({ threshold: null })}
                        className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline"
                      >
                        <RotateCcw size={11} /> Otomatis
                      </button>
                    )
                  }
                />
                {params.mode === "garis" && (
                  <Slider
                    id="trace-line"
                    label="Tebal garis"
                    hint="Garis di bawah ±0,2 mm pada ukuran cetak sulit dikliseh."
                    value={lineWidthValue}
                    min={1}
                    max={14}
                    onChange={(v) => patch({ lineWidth: v })}
                  />
                )}
                <Slider
                  id="trace-speckle"
                  label="Pembersih bintik"
                  hint="Membuang noda dan lubang kecil. Naikkan bila hasil terlalu rapat."
                  value={params.speckle}
                  min={0}
                  max={80}
                  onChange={(v) => patch({ speckle: v })}
                />
                <Slider
                  id="trace-smooth"
                  label="Peredam derau"
                  hint="Meredam bintik kompresi JPG. Turunkan untuk teks sangat kecil."
                  value={params.smooth}
                  min={0}
                  max={3}
                  onChange={(v) => patch({ smooth: v })}
                />

                <div className="flex flex-col gap-3">
                  {params.mode === "detail" && (
                    <label className="flex cursor-pointer items-start gap-2">
                      <input
                        type="checkbox"
                        checked={params.invert}
                        onChange={(e) => patch({ invert: e.target.checked })}
                        className="mt-0.5 accent-brand-600"
                      />
                      <span>
                        <span className="block font-semibold text-stone-700">Balik terang/gelap</span>
                        <span className="text-stone-500">Pakai bila yang jadi tinta justru latar atau bagian pucat.</span>
                      </span>
                    </label>
                  )}
                  <AiToggle checked={useAi} onChange={toggleAi} />
                </div>
              </div>
            </div>
          )}
        </div>

        {phase === "ready" && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 bg-stone-50 px-5 py-3">
            <div className="flex items-center gap-3 text-xs text-stone-500">
              <Button variant="ghost" size="sm" onClick={reset}>
                Ganti gambar
              </Button>
              {result && !result.empty && (
                <span>
                  {result.nodes} titik kurva, {Math.max(1, Math.round(result.svg.length / 1024))} KB
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={downloadSVG} disabled={!result || result.empty}>
                <Download size={14} /> Unduh SVG
              </Button>
              <Button variant="primary" size="sm" onClick={handleInsert} disabled={!result || result.empty || tracing}>
                <Save size={14} /> Gunakan di kanvas
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Slider({
  id,
  label,
  hint,
  value,
  min,
  max,
  onChange,
  action,
}: {
  id: string;
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  action?: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-semibold text-stone-800">
          {label}
        </label>
        <span className="flex items-center gap-2">
          {action}
          <span className="tabular-nums text-stone-500">{value}</span>
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full accent-brand-600"
      />
      <p className="mt-0.5 leading-snug text-stone-500">{hint}</p>
    </div>
  );
}

function AiToggle({
  checked,
  onChange,
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  className?: string;
}) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-2 text-xs", className)}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 accent-brand-600"
      />
      <span>
        <span className="block font-semibold text-stone-700">Hapus latar dengan AI</span>
        <span className="text-stone-500">
          Untuk foto atau latar rumit. Mengunduh model sekitar 80 MB saat pertama dipakai dan lebih lambat.
        </span>
      </span>
    </label>
  );
}
