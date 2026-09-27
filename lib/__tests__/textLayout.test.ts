import { describe, it, expect } from "vitest";
import {
  scaledInitialFontSize,
  computeFitFontSize,
  computeFitLayout,
  fitTextInBox,
  wrapTextToLines,
  BASE_CANVAS_WIDTH_PX,
  type BoundingBox,
} from "../textLayout";

/** Mock CanvasRenderingContext2D: setiap karakter selebar fontSize*factor px — cukup untuk menguji logika wrap/shrink tanpa jsdom/canvas asli. */
function makeMockCtx(charWidthFactor = 0.6) {
  let font = "";
  return {
    set font(v: string) { font = v; },
    get font() { return font; },
    measureText: (text: string) => {
      const m = font.match(/(\d+(?:\.\d+)?)px/);
      const size = m ? parseFloat(m[1]) : 16;
      return { width: text.length * size * charWidthFactor } as TextMetrics;
    },
  } as unknown as CanvasRenderingContext2D;
}

/** Oracle independen: scan linear 1px demi 1px (algoritma LAMA sebelum dioptimasi jadi binary search di fitTextInBox). */
function linearFit(
  ctx: CanvasRenderingContext2D,
  text: string,
  box: BoundingBox,
  initialFontSize: number,
  fontFamily: string,
  fontWeight: string
) {
  const MIN_FONT_SIZE = 6;
  let fontSize = Math.max(initialFontSize, MIN_FONT_SIZE);
  while (true) {
    const lineHeight = fontSize * 1.35;
    const lines = wrapTextToLines(ctx, text, box.width, fontSize, fontFamily, fontWeight);
    if (lines.length * lineHeight <= box.height || fontSize <= MIN_FONT_SIZE) {
      return { lines, fontSize };
    }
    fontSize -= 1;
  }
}

describe("scaledInitialFontSize (konsistensi ukuran teks editor vs preview vs ekspor)", () => {
  it("pada lebar kanvas dasar (400px), hasilnya sama seperti sebelum ada scaling", () => {
    expect(scaledInitialFontSize(43, BASE_CANVAS_WIDTH_PX)).toBeCloseTo(43 * 1.5, 5);
  });

  it("elemen fontSize sama menghasilkan initial size yang proporsional di kanvas 4x lebih besar (mis. ekspor 1600px vs editor 400px)", () => {
    const editor = scaledInitialFontSize(33, 400);
    const exportSize = scaledInitialFontSize(33, 1600);
    expect(exportSize).toBeCloseTo(editor * 4, 5);
  });

  it("kanvas preview yang lebih kecil dari baseline menghasilkan initial size yang lebih kecil secara proporsional", () => {
    const editor = scaledInitialFontSize(23, 400);
    const previewFlat = scaledInitialFontSize(23, 280);
    expect(previewFlat).toBeCloseTo(editor * (280 / 400), 5);
  });

  it("fontSize kosong/undefined memakai fallback sebelum discaling", () => {
    expect(scaledInitialFontSize(undefined, 400, 16)).toBeCloseTo(16, 5);
    expect(scaledInitialFontSize(undefined, 800, 16)).toBeCloseTo(32, 5);
  });

  it("canvasWidthPx nol/negatif tidak menghasilkan skala tak-terhingga atau NaN (fallback skala 1)", () => {
    expect(Number.isFinite(scaledInitialFontSize(20, 0))).toBe(true);
    expect(scaledInitialFontSize(20, 0)).toBeCloseTo(20 * 1.5, 5);
  });
});

