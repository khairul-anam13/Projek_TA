import { describe, it, expect } from "vitest";
import {
  clampToCanvas,
  getCenteredX,
  applySnap,
  enforceMikaConstraint,
  getCardRatio,
  computeImageImportSize,
  MIKA_ZONE_MIN,
  MIKA_ZONE_MAX,
} from "../canvasConstraints";

describe("clampToCanvas (Boundary Value Analysis)", () => {
  it("meloloskan nilai di dalam rentang 0-95", () => {
    expect(clampToCanvas(40)).toBe(40);
  });
  it("membatasi nilai negatif ke 0 (batas bawah)", () => {
    expect(clampToCanvas(-10)).toBe(0);
  });
  it("membatasi nilai > 95 ke 95 (batas atas)", () => {
    expect(clampToCanvas(150)).toBe(95);
  });
  it("nilai tepat di batas (0 dan 95) tidak berubah", () => {
    expect(clampToCanvas(0)).toBe(0);
    expect(clampToCanvas(95)).toBe(95);
  });
});

describe("getCenteredX (Kunci Sumbu X)", () => {
  it("elemen lebar 80 dipusatkan pada x=10", () => {
    expect(getCenteredX(80)).toBe(10);
  });
  it("elemen lebar 0 dipusatkan pada x=50", () => {
    expect(getCenteredX(0)).toBe(50);
  });
  it("elemen lebar 100 menghasilkan x=0", () => {
    expect(getCenteredX(100)).toBe(0);
  });
});

describe("applySnap (snap ke garis bantu 5/50/95)", () => {
  it("menempel ke titik 50 saat berada dalam threshold (1.5)", () => {
    const r = applySnap(51, 49);
    expect(r.x).toBe(50);
    expect(r.y).toBe(50);
    expect(r.guides).toEqual(
      expect.arrayContaining([
        { type: "v", value: 50 },
        { type: "h", value: 50 },
      ])
    );
  });
  it("tidak menempel saat di luar threshold", () => {
    const r = applySnap(60, 30);
    expect(r.x).toBe(60);
    expect(r.y).toBe(30);
    expect(r.guides).toHaveLength(0);
  });
  it("nilai tepat di tepi threshold (1.49 vs 1.5) — sedikit di dalam batas tetap snap", () => {
    const r = applySnap(50 + 1.49, 0);
    expect(r.x).toBe(50);
  });
  it("nilai tepat di threshold (>=1.5) tidak snap (batas eksklusif)", () => {
    const r = applySnap(50 + 1.5, 0);
    expect(r.x).toBe(51.5);
  });
});

describe("enforceMikaConstraint (Constraint Zona Mika, Y 50-80 terlarang untuk teks)", () => {
  it("elemen non-teks (logo/shape) boleh berada di dalam zona mika", () => {
    expect(enforceMikaConstraint("logo", 65)).toBe(65);
    expect(enforceMikaConstraint("shape", 70)).toBe(70);
  });
  it("teks tepat di batas bawah zona (y=50) didorong keluar ke y=49", () => {
    expect(enforceMikaConstraint("text", MIKA_ZONE_MIN)).toBe(49);
  });
  it("teks tepat di batas atas zona (y=80) didorong keluar ke y=81", () => {
    expect(enforceMikaConstraint("text", MIKA_ZONE_MAX)).toBe(81);
  });
  it("teks di tengah paruh-bawah zona (y=64, <65) didorong ke atas (y=49)", () => {
    expect(enforceMikaConstraint("text", 64)).toBe(49);
  });
  it("teks tepat di titik pemisah (y=65) didorong ke bawah (y=81)", () => {
    expect(enforceMikaConstraint("text", 65)).toBe(81);
  });
  it("teks tepat di luar zona (y=49 dan y=81) tidak diubah", () => {
    expect(enforceMikaConstraint("text", 49)).toBe(49);
    expect(enforceMikaConstraint("text", 81)).toBe(81);
  });
});

describe("getCardRatio (rasio kertas)", () => {
  it("Size A (23x34cm) -> rasio 23/34", () => {
    expect(getCardRatio("Size A (23x34cm)")).toBeCloseTo(23 / 34, 10);
  });
  it("Size B (17x23cm) -> rasio 17/23", () => {
    expect(getCardRatio("Size B (17x23cm)")).toBeCloseTo(17 / 23, 10);
  });
  it("undefined (belum dipilih) -> default rasio Size A", () => {
    expect(getCardRatio(undefined)).toBeCloseTo(23 / 34, 10);
  });
});

describe("computeImageImportSize (batas impor gambar maks. 30% lebar / 40% tinggi)", () => {
  const ratioA = 23 / 34;

  it("gambar landscape lebar: lebar dibatasi 30%, tinggi mengikuti rasio", () => {
    const { width, height } = computeImageImportSize(800, 200, ratioA);
    expect(width).toBe(30);
    expect(height).toBeLessThanOrEqual(40);
    expect(height).toBeCloseTo(30 * (200 / 800) * ratioA, 2);
  });

  it("gambar sangat tinggi (potrait ekstrem): tinggi dibatasi 40%, lebar dihitung ulang", () => {
    const { width, height } = computeImageImportSize(100, 1000, ratioA);
    expect(height).toBe(40);
    expect(width).toBeLessThan(30);
    expect(width).toBeGreaterThan(0);
  });

  it("gambar persegi tetap proporsional dan tidak pernah melebihi batas 30%/40%", () => {
    const { width, height } = computeImageImportSize(500, 500, ratioA);
    expect(width).toBeLessThanOrEqual(30);
    expect(height).toBeLessThanOrEqual(40);
  });
});
