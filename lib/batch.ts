import type { DesignProject, MockupType, PrintSize, SchoolFieldKey } from "./types";
import { MOCKUP_TYPES } from "./types";
import { parseCsv } from "./csv";
import { buildTemplatePreviewProject } from "./templates";
import { buildScene, sceneToPdf, sceneToSvg, type VectorScene } from "./vectorExport";
import { runPreflight, type PreflightIssue } from "./preflight";

/**
 * Batch sampul: satu baris CSV = satu sekolah = satu sampul. Murni (tanpa
 * DOM) kecuali konteks Canvas 2D untuk pengukuran teks yang dikirim pemanggil.
 * Memakai ulang template, ekspor vektor, dan cek siap cetak yang sama dengan
 * alur satu-sekolah, jadi hasil batch identik dengan ekspor dari editor.
 */

/** Kolom wajib di header CSV. `mockupType` opsional. */
export const BATCH_COLUMNS: readonly SchoolFieldKey[] = ["judulRapor", "namaSekolah", "alamatSekolah", "subInformasi"];

export interface BatchRow {
  /** Nomor baris di spreadsheet (header = 1). */
  rowNumber: number;
  data: Record<SchoolFieldKey, string>;
  mockupType?: MockupType;
  /** Hal yang diputuskan otomatis, mis. field kosong dihilangkan. */
  notes: string[];
}

export interface BatchRowError {
  rowNumber: number;
  message: string;
}

export interface BatchParse {
  rows: BatchRow[];
  errors: BatchRowError[];
  /** Kesalahan tingkat file (header tak lengkap, kutip tak tertutup, kosong). */
  fatal?: string;
}

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const isBlank = (r: string[]) => r.every((c) => !c.trim());

/** Baca CSV sekolah + validasi per baris. Baris bermasalah masuk `errors`, tidak menghentikan baris lain. */
export function parseBatchCsv(text: string): BatchParse {
  const { rows: records, unclosedQuote } = parseCsv(text);
  const headerAt = records.findIndex((r) => !isBlank(r));
  if (headerAt < 0) return { rows: [], errors: [], fatal: "File CSV kosong." };

  const header = records[headerAt].map(normalize);
  const colOf = (key: string) => header.indexOf(normalize(key));
  const missing = BATCH_COLUMNS.filter((k) => colOf(k) < 0);
  if (missing.length > 0) {
    return { rows: [], errors: [], fatal: `Kolom wajib tidak ada di header: ${missing.join(", ")}.` };
  }
  if (unclosedQuote) {
    return { rows: [], errors: [], fatal: 'Ada tanda kutip (") yang tidak ditutup. Periksa isi file.' };
  }

  const rows: BatchRow[] = [];
  const errors: BatchRowError[] = [];

  records.slice(headerAt + 1).forEach((cells, i) => {
    if (isBlank(cells)) return;
    const rowNumber = headerAt + 2 + i;
    const fail = (message: string) => errors.push({ rowNumber, message });

    // Koma tanpa kutip di dalam teks (mis. alamat) menggeser kolom setelahnya.
    if (cells.slice(header.length).some((c) => c.trim())) {
      return fail(
        `Jumlah kolom (${cells.length}) melebihi header (${header.length}). Beri tanda kutip ("...") pada teks yang berisi koma.`
      );
    }

    const get = (key: string) => (cells[colOf(key)] ?? "").trim();
    const data = Object.fromEntries(BATCH_COLUMNS.map((k) => [k, get(k)])) as Record<SchoolFieldKey, string>;
    if (!data.namaSekolah) return fail("namaSekolah kosong.");

    let mockupType: MockupType | undefined;
    const rawMockup = colOf("mockupType") >= 0 ? get("mockupType") : "";
    if (rawMockup) {
      mockupType = MOCKUP_TYPES.find((m) => m.toLowerCase() === rawMockup.toLowerCase());
      if (!mockupType) return fail(`mockupType "${rawMockup}" tidak dikenal. Pilihan: ${MOCKUP_TYPES.join(", ")}.`);
    }

    const notes: string[] = [];
    if (!data.judulRapor) notes.push("judulRapor kosong: memakai judul bawaan.");
    if (!data.alamatSekolah) notes.push("alamatSekolah kosong: teks alamat dihilangkan.");
    if (!data.subInformasi) notes.push("subInformasi kosong: teks sub informasi dihilangkan.");
    rows.push({ rowNumber, data, mockupType, notes });
  });

  return { rows, errors };
}

export interface BatchOptions {
  templateId: string;
  printSize: PrintSize;
  /** Dipakai untuk baris tanpa nilai `mockupType`. */
  defaultMockup: MockupType;
}

export interface BatchCover {
  row: BatchRow;
  /** Nama berkas tanpa ekstensi; awalan nomor baris menjamin unik. */
  fileBase: string;
  project: DesignProject;
  scene: VectorScene;
  issues: PreflightIssue[];
  pdf: Uint8Array;
  svg: string;
}

function fileBaseFor(row: BatchRow): string {
  const slug = row.data.namaSekolah.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);
  return `${String(row.rowNumber).padStart(3, "0")}_${slug || "sekolah"}`;
}

/** Satu baris -> proyek, scene vektor, hasil cek siap cetak, dan byte PDF/SVG. */
export function buildBatchCover(row: BatchRow, opts: BatchOptions, ctx: CanvasRenderingContext2D): BatchCover {
  const project = buildTemplatePreviewProject(opts.templateId, {
    data: row.data,
    mockupType: row.mockupType ?? opts.defaultMockup,
    printSize: opts.printSize,
  });
  // bindText mengganti nilai kosong dengan placeholder ("Alamat Sekolah"); jangan sampai tercetak.
  const dropped = (["alamatSekolah", "subInformasi"] as SchoolFieldKey[]).filter((k) => !row.data[k]);
  project.elements = project.elements.filter((el) => !(el.bind && dropped.includes(el.bind)));
  project.name = row.data.namaSekolah;

  const scene = buildScene(project, ctx);
  return {
    row,
    fileBase: fileBaseFor(row),
    project,
    scene,
    issues: runPreflight(project),
    pdf: new Uint8Array(sceneToPdf(scene, project.name).output("arraybuffer")),
    svg: sceneToSvg(scene),
  };
}

/**
 * Bangun semua sampul bertahap: menyerahkan giliran ke event loop setelah
 * tiap baris supaya UI tidak membeku untuk puluhan sekolah.
 */
export async function runBatch(
  rows: BatchRow[],
  opts: BatchOptions,
  ctx: CanvasRenderingContext2D,
  onProgress?: (done: number, total: number) => void
): Promise<BatchCover[]> {
  const covers: BatchCover[] = [];
  for (const row of rows) {
    covers.push(buildBatchCover(row, opts, ctx));
    onProgress?.(covers.length, rows.length);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  return covers;
}