describe("computeFitFontSize aman dipanggil saat server-side render (lingkungan test ini = Node, tanpa `document`)", () => {
  // vitest.config.ts memakai environment: "node" (bukan jsdom) justru untuk
  // menangkap regresi ini — sebelum ada guard `typeof document === "undefined"`,
  // pemanggilan ini akan throw persis seperti yang bikin `next build` crash
  // saat prerender /qa-test (CanvasFitText -> computeFitFontSize dipanggil
  // dari useMemo, yang juga jalan di server render).
  it("mengembalikan initialFontSize apa adanya, bukan throw, saat `document` tidak ada", () => {
    expect(() => computeFitFontSize("NAMA SEKOLAH", 300, 60, 43, "Times New Roman", "bold")).not.toThrow();
    expect(computeFitFontSize("NAMA SEKOLAH", 300, 60, 43, "Times New Roman", "bold")).toBe(43);
  });

  it("tetap mengembalikan initialFontSize untuk teks kosong (jalur guard yang sudah ada)", () => {
    expect(computeFitFontSize("", 300, 60, 43, "Times New Roman", "bold")).toBe(43);
  });
});

describe("computeFitLayout (dipakai CanvasFitText untuk merender baris PERSIS sama seperti drawTextInBox, tanpa word-wrap browser)", () => {
  it("SSR (tanpa `document`): fontSize apa adanya, lines kosong — bukan throw", () => {
    expect(() => computeFitLayout("NAMA SEKOLAH", 300, 60, 43, "Times New Roman", "bold")).not.toThrow();
    expect(computeFitLayout("NAMA SEKOLAH", 300, 60, 43, "Times New Roman", "bold")).toEqual({
      lines: [],
      fontSize: 43,
    });
  });

  it("teks kosong: lines kosong, fontSize apa adanya", () => {
    expect(computeFitLayout("", 300, 60, 43, "Times New Roman", "bold")).toEqual({ lines: [], fontSize: 43 });
  });

  it("computeFitFontSize (deprecated) tetap konsisten dengan .fontSize dari computeFitLayout", () => {
    expect(computeFitFontSize("NAMA SEKOLAH", 300, 60, 43, "Times New Roman", "bold")).toBe(
      computeFitLayout("NAMA SEKOLAH", 300, 60, 43, "Times New Roman", "bold").fontSize
    );
  });
});

describe("fitTextInBox: shrink binary search menghasilkan hasil IDENTIK dengan linear scan lama (dioptimasi demi responsivitas zoom/resize, bukan perilaku)", () => {
  const cases: { name: string; text: string; box: BoundingBox; initialFontSize: number }[] = [
    { name: "muat langsung di initialFontSize (k=0)", text: "Judul", box: { x: 0, y: 0, width: 500, height: 200 }, initialFontSize: 40 },
    { name: "perlu beberapa langkah shrink", text: "Alamat Sekolah Yang Cukup Panjang Untuk Butuh Wrap", box: { x: 0, y: 0, width: 150, height: 60 }, initialFontSize: 40 },
    { name: "initialFontSize besar (kanvas ekspor resolusi tinggi)", text: "SMKN 2 KARANGANYAR", box: { x: 0, y: 0, width: 300, height: 80 }, initialFontSize: 260 },
    { name: "tidak pernah muat bahkan di MIN_FONT_SIZE", text: "Teks sangat panjang sekali yang tidak akan pernah muat di kotak sekecil ini apapun yang terjadi", box: { x: 0, y: 0, width: 40, height: 10 }, initialFontSize: 50 },
    { name: "initialFontSize sudah di bawah MIN_FONT_SIZE", text: "Kecil", box: { x: 0, y: 0, width: 100, height: 100 }, initialFontSize: 3 },
    { name: "satu kata tunggal lebih lebar dari box (jalur truncate ellipsis)", text: "Supercalifragilisticexpialidocious", box: { x: 0, y: 0, width: 80, height: 30 }, initialFontSize: 40 },
  ];

  for (const c of cases) {
    it(c.name, () => {
      const ctx = makeMockCtx();
      const expected = linearFit(ctx, c.text, c.box, c.initialFontSize, "Times New Roman", "bold");
      const actual = fitTextInBox(ctx, c.text, c.box, c.initialFontSize, "Times New Roman", "bold");
      expect(actual.fontSize).toBe(expected.fontSize);
      expect(actual.lines).toEqual(expected.lines);
    });
  }
});
