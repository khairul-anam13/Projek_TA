"use client";

import { useMemo, useRef, useState } from "react";
import { Download, FileSpreadsheet, FileUp, Loader2 } from "lucide-react";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { cn } from "@/lib/utils";
import { MOCKUP_TYPES, type MockupType, type PrintSize } from "@/lib/types";
import { COVER_TEMPLATES, DEFAULT_TEMPLATE_ID } from "@/lib/templates";
import { BATCH_COLUMNS, parseBatchCsv, runBatch, type BatchCover, type BatchParse } from "@/lib/batch";
import { preflightSummary } from "@/lib/preflight";
import { zipStore } from "@/lib/zip";

const PRINT_SIZES: { value: PrintSize; label: string; note: string; code: string }[] = [
  { value: "Size A (23x34cm)", label: "Ukuran A", note: "23 × 34 cm", code: "A" },
  { value: "Size B (17x23cm)", label: "Ukuran B", note: "17 × 23 cm", code: "B" },
];

const fieldClass =
  "w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-sm text-stone-800 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

interface TableItem {
  rowNumber: number;
  school: string;
  cover?: BatchCover;
  notes: string[];
  error?: string;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function BatchPage({ onBack }: { onBack: () => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<BatchParse | null>(null);
  const [templateId, setTemplateId] = useState(DEFAULT_TEMPLATE_ID);
  const [printSize, setPrintSize] = useState<PrintSize>("Size A (23x34cm)");
  const [defaultMockup, setDefaultMockup] = useState<MockupType>("Rapor SD");
  const [covers, setCovers] = useState<BatchCover[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [failure, setFailure] = useState("");

  const running = progress !== null;
  const rows = parsed?.rows ?? [];

  // Opsi berubah -> hasil lama tidak lagi sesuai; minta buat ulang.
  const changeOption = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setCovers([]);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    setParsed(parseBatchCsv(await file.text()));
    setCovers([]);
    setFailure("");
  };

  const handleGenerate = async () => {
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) {
      setFailure("Browser tidak mendukung Canvas 2D.");
      return;
    }
    setFailure("");
    setProgress({ done: 0, total: rows.length });
    try {
      setCovers(
        await runBatch(rows, { templateId, printSize, defaultMockup }, ctx, (done, total) =>
          setProgress({ done, total })
        )
      );
    } catch (e) {
      setFailure(`Gagal membuat sampul: ${e instanceof Error ? e.message : "kesalahan tak dikenal"}.`);
    } finally {
      setProgress(null);
    }
  };

  const handleDownload = () => {
    const enc = new TextEncoder();
    const zip = zipStore(
      covers.flatMap((c) => [
        { name: `${c.fileBase}.pdf`, data: c.pdf },
        { name: `${c.fileBase}.svg`, data: enc.encode(c.svg) },
      ])
    );
    const sizeCode = PRINT_SIZES.find((s) => s.value === printSize)?.code ?? "";
    triggerDownload(
      new Blob([zip as BlobPart], { type: "application/zip" }),
      `PageFree-batch-${templateId}-${sizeCode}.zip`
    );
  };

  const items = useMemo<TableItem[]>(() => {
    if (!parsed) return [];
    const coverOf = new Map(covers.map((c) => [c.row.rowNumber, c]));
    return [
      ...parsed.rows.map((r) => ({
        rowNumber: r.rowNumber,
        school: r.data.namaSekolah,
        cover: coverOf.get(r.rowNumber),
        notes: r.notes,
      })),
      ...parsed.errors.map((e) => ({ rowNumber: e.rowNumber, school: "—", notes: [], error: e.message })),
    ].sort((a, b) => a.rowNumber - b.rowNumber);
  }, [parsed, covers]);

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <PageHeader onBack={onBack} backLabel="Kembali" title="Batch Sampul" subtitle="CSV ke ZIP PDF/SVG vektor" />

      <main className="max-w-5xl w-full mx-auto px-5 py-8 space-y-6">
        <Card className="p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              aria-label="Berkas CSV sekolah"
              onChange={(e) => {
                void handleFile(e.target.files?.[0]);
                e.target.value = ""; // izinkan memilih berkas yang sama lagi
              }}
            />
            <Button variant="secondary" onClick={() => fileInput.current?.click()} disabled={running}>
              <FileUp className="w-4 h-4" />
              {fileName ? "Ganti CSV" : "Pilih berkas CSV"}
            </Button>
            {fileName && (
              <span className="flex items-center gap-1.5 text-sm text-stone-600 min-w-0">
                <FileSpreadsheet className="w-4 h-4 shrink-0 text-stone-400" />
                <span className="truncate">{fileName}</span>
              </span>
            )}
            <a
              href="/contoh-batch.csv"
              download
              className="text-sm text-brand-600 hover:text-brand-700 underline underline-offset-2 sm:ml-auto"
            >
              Unduh contoh CSV
            </a>
          </div>
          <p className="text-xs text-stone-500 leading-relaxed">
            Kolom wajib: {BATCH_COLUMNS.join(", ")}. Kolom opsional: mockupType ({MOCKUP_TYPES.join(", ")}). Satu baris
            = satu sekolah. Beri tanda kutip pada teks yang berisi koma.
          </p>
          {parsed?.fatal && (
            <p role="alert" className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
              {parsed.fatal}
            </p>
          )}
        </Card>

        <Card className="p-6 grid gap-5 md:grid-cols-3">
          <div>
            <label htmlFor="batch-template" className="text-xs font-medium text-stone-500 mb-1.5 block">
              Template
            </label>
            <select
              id="batch-template"
              className={fieldClass}
              value={templateId}
              disabled={running}
              onChange={(e) => changeOption(setTemplateId)(e.target.value)}
            >
              {COVER_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nama} ({t.gaya})
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="text-xs font-medium text-stone-500 mb-1.5 block">Ukuran</span>
            <div className="grid grid-cols-2 gap-2">
              {PRINT_SIZES.map((size) => (
                <button
                  key={size.value}
                  type="button"
                  disabled={running}
                  onClick={() => changeOption(setPrintSize)(size.value)}
                  className={cn(
                    "px-3 py-2 rounded-xl border-2 cursor-pointer transition text-center disabled:cursor-not-allowed",
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

          <div>
            <label htmlFor="batch-mockup" className="text-xs font-medium text-stone-500 mb-1.5 block">
              Jenis rapor bila kolom mockupType kosong
            </label>
            <select
              id="batch-mockup"
              className={fieldClass}
              value={defaultMockup}
              disabled={running}
              onChange={(e) => changeOption(setDefaultMockup)(e.target.value as MockupType)}
            >
              {MOCKUP_TYPES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleGenerate} disabled={rows.length === 0 || running}>
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {running ? `Membuat ${progress.done}/${progress.total}…` : `Buat ${rows.length} sampul`}
          </Button>
          <Button variant="secondary" onClick={handleDownload} disabled={covers.length === 0 || running}>
            <Download className="w-4 h-4" />
            Unduh ZIP ({covers.length} PDF + {covers.length} SVG)
          </Button>
          {failure && (
            <p role="alert" className="text-sm text-rose-600">
              {failure}
            </p>
          )}
        </div>

        {items.length > 0 && (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-stone-500 border-b border-stone-200">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium w-16">
                    Baris
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Sekolah
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Cek siap cetak
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <ResultRow key={item.rowNumber} item={item} />
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </main>
    </div>
  );
}

function ResultRow({ item }: { item: TableItem }) {
  const { cover, error, notes } = item;
  const summary = cover ? preflightSummary(cover.issues) : null;
  const details = [...(error ? [error] : []), ...(cover?.issues.map((i) => i.message) ?? []), ...notes];

  return (
    <tr className="border-b border-stone-100 last:border-0 align-top">
      <td className="px-4 py-3 text-stone-400 tabular-nums">{item.rowNumber}</td>
      <td className="px-4 py-3 font-medium text-stone-800">{item.school}</td>
      <td className="px-4 py-3 space-y-1.5">
        {error ? (
          <Badge status="danger">Dilewati</Badge>
        ) : !summary ? (
          <Badge>Belum dibuat</Badge>
        ) : summary.errors > 0 ? (
          <Badge status="danger">{summary.errors} error</Badge>
        ) : summary.warnings > 0 ? (
          <Badge status="warning">{summary.warnings} peringatan</Badge>
        ) : (
          <Badge status="success">Siap cetak</Badge>
        )}
        {details.length > 0 && (
          <ul className="text-xs text-stone-500 space-y-0.5">
            {details.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        )}
      </td>
    </tr>
  );
}
