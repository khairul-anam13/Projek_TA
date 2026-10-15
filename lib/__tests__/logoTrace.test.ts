import { describe, it, expect } from "vitest";
import {
  RgbaImage,
  workingSize,
  otsu,
  boxBlur,
  thin,
  majority3,
  buildInkMask,
  traceLogo,
  suggestMode,
} from "../logoTrace";
import { parseCustomSvg, customSvgMarkup } from "../svgUtils";

type Rgb = [number, number, number];
const WHITE: Rgb = [255, 255, 255];
const NAVY: Rgb = [20, 40, 110];
const YELLOW: Rgb = [255, 225, 90];

/** PRNG deterministik supaya "derau JPG" stabil antar-run. */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Gambar sintetis: `paint(x, y)` mengembalikan [r,g,b] atau [r,g,b,a]; derau +-`noise`. */
function makeImage(
  w: number,
  h: number,
  paint: (x: number, y: number) => Rgb | [number, number, number, number],
  noise = 0
): RgbaImage {
  const rand = rng(7);
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b, a = 255] = paint(x, y);
      const o = (y * w + x) * 4;
      const n = noise ? (rand() * 2 - 1) * noise : 0;
      data[o] = r + n;
      data[o + 1] = g + n;
      data[o + 2] = b + n;
      data[o + 3] = a;
    }
  }
  return { width: w, height: h, data };
}

const dist = (x: number, y: number, cx: number, cy: number) => Math.hypot(x - cx, y - cy);
/** Cincin biru tua (r 40..25) berisi cakram kuning pucat (r<25) di atas putih. */
const ringLogo = (noise = 0) =>
  makeImage(
    120,
    120,
    (x, y) => {
      const d = dist(x, y, 60, 60);
      return d <= 25 ? YELLOW : d <= 40 ? NAVY : WHITE;
    },
    noise
  );
const subpaths = (svg: string) => (svg.match(/M/g) ?? []).length;
const at = (m: { ink: Uint8Array; width: number }, x: number, y: number) => m.ink[y * m.width + x];

describe("workingSize", () => {
  it("kecil diperbesar ke 640, besar diperkecil ke 1000, proporsi terjaga", () => {
    expect(workingSize(300, 200)).toEqual({ width: 640, height: 427 });
    expect(workingSize(4000, 2000)).toEqual({ width: 1000, height: 500 });
    expect(workingSize(800, 800)).toEqual({ width: 800, height: 800 });
  });
});

describe("primitif piksel", () => {
  it("otsu memisahkan dua mode & -1 untuk histogram kosong", () => {
    const hist = new Array(256).fill(0);
    hist[40] = 500;
    hist[200] = 500;
    const t = otsu(hist);
    expect(t).toBeGreaterThanOrEqual(40);
    expect(t).toBeLessThan(200);
    expect(otsu(new Array(256).fill(0))).toBe(-1);
  });

  it("boxBlur meratakan lonjakan tunggal", () => {
    const src = new Uint8Array(25);
    src[12] = 225;
    const out = boxBlur(src, 5, 5, 1);
    expect(out[12]).toBe(25);
  });

  it("majority3 membuang piksel terisolasi & mempertahankan blok", () => {
    const w = 12;
    const m = new Uint8Array(w * w);
    m[1 * w + 1] = 1;
    for (let y = 5; y < 10; y++) for (let x = 5; x < 10; x++) m[y * w + x] = 1;
    const out = majority3(m, w, w);
    expect(out[1 * w + 1]).toBe(0);
    expect(out[7 * w + 7]).toBe(1);
  });

  it("thin menipiskan balok tebal jadi kerangka <= 2 px", () => {
    const w = 30;
    const h = 20;
    const m = new Uint8Array(w * h);
    for (let y = 7; y < 12; y++) for (let x = 3; x < 27; x++) m[y * w + x] = 1;
    const out = thin(m, w, h);
    let col = 0;
    for (let y = 0; y < h; y++) col += out[y * w + 15];
    expect(col).toBeGreaterThanOrEqual(1);
    expect(col).toBeLessThanOrEqual(2);
  });
});

