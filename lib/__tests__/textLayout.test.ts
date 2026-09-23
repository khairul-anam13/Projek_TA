import { describe, it, expect } from "vitest";
import { scaledInitialFontSize, computeFitFontSize, BASE_CANVAS_WIDTH_PX } from "../textLayout";

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
