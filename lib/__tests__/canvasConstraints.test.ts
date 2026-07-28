import { describe, it, expect } from "vitest";
import {
  clampToCanvas,
  getCenteredX,
  applySnap,
  enforceMikaConstraint,
  getCardRatio,
  computeImageImportSize,
  sanitizeLayoutElements,
  resolveVerticalOverlaps,
  computeResize,
  MIN_ELEMENT_SIZE,
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

describe("sanitizeLayoutElements (enforcement geometri layout hasil AI)", () => {
  it("input bukan array -> array kosong", () => {
    expect(sanitizeLayoutElements(null)).toEqual([]);
    expect(sanitizeLayoutElements(undefined)).toEqual([]);
    expect(sanitizeLayoutElements("bukan array")).toEqual([]);
  });

  it("elemen dengan width melebihi 100 dibatasi ke 100 dan x didorong ke 0 (mencegah teks meluber ke luar halaman)", () => {
    const [el] = sanitizeLayoutElements([
      { id: "el_addr", type: "text", x: 55, y: 85, width: 150, height: 8, fontSize: 23 },
    ]);
    expect(el.width).toBe(100);
    expect(el.x).toBe(0);
    expect(el.x + el.width).toBeLessThanOrEqual(100);
  });

  it("x + width tidak pernah melebihi 100 walau x asli valid tapi width besar", () => {
    const [el] = sanitizeLayoutElements([
      { id: "el_a", type: "text", x: 60, y: 10, width: 80, height: 10, fontSize: 20 },
    ]);
    expect(el.x + el.width).toBeLessThanOrEqual(100);
  });

  it("y + height tidak pernah melebihi 100", () => {
    const [el] = sanitizeLayoutElements([
      { id: "el_a", type: "text", x: 10, y: 95, width: 80, height: 30, fontSize: 20 },
    ]);
    expect(el.y + el.height).toBeLessThanOrEqual(100);
  });

  it("elemen teks yang overlap Zona Mika (Y 50-80) didorong keluar sepenuhnya", () => {
    const [el] = sanitizeLayoutElements([
      { id: "el_a", type: "text", x: 10, y: 60, width: 80, height: 10, fontSize: 20 },
    ]);
    const overlapsZone = el.y < MIKA_ZONE_MAX && el.y + el.height > MIKA_ZONE_MIN;
    expect(overlapsZone).toBe(false);
  });

  it("elemen logo boleh berada di dalam Zona Mika (constraint hanya untuk teks)", () => {
    const [el] = sanitizeLayoutElements([
      { id: "el_logo", type: "logo", x: 40, y: 60, width: 20, height: 15, logoIcon: "shield" },
    ]);
    expect(el.y).toBe(60);
  });

  it("field non-geometri (text, logoIcon, color, align) tetap dipertahankan apa adanya", () => {
    const [el] = sanitizeLayoutElements([
      { id: "el_a", type: "text", text: "SMKN 2 KARANGANYAR", x: 10, y: 15, width: 80, height: 10, fontSize: 43, color: "#D4AF37", align: "center" },
    ]);
    expect(el.text).toBe("SMKN 2 KARANGANYAR");
    expect(el.color).toBe("#D4AF37");
    expect(el.align).toBe("center");
  });

  it("field numerik hilang/tidak valid diisi nilai default yang aman", () => {
    const [el] = sanitizeLayoutElements([{ id: "el_a", type: "text" }]);
    expect(el.width).toBeGreaterThan(0);
    expect(el.height).toBeGreaterThan(0);
    expect(Number.isFinite(el.fontSize)).toBe(true);
  });

  it("dua elemen hasil AI yang overlap (mis. logo & nama sekolah) didorong agar tidak lagi bertabrakan", () => {
    const elements = sanitizeLayoutElements([
      { id: "el_title", type: "text", x: 10, y: 15, width: 80, height: 10, fontSize: 43 },
      { id: "el_logo", type: "logo", x: 40, y: 22, width: 20, height: 20 },
      { id: "el_school", type: "text", x: 10, y: 36, width: 80, height: 10, fontSize: 33 },
    ]);
    const overlaps = (a: any, b: any) =>
      a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
    for (let i = 0; i < elements.length; i++) {
      for (let j = i + 1; j < elements.length; j++) {
        expect(overlaps(elements[i], elements[j])).toBe(false);
      }
    }
  });
});

describe("resolveVerticalOverlaps (dorong elemen yang bertumpang tindih agar tidak bertabrakan)", () => {
  it("elemen yang tidak overlap sama sekali tidak diubah posisinya", () => {
    const input = [
      { id: "a", type: "text", x: 10, y: 10, width: 30, height: 5, zIndex: 0 },
      { id: "b", type: "text", x: 10, y: 30, width: 30, height: 5, zIndex: 1 },
    ] as any;
    const result = resolveVerticalOverlaps(input);
    expect(result[0].y).toBe(10);
    expect(result[1].y).toBe(30);
  });

  it("elemen yang tidak overlap secara horizontal (berdampingan) tidak didorong walau Y sama", () => {
    const input = [
      { id: "a", type: "text", x: 0, y: 10, width: 40, height: 10, zIndex: 0 },
      { id: "b", type: "text", x: 50, y: 10, width: 40, height: 10, zIndex: 1 },
    ] as any;
    const result = resolveVerticalOverlaps(input);
    expect(result[0].y).toBe(10);
    expect(result[1].y).toBe(10);
  });

  it("elemen bawah yang overlap didorong ke bawah elemen atas (dengan gap), elemen atas tidak bergeser", () => {
    const input = [
      { id: "top", type: "text", x: 10, y: 15, width: 80, height: 10, zIndex: 0 },
      { id: "bottom", type: "logo", x: 40, y: 22, width: 20, height: 20, zIndex: 1 },
    ] as any;
    const result = resolveVerticalOverlaps(input);
    const top = result.find((e) => e.id === "top")!;
    const bottom = result.find((e) => e.id === "bottom")!;
    expect(top.y).toBe(15);
    expect(bottom.y).toBeGreaterThanOrEqual(top.y + top.height);
  });

  it("dorongan yang mendarat di Zona Mika didorong lagi sampai lewat MIKA_ZONE_MAX", () => {
    const input = [
      { id: "top", type: "text", x: 10, y: 45, width: 80, height: 8, zIndex: 0 },
      { id: "bottom", type: "text", x: 10, y: 46, width: 80, height: 6, zIndex: 1 },
    ] as any;
    const result = resolveVerticalOverlaps(input);
    const bottom = result.find((e) => e.id === "bottom")!;
    expect(bottom.y).toBeGreaterThanOrEqual(MIKA_ZONE_MAX);
  });

  it("elemen logo boleh didorong ke dalam Zona Mika (constraint hanya untuk teks)", () => {
    const input = [
      { id: "top", type: "text", x: 10, y: 45, width: 80, height: 8, zIndex: 0 },
      { id: "bottom", type: "logo", x: 10, y: 46, width: 20, height: 6, zIndex: 1 },
    ] as any;
    const result = resolveVerticalOverlaps(input);
    const bottom = result.find((e) => e.id === "bottom")!;
    // Tidak dipaksa keluar zona mika, hanya dipastikan tidak lagi overlap "top".
    const top = result.find((e) => e.id === "top")!;
    expect(bottom.y).toBeGreaterThanOrEqual(top.y + top.height);
  });

  it("hasil dorongan tidak pernah melebihi batas bawah kanvas (100)", () => {
    const input = [
      { id: "a", type: "text", x: 10, y: 90, width: 80, height: 8, zIndex: 0 },
      { id: "b", type: "text", x: 10, y: 92, width: 80, height: 8, zIndex: 1 },
    ] as any;
    const result = resolveVerticalOverlaps(input);
    for (const el of result) {
      expect(el.y + el.height).toBeLessThanOrEqual(100);
    }
  });

  it("tiga elemen bertumpuk semua di-resolve dari atas ke bawah tanpa ada sisa overlap", () => {
    const input = [
      { id: "a", type: "text", x: 10, y: 10, width: 80, height: 10, zIndex: 0 },
      { id: "b", type: "text", x: 10, y: 12, width: 80, height: 10, zIndex: 1 },
      { id: "c", type: "text", x: 10, y: 14, width: 80, height: 10, zIndex: 2 },
    ] as any;
    const result = resolveVerticalOverlaps(input);
    const overlaps = (x: any, y: any) =>
      x.x < y.x + y.width && x.x + x.width > y.x && x.y < y.y + y.height && x.y + x.height > y.y;
    expect(overlaps(result[0], result[1])).toBe(false);
    expect(overlaps(result[1], result[2])).toBe(false);
    expect(overlaps(result[0], result[2])).toBe(false);
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

describe("computeResize (resize elemen lewat 8 handle, sisi berlawanan tetap anchor)", () => {
  const base = { x: 20, y: 20, width: 30, height: 10 };

  it("handle 'e' menambah lebar dari kanan, x/y/kiri tetap diam", () => {
    const r = computeResize(base, "e", 10, 0, false);
    expect(r.width).toBeCloseTo(40, 5);
    expect(r.x).toBe(base.x);
    expect(r.y).toBe(base.y);
    expect(r.height).toBe(base.height);
  });

  it("handle 'w' menggeser sisi kiri, sisi kanan (x+width) tetap diam", () => {
    const r = computeResize(base, "w", -10, 0, false);
    const originalRight = base.x + base.width;
    expect(r.x).toBeCloseTo(10, 5);
    expect(r.x + r.width).toBeCloseTo(originalRight, 5);
  });

  it("handle 's' menambah tinggi dari bawah, y/atas tetap diam", () => {
    const r = computeResize(base, "s", 0, 15, false);
    expect(r.height).toBeCloseTo(25, 5);
    expect(r.y).toBe(base.y);
  });

  it("handle 'n' menggeser sisi atas, sisi bawah (y+height) tetap diam", () => {
    const r = computeResize(base, "n", 0, -5, false);
    const originalBottom = base.y + base.height;
    expect(r.y).toBeCloseTo(15, 5);
    expect(r.y + r.height).toBeCloseTo(originalBottom, 5);
  });

  it("handle sudut 'se' mengubah lebar & tinggi sekaligus, kiri/atas tetap anchor", () => {
    const r = computeResize(base, "se", 5, 5, false);
    expect(r.x).toBe(base.x);
    expect(r.y).toBe(base.y);
    expect(r.width).toBeCloseTo(35, 5);
    expect(r.height).toBeCloseTo(15, 5);
  });

  it("handle sudut 'nw' mengubah x & y sekaligus, kanan/bawah tetap anchor", () => {
    const r = computeResize(base, "nw", -5, -5, false);
    expect(r.x + r.width).toBeCloseTo(base.x + base.width, 5);
    expect(r.y + r.height).toBeCloseTo(base.y + base.height, 5);
  });

  it("tidak bisa menyusut di bawah MIN_ELEMENT_SIZE", () => {
    const r = computeResize(base, "e", -1000, 0, false);
    expect(r.width).toBeCloseTo(MIN_ELEMENT_SIZE, 5);
  });

  it("tidak bisa tumbuh melewati batas kanvas (100)", () => {
    const r = computeResize(base, "e", 1000, 0, false);
    expect(r.x + r.width).toBeLessThanOrEqual(100);
  });

  it("tidak bisa digeser melewati tepi kanvas (0)", () => {
    const r = computeResize(base, "w", -1000, 0, false);
    expect(r.x).toBeGreaterThanOrEqual(0);
  });

  it("elemen Kunci Sumbu X tetap rata tengah horizontal setelah resize lebar", () => {
    const r = computeResize(base, "e", 10, 0, true);
    expect(r.x).toBeCloseTo(50 - r.width / 2, 5);
  });

  it("elemen Kunci Sumbu X TIDAK direcenter saat resize vertikal murni ('s')", () => {
    const r = computeResize(base, "s", 0, 10, true);
    expect(r.x).toBe(base.x);
  });
});
