import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { parseBatchCsv, buildBatchCover, runBatch, type BatchOptions } from "../batch";
import { preflightSummary } from "../preflight";
import { zipStore } from "../zip";

/** Mock CanvasRenderingContext2D: tiap karakter selebar fontSize*0.5 px. */
function makeMockCtx() {
  let font = "";
  return {
    set font(v: string) { font = v; },
    get font() { return font; },
    measureText: (text: string) => {
      const m = font.match(/(\d+(?:\.\d+)?)px/);
      const size = m ? parseFloat(m[1]) : 16;
      return { width: text.length * size * 0.5 } as TextMetrics;
    },
  } as unknown as CanvasRenderingContext2D;
}

const OPTS: BatchOptions = { templateId: "klasik", printSize: "Size A (23x34cm)", defaultMockup: "Rapor SD" };
const HEADER = "judulRapor,namaSekolah,alamatSekolah,subInformasi,mockupType\n";
const SAMPLE = readFileSync(path.resolve(__dirname, "../../public/contoh-batch.csv"), "utf8");

/** Ukuran halaman PDF (mm) dari /MediaBox. */
function pdfPageMm(pdf: Uint8Array): [number, number] {
  const m = Buffer.from(pdf).toString("latin1").match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/);
  if (!m) throw new Error("MediaBox tidak ditemukan");
  return [(parseFloat(m[1]) * 25.4) / 72, (parseFloat(m[2]) * 25.4) / 72];
}

describe("parseBatchCsv", () => {
  it("membaca CSV contoh: 3 sekolah, koma di dalam kutip, mockupType", () => {
    const r = parseBatchCsv(SAMPLE);
    expect(r.fatal).toBeUndefined();
    expect(r.errors).toEqual([]);
    expect(r.rows.map((x) => x.data.namaSekolah)).toEqual(["SMKN 2 Karanganyar", "SD Negeri 1 Wonosari", "MAN 1 Surakarta"]);
    expect(r.rows[0].data.alamatSekolah).toBe("Jl. Yos Sudarso, Kayangan, Bejen, Karanganyar");
    expect(r.rows.map((x) => x.mockupType)).toEqual(["Rapor SMA/SMK", "Rapor SD", "Rapor MAN"]);
    expect(r.rows.map((x) => x.rowNumber)).toEqual([2, 3, 4]);
  });

  it("header tak lengkap -> fatal menyebut kolom yang hilang", () => {
    const r = parseBatchCsv("judulRapor,namaSekolah\nRapor,SMA 1\n");
    expect(r.rows).toEqual([]);
    expect(r.fatal).toContain("alamatSekolah");
    expect(r.fatal).toContain("subInformasi");
  });

  it("header toleran huruf besar/kecil, spasi, dan garis bawah; mockupType opsional", () => {
    const r = parseBatchCsv("Judul Rapor;NAMA_SEKOLAH;alamat sekolah;Sub-Informasi\nRapor;SMA 1;Jl. A, No. 1;NPSN 1\n");
    expect(r.fatal).toBeUndefined();
    expect(r.rows[0].data).toEqual({ judulRapor: "Rapor", namaSekolah: "SMA 1", alamatSekolah: "Jl. A, No. 1", subInformasi: "NPSN 1" });
    expect(r.rows[0].mockupType).toBeUndefined();
  });

  it("file kosong dan kutip tak tertutup -> fatal", () => {
    expect(parseBatchCsv("  \n\n").fatal).toBeTruthy();
    expect(parseBatchCsv(HEADER + 'R,"SMA 1,Jl. A,N,Rapor SD\n').fatal).toContain("kutip");
  });

  it("baris bermasalah masuk errors dengan nomor baris spreadsheet; baris lain tetap jalan", () => {
    const csv =
      HEADER +
      "R,SMA 1,Jl. A,NPSN 1,Rapor SD\n" + // baris 2: valid
      "\n" + // baris 3: kosong, dilewati
      "R,,Jl. B,NPSN 2,Rapor SD\n" + // baris 4: namaSekolah kosong
      "R,SMA 3,Jl. C,NPSN 3,Rapor XYZ\n" + // baris 5: mockupType tidak dikenal
      "R,SMA 4,Jl. D, No. 4,NPSN 4,Rapor SD\n" + // baris 6: koma tanpa kutip -> kolom melebihi header
      "R,SMA 5,Jl. E,NPSN 5,rapor man\n"; // baris 7: valid, huruf kecil
    const r = parseBatchCsv(csv);
    expect(r.rows.map((x) => x.rowNumber)).toEqual([2, 7]);
    expect(r.rows[1].mockupType).toBe("Rapor MAN");
    expect(r.errors.map((e) => e.rowNumber)).toEqual([4, 5, 6]);
    expect(r.errors[0].message).toContain("namaSekolah");
    expect(r.errors[1].message).toContain("mockupType");
    expect(r.errors[2].message).toContain("kutip");
  });

  it("kolom kosong dicatat di notes", () => {
    const r = parseBatchCsv(HEADER + ",SMA 1,,,\n");
    expect(r.rows[0].notes).toHaveLength(3);
  });
});