describe("mode detail", () => {
  it("derau JPG di latar tidak menjadi bintik; warna terang jadi kertas, gelap jadi tinta", () => {
    const m = buildInkMask(ringLogo(14), { mode: "detail" });
    expect(at(m, 60, 25)).toBe(1); // cincin biru tua
    expect(at(m, 60, 60)).toBe(0); // cakram kuning pucat = tanpa tinta
    expect(at(m, 5, 5)).toBe(0); // latar
    const res = traceLogo(ringLogo(14), { mode: "detail" });
    expect(res.empty).toBe(false);
    expect(subpaths(res.svg)).toBe(2); // tepi luar + lubang dalam, tanpa bintik
  });

  it("latar gelap: sisi tinta otomatis yang terang (tidak terbalik jadi blok latar)", () => {
    const navyBg: Rgb = [15, 37, 87];
    const img = makeImage(100, 100, (x, y) => (dist(x, y, 50, 50) < 20 ? [245, 208, 97] : navyBg), 10);
    const res = traceLogo(img, { mode: "detail" });
    expect(res.inkRatio).toBeGreaterThan(0.08);
    expect(res.inkRatio).toBeLessThan(0.2); // cakram saja (~0.126)
    expect(res.width).toBeLessThanOrEqual(42);
  });

  it("invert menukar sisi tinta ke bagian terang di atas latar putih", () => {
    const m = buildInkMask(ringLogo(), { mode: "detail", invert: true });
    expect(at(m, 60, 60)).toBe(1); // kuning kini tinta
    expect(at(m, 60, 25)).toBe(0); // biru tua jadi kertas
  });

  it("ambang manual menggantikan otomatis & dilaporkan balik", () => {
    const res = buildInkMask(ringLogo(), { mode: "detail", threshold: 240 });
    expect(res.threshold).toBe(240);
    expect(at(res, 60, 60)).toBe(1); // kuning (lum ~220) ikut jadi tinta
  });

  it("PNG transparan: area alpha 0 dianggap latar", () => {
    const img = makeImage(80, 80, (x, y) =>
      x >= 30 && x < 50 && y >= 30 && y < 50 ? [0, 0, 0, 255] : [200, 30, 30, 0]
    );
    const res = traceLogo(img, { mode: "detail" });
    expect(res.width).toBe(20);
    expect(res.height).toBe(20);
  });
});

describe("mode siluet", () => {
  it("semua yang beda dari latar jadi satu blok", () => {
    const res = traceLogo(ringLogo(14), { mode: "siluet" });
    expect(subpaths(res.svg)).toBe(1);
    const m = buildInkMask(ringLogo(14), { mode: "siluet" });
    expect(at(m, 60, 60)).toBe(1);
  });
});

describe("mode garis", () => {
  const square = makeImage(100, 100, (x, y) => (x >= 30 && x < 70 && y >= 30 && y < 70 ? NAVY : WHITE));

  it("area tebal jadi kontur (tengah kosong, tepi bertinta)", () => {
    const m = buildInkMask(square, { mode: "garis" });
    expect(at(m, 50, 50)).toBe(0);
    expect(at(m, 30, 50) || at(m, 31, 50) || at(m, 29, 50)).toBe(1);
    expect(m.ink.reduce((a, b) => a + b, 0)).toBeLessThan(40 * 40 * 0.5);
  });

  it("garis halus tetap padat & celahnya terjaga", () => {
    const line = (y: number) => y >= 20 && y < 23;
    const line2 = (y: number) => y >= 29 && y < 32;
    const img = makeImage(100, 60, (x, y) => (x >= 10 && x < 90 && (line(y) || line2(y)) ? NAVY : WHITE));
    const m = buildInkMask(img, { mode: "garis" });
    expect(at(m, 50, 21)).toBe(1);
    expect(at(m, 50, 30)).toBe(1);
    expect(at(m, 50, 26)).toBe(0); // celah antar garis
  });
});

describe("suggestMode", () => {
  it("logo berwarna -> garis; logo hitam-putih -> detail", () => {
    expect(suggestMode(ringLogo(8))).toBe("garis");
    const bw = makeImage(80, 80, (x, y) => (dist(x, y, 40, 40) < 25 ? [10, 10, 10] : WHITE), 8);
    expect(suggestMode(bw)).toBe("detail");
    expect(suggestMode(makeImage(40, 40, () => WHITE))).toBe("detail");
  });
});

describe("traceLogo", () => {
  it("gambar kosong -> empty", () => {
    const res = traceLogo(makeImage(50, 50, () => WHITE, 6));
    expect(res.empty).toBe(true);
    expect(res.svg).toBe("");
  });

  it("SVG berviewBox tepat sebesar bbox tinta & kompatibel dengan parseCustomSvg", () => {
    const img = makeImage(100, 80, (x, y) => (x >= 20 && x < 70 && y >= 10 && y < 50 ? NAVY : WHITE));
    const res = traceLogo(img, { mode: "detail" });
    expect(res.width).toBe(50);
    expect(res.height).toBe(40);
    expect(parseCustomSvg(res.svg).viewBox).toEqual([0, 0, 50, 40]);
    expect(res.svg).toContain('fill-rule="evenodd"');
    expect(customSvgMarkup(res.svg, "#D4AF37", 'x="0" y="0" width="10" height="10"')).toContain('fill="#D4AF37"');
  });

  it("bintik kecil dibuang oleh speckle & jumlah node tetap kecil", () => {
    const img = makeImage(150, 150, (x, y) => {
      if (x >= 40 && x < 110 && y >= 40 && y < 110) return NAVY;
      // titik 3x3 tersebar di luar blok
      const dot = x % 25 < 3 && y % 25 < 3 && !(x >= 30 && x < 120 && y >= 30 && y < 120);
      return dot ? NAVY : WHITE;
    });
    const res = traceLogo(img, { mode: "detail", speckle: 12 });
    expect(subpaths(res.svg)).toBe(1);
    expect(res.nodes).toBeLessThan(20);
  });
});