describe("buildBatchCover / runBatch", () => {
  it("alamat & sub informasi kosong dihilangkan, bukan diganti placeholder", () => {
    const { rows } = parseBatchCsv(HEADER + "Rapor,SMA 1,,,\n");
    const cover = buildBatchCover(rows[0], OPTS, makeMockCtx());
    expect(cover.svg).toContain("SMA 1");
    expect(cover.svg).not.toContain("Alamat Sekolah");
    expect(cover.svg).not.toContain("Keterangan Tambahan");
  });

  it("mockupType per baris menentukan ikon logo; baris tanpa nilai memakai default", () => {
    const { rows } = parseBatchCsv(HEADER + "R,SMA 1,A,B,Rapor MAN\nR,SMA 2,A,B,\n");
    const [man, def] = rows.map((r) => buildBatchCover(r, OPTS, makeMockCtx()));
    const icon = (c: typeof man) => c.project.elements.find((e) => e.type === "logo")?.logoIcon;
    expect(icon(man)).toBe("building");
    expect(icon(def)).toBe("shield");
  });

  it("CSV contoh 3 sekolah -> 3 PDF berukuran halaman 230x340 mm + 3 SVG di ZIP", async () => {
    const { rows } = parseBatchCsv(SAMPLE);
    const progress: number[] = [];
    const covers = await runBatch(rows, OPTS, makeMockCtx(), (done) => progress.push(done));
    expect(progress).toEqual([1, 2, 3]);
    expect(covers).toHaveLength(3);

    for (const c of covers) {
      const [w, h] = pdfPageMm(c.pdf);
      expect(w).toBeCloseTo(230, 0);
      expect(h).toBeCloseTo(340, 0);
      expect(Buffer.from(c.pdf).subarray(0, 4).toString()).toBe("%PDF");
      expect(c.svg).toContain('viewBox="0 0 230 340"');
      expect(preflightSummary(c.issues).errors).toBe(0);
    }

    const names = covers.flatMap((c) => [`${c.fileBase}.pdf`, `${c.fileBase}.svg`]);
    expect(new Set(names).size).toBe(6);
    expect(names[0]).toBe("002_SMKN_2_Karanganyar.pdf");

    const zip = zipStore(covers.flatMap((c) => [
      { name: `${c.fileBase}.pdf`, data: c.pdf },
      { name: `${c.fileBase}.svg`, data: new TextEncoder().encode(c.svg) },
    ]));
    const v = new DataView(zip.buffer);
    expect(v.getUint16(zip.length - 22 + 10, true)).toBe(6);
  });

  it("Size B -> halaman 170x230 mm", async () => {
    const { rows } = parseBatchCsv(SAMPLE);
    const [c] = await runBatch(rows.slice(0, 1), { ...OPTS, printSize: "Size B (17x23cm)" }, makeMockCtx());
    const [w, h] = pdfPageMm(c.pdf);
    expect(w).toBeCloseTo(170, 0);
    expect(h).toBeCloseTo(230, 0);
  });

  it("nama berkas aman: karakter terlarang diganti, nama kosong punya cadangan", () => {
    const { rows } = parseBatchCsv(HEADER + 'R,"SMA ""A"" / B: 1",A,B,\nR,///,A,B,\n');
    const [a, b] = rows.map((r) => buildBatchCover(r, OPTS, makeMockCtx()));
    expect(a.fileBase).toBe("002_SMA_A_B_1");
    expect(b.fileBase).toBe("003_sekolah");
  });
});
