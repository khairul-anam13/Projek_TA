/**
 * Logo berwarna (JPG/PNG) -> bitmap satu tinta -> SVG vektor (potrace), untuk
 * klise foil/sablon. Murni (tanpa DOM) supaya bisa diuji di vitest.
 *
 * Kenapa bukan "threshold luminans tunggal" seperti versi lama: warna terang
 * (kuning/emas/hijau muda) berluminans > 128 sehingga hilang jadi putih, latar
 * gelap menghasilkan hasil terbalik, gradasi terpotong acak, dan derau JPG
 * menjadi bintik. Di sini: latar diperkirakan dari tepi gambar, derau diredam,
 * ambang dihitung otomatis (Otsu) hanya dari piksel bukan-latar, dan ada tiga
 * mode yang cocok untuk jenis logo berbeda.
 */
import { Bitmap, traceBitmap, getSVG } from "@cadit-app/potrace-ts";

export type LogoTraceMode = "detail" | "siluet" | "garis";

export interface RgbaImage {
  width: number;
  height: number;
  /** RGBA 8-bit, 4 byte per piksel (kompatibel dengan ImageData). */
  data: ArrayLike<number>;
}

export interface LogoTraceOptions {
  /**
   * detail = ambang tonal (gelap = tinta); siluet = semua yang beda dari latar
   * menjadi blok tinta; garis = hanya kontur tepi antar-area (line art).
   */
  mode?: LogoTraceMode;
  /**
   * Ambang manual 0-255, null/undefined = otomatis. Artinya per mode:
   * detail = batas luminans, siluet = toleransi jarak warna dari latar,
   * garis = kekuatan tepi minimum.
   */
  threshold?: number | null;
  /** Balik sisi tinta pada mode detail (logo terang di atas latar gelap/foto). */
  invert?: boolean;
  /** Bintik berluas <= ini (piksel kerja) dibuang, termasuk lubang kecil. */
  speckle?: number;
  /** Tebal garis (piksel kerja) pada mode garis; bawaan ~1/175 sisi panjang. */
  lineWidth?: number | null;
  /** Radius blur peredam derau JPG, 0-3. */
  smooth?: number;
}

export interface LogoTraceResult {
  /** SVG berviewBox "0 0 width height", satu <path> fill hitam evenodd. Kosong jika `empty`. */
  svg: string;
  width: number;
  height: number;
  /** Ambang yang benar-benar dipakai (otomatis atau manual). */
  threshold: number;
  /** Porsi piksel kerja (0-1) yang menjadi tinta; > ~0.55 biasanya berarti terbalik. */
  inkRatio: number;
  /** Jumlah segmen kurva/garis; indikator "terlalu rapat". */
  nodes: number;
  /** Tebal garis kontur (piksel kerja) yang dipakai; hanya bermakna di mode garis. */
  lineWidth: number;
  empty: boolean;
}

export const LOGO_WORK_MIN = 640;
export const LOGO_WORK_MAX = 1000;
/** Jarak warna (Euclid RGB) dari latar yang masih dianggap latar. */
export const BG_TOLERANCE = 50;

/** Ukuran kerja: sisi panjang dijepit ke 640-1000 px (kecil diperbesar, besar diperkecil). */
export function workingSize(width: number, height: number): { width: number; height: number } {
  const long = Math.max(width, height, 1);
  const k = Math.min(LOGO_WORK_MAX, Math.max(LOGO_WORK_MIN, long)) / long;
  return { width: Math.max(1, Math.round(width * k)), height: Math.max(1, Math.round(height * k)) };
}

interface Planes {
  r: Uint8Array;
  g: Uint8Array;
  b: Uint8Array;
  /** 1 = piksel transparan (alpha < 128): selalu dianggap latar. */
  clear: Uint8Array;
}

/** Pisah kanal, piksel semi-transparan dicampur ke putih (seperti kertas). */
function toPlanes(img: RgbaImage): Planes {
  const n = img.width * img.height;
  const r = new Uint8Array(n);
  const g = new Uint8Array(n);
  const b = new Uint8Array(n);
  const clear = new Uint8Array(n);
  const d = img.data;
  for (let i = 0; i < n; i++) {
    const a = d[i * 4 + 3] / 255;
    r[i] = Math.round(255 + (d[i * 4] - 255) * a);
    g[i] = Math.round(255 + (d[i * 4 + 1] - 255) * a);
    b[i] = Math.round(255 + (d[i * 4 + 2] - 255) * a);
    if (a < 0.5) clear[i] = 1;
  }
  return { r, g, b, clear };
}

/** Box blur separabel radius `rad` (tepi di-clamp). */
export function boxBlur(src: Uint8Array, w: number, h: number, rad: number): Uint8Array {
  if (rad <= 0) return src;
  const win = 2 * rad + 1;
  const tmp = new Uint8Array(src.length);
  const out = new Uint8Array(src.length);
  const clamp = (v: number, max: number) => (v < 0 ? 0 : v > max ? max : v);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let sum = 0;
    for (let k = -rad; k <= rad; k++) sum += src[row + clamp(k, w - 1)];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = Math.round(sum / win);
      sum += src[row + clamp(x + rad + 1, w - 1)] - src[row + clamp(x - rad, w - 1)];
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let k = -rad; k <= rad; k++) sum += tmp[clamp(k, h - 1) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = Math.round(sum / win);
      sum += tmp[clamp(y + rad + 1, h - 1) * w + x] - tmp[clamp(y - rad, h - 1) * w + x];
    }
  }
  return out;
}

/**
 * Ambang Otsu: kelas bawah = bin 0..t. Dua puncak tajam membuat variansi datar di
 * antaranya; diambil titik tengah plateau (bukan ujung) supaya goresan tidak
 * terkikis. Mengembalikan -1 bila histogram kosong.
 */
export function otsu(hist: ArrayLike<number>): number {
  let total = 0;
  let sumAll = 0;
  for (let i = 0; i < hist.length; i++) {
    total += hist[i];
    sumAll += i * hist[i];
  }
  if (total === 0) return -1;
  const variance = new Float64Array(hist.length);
  let wB = 0;
  let sumB = 0;
  let max = 0;
  for (let t = 0; t < hist.length; t++) {
    wB += hist[t];
    sumB += t * hist[t];
    const wF = total - wB;
    if (wB === 0 || wF === 0) continue;
    const d = sumB / wB - (sumAll - sumB) / wF;
    variance[t] = wB * wF * d * d;
    if (variance[t] > max) max = variance[t];
  }
  if (max === 0) return -1;
  let lo = -1;
  let hi = -1;
  for (let t = 0; t < hist.length; t++) {
    if (variance[t] >= max * 0.9999) {
      if (lo < 0) lo = t;
      hi = t;
    }
  }
  return Math.round((lo + hi) / 2);
}

/** Warna latar = median piksel opak di bingkai tepi gambar; putih jika semua transparan. */
export function estimateBackground(p: Planes, w: number, h: number): [number, number, number] {
  const ring = Math.max(1, Math.round(Math.min(w, h) * 0.01));
  const hist = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
  let count = 0;
  for (let y = 0; y < h; y++) {
    const onEdgeY = y < ring || y >= h - ring;
    for (let x = 0; x < w; x++) {
      if (!onEdgeY && x >= ring && x < w - ring) continue;
      const i = y * w + x;
      if (p.clear[i]) continue;
      hist[0][p.r[i]]++;
      hist[1][p.g[i]]++;
      hist[2][p.b[i]]++;
      count++;
    }
  }
  if (count === 0) return [255, 255, 255];
  const median = (hs: Uint32Array) => {
    let acc = 0;
    for (let v = 0; v < 256; v++) {
      acc += hs[v];
      if (acc * 2 >= count) return v;
    }
    return 255;
  };
  return [median(hist[0]), median(hist[1]), median(hist[2])];
}

const lum = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

/** Magnitudo tepi Sobel (0-255), diambil maksimum antar kanal agar batas warna ikut. */
export function edgeMagnitude(planes: Uint8Array[], w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h);
  for (const p of planes) {
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const gx =
          p[i - w + 1] + 2 * p[i + 1] + p[i + w + 1] - p[i - w - 1] - 2 * p[i - 1] - p[i + w - 1];
        const gy =
          p[i + w - 1] + 2 * p[i + w] + p[i + w + 1] - p[i - w - 1] - 2 * p[i - w] - p[i - w + 1];
        const m = Math.min(255, Math.round(Math.sqrt(gx * gx + gy * gy) / 4));
        if (m > out[i]) out[i] = m;
      }
    }
  }
  return out;
}

/**
 * Penipisan Zhang-Suen ke kerangka 1 piksel. Pita tepi yang bertemu (huruf
 * kecil, garis rapat) jadi satu garis tengah, bukan gumpalan tebal.
 */
export function thin(mask: Uint8Array, w: number, h: number): Uint8Array {
  const m = Uint8Array.from(mask);
  const del: number[] = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (let pass = 0; pass < 2; pass++) {
      del.length = 0;
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = y * w + x;
          if (!m[i]) continue;
          const p2 = m[i - w], p3 = m[i - w + 1], p4 = m[i + 1], p5 = m[i + w + 1];
          const p6 = m[i + w], p7 = m[i + w - 1], p8 = m[i - 1], p9 = m[i - w - 1];
          const nb = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
          if (nb < 2 || nb > 6) continue;
          const tr =
            (!p2 && p3 ? 1 : 0) + (!p3 && p4 ? 1 : 0) + (!p4 && p5 ? 1 : 0) + (!p5 && p6 ? 1 : 0) +
            (!p6 && p7 ? 1 : 0) + (!p7 && p8 ? 1 : 0) + (!p8 && p9 ? 1 : 0) + (!p9 && p2 ? 1 : 0);
          if (tr !== 1) continue;
          if (pass === 0 ? p2 * p4 * p6 || p4 * p6 * p8 : p2 * p4 * p8 || p2 * p6 * p8) continue;
          del.push(i);
        }
      }
      for (const i of del) m[i] = 0;
      if (del.length) changed = true;
    }
  }
  return m;
}

/** Dilasi persegi radius `rad` (dua lintasan 1D). */
export function dilate(mask: Uint8Array, w: number, h: number, rad: number): Uint8Array {
  if (rad <= 0) return mask;
  const tmp = new Uint8Array(mask.length);
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      for (let k = Math.max(0, x - rad); k <= Math.min(w - 1, x + rad); k++) tmp[y * w + k] = 1;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!tmp[y * w + x]) continue;
      for (let k = Math.max(0, y - rad); k <= Math.min(h - 1, y + rad); k++) out[k * w + x] = 1;
    }
  }
  return out;
}

/** Filter mayoritas 3x3: piksel tunggal/terisolasi hilang, tepi bergerigi 1 px halus. */
export function majority3(mask: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let c = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx >= 0 && xx < w) c += mask[yy * w + xx];
        }
      }
      out[y * w + x] = c >= 5 ? 1 : 0;
    }
  }
  return out;
}

export interface InkMask {
  width: number;
  height: number;
  /** 1 = tinta. */
  ink: Uint8Array;
  threshold: number;
  lineWidth: number;
}

const clamp255 = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

/** Erosi persegi radius `rad` (dilasi dari komplemen). */
function erode(mask: Uint8Array, w: number, h: number, rad: number): Uint8Array {
  const inv = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) inv[i] = mask[i] ? 0 : 1;
  const grown = dilate(inv, w, h, rad);
  for (let i = 0; i < mask.length; i++) grown[i] = grown[i] ? 0 : 1;
  return grown;
}

/**
 * Komponen terhubung (8 arah) dari `mask` yang tidak punya satu pun piksel di
 * `opened` (hasil opening = bagian tebal) artinya tipis seluruhnya.
 */
function thinComponents(mask: Uint8Array, opened: Uint8Array, w: number, h: number): Uint8Array {
  const n = w * h;
  const out = new Uint8Array(n);
  const seen = new Uint8Array(n);
  const stack: number[] = [];
  const comp: number[] = [];
  for (let s0 = 0; s0 < n; s0++) {
    if (!mask[s0] || seen[s0]) continue;
    comp.length = 0;
    let thick = false;
    seen[s0] = 1;
    stack.push(s0);
    while (stack.length) {
      const i = stack.pop() as number;
      comp.push(i);
      if (opened[i]) thick = true;
      const x = i % w;
      const y = (i - x) / w;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const j = yy * w + xx;
          if (mask[j] && !seen[j]) {
            seen[j] = 1;
            stack.push(j);
          }
        }
      }
    }
    if (!thick) for (const i of comp) out[i] = 1;
  }
  return out;
}

/** Tahap piksel: gambar RGBA -> mask tinta (belum di-trace). */
export function buildInkMask(img: RgbaImage, opts: LogoTraceOptions = {}): InkMask {
  const { width: w, height: h } = img;
  const n = w * h;
  const mode = opts.mode ?? "detail";
  const smooth = Math.max(0, Math.min(3, Math.round(opts.smooth ?? 1)));
  const manual = typeof opts.threshold === "number" && Number.isFinite(opts.threshold);
  const manualValue = manual ? clamp255(opts.threshold as number) : -1;

  const planes = toPlanes(img);
  const r = boxBlur(planes.r, w, h, smooth);
  const g = boxBlur(planes.g, w, h, smooth);
  const b = boxBlur(planes.b, w, h, smooth);

  const [br, bg, bb] = estimateBackground({ ...planes, r, g, b }, w, h);
  const bgLum = lum(br, bg, bb);
  const fgLum = new Float32Array(n);
  const dist = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const dr = r[i] - br;
    const dg = g[i] - bg;
    const db = b[i] - bb;
    dist[i] = planes.clear[i] ? 0 : Math.sqrt(dr * dr + dg * dg + db * db);
    fgLum[i] = lum(r[i], g[i], b[i]);
  }

  /** Mask tonal: Otsu hanya dari piksel bukan-latar supaya latar luas tidak mendominasi. */
  const tonal = (value: number) => {
    const hist = new Uint32Array(256);
    let fg = 0;
    for (let i = 0; i < n; i++) {
      if (dist[i] > BG_TOLERANCE) {
        hist[Math.round(fgLum[i])]++;
        fg++;
      }
    }
    // Latar ikut sebagai puncak "kertas", dibatasi sebesar fg: tanpa ini Otsu hanya
    // melihat ramp tepi anti-alias dan memangkas goresan tipis ~1 px.
    hist[Math.round(bgLum)] += Math.min(n - fg, fg);
    const auto = fg > n * 0.001 ? otsu(hist) : -1;
    const threshold = value >= 0 ? value : auto >= 0 ? auto : 128;
    // Sisi tinta = sisi yang menjauhi luminans latar (latar terang -> gelap = tinta).
    const darkInk = (bgLum >= 128) !== !!opts.invert;
    const ink = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      if (dist[i] <= BG_TOLERANCE) continue;
      if (darkInk ? fgLum[i] <= threshold : fgLum[i] > threshold) ink[i] = 1;
    }
    return { ink, threshold };
  };

  const lineWidth = Math.max(1, Math.round(opts.lineWidth ?? Math.max(2, Math.max(w, h) / 175)));
  let ink: Uint8Array;
  let threshold: number;

  if (mode === "siluet") {
    threshold = manual ? manualValue : BG_TOLERANCE;
    ink = new Uint8Array(n);
    for (let i = 0; i < n; i++) if (dist[i] > threshold) ink[i] = 1;
  } else if (mode === "garis") {
    const mag = edgeMagnitude([r, g, b], w, h);
    if (manual) {
      threshold = manualValue;
    } else {
      const hist = new Uint32Array(256);
      for (let i = 0; i < n; i++) hist[mag[i]]++;
      threshold = Math.max(24, Math.min(120, otsu(hist)));
    }
    const edges = new Uint8Array(n);
    for (let i = 0; i < n; i++) if (mag[i] > threshold && !planes.clear[i]) edges[i] = 1;
    // Kontur = kerangka 1 px yang ditebalkan seragam, jadi tebal garis konsisten.
    const lines = dilate(thin(edges, w, h), w, h, Math.floor(lineWidth / 2));
    // Komponen tonal yang tipis seluruhnya (huruf, garis halus) tetap padat;
    // kontur di sekitarnya dibuang agar tidak menggumpal jadi blok tinta.
    const rad = Math.max(2, Math.round(Math.max(w, h) / 200));
    const solid = tonal(-1).ink;
    const thinComp = thinComponents(solid, dilate(erode(solid, w, h, rad), w, h, rad), w, h);
    const near = dilate(thinComp, w, h, Math.floor(lineWidth / 2) + 2);
    ink = new Uint8Array(n);
    for (let i = 0; i < n; i++) if (thinComp[i] || (lines[i] && !near[i])) ink[i] = 1;
  } else {
    ({ ink, threshold } = tonal(manualValue));
  }

  return { width: w, height: h, ink: majority3(ink, w, h), threshold, lineWidth };
}

/**
 * Mode bawaan yang disarankan: logo berwarna/bergradasi paling bersih sebagai
 * garis tepi; logo yang sudah hampir hitam-putih paling setia lewat detail.
 */
export function suggestMode(img: RgbaImage): LogoTraceMode {
  const n = img.width * img.height;
  const p = toPlanes(img);
  const [br, bg, bb] = estimateBackground(p, img.width, img.height);
  let fg = 0;
  let colorful = 0;
  for (let i = 0; i < n; i++) {
    if (p.clear[i]) continue;
    if (Math.hypot(p.r[i] - br, p.g[i] - bg, p.b[i] - bb) <= BG_TOLERANCE) continue;
    fg++;
    if (Math.max(p.r[i], p.g[i], p.b[i]) - Math.min(p.r[i], p.g[i], p.b[i]) > 48) colorful++;
  }
  return fg > n * 0.001 && colorful > fg * 0.3 ? "garis" : "detail";
}

const roundNum = (s: string) => String(Math.round(parseFloat(s) * 10) / 10);

/** Pipeline lengkap: mask tinta -> potong ke bbox -> potrace -> SVG berviewBox. */
export function traceLogo(img: RgbaImage, opts: LogoTraceOptions = {}): LogoTraceResult {
  const { width: w, height: h, ink, threshold, lineWidth } = buildInkMask(img, opts);
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  let count = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!ink[y * w + x]) continue;
      count++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  const empty = { svg: "", width: 0, height: 0, threshold, inkRatio: 0, nodes: 0, lineWidth, empty: true };
  if (count === 0) return empty;

  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const bitmap = new Bitmap(cw, ch);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) bitmap.data[y * cw + x] = ink[(y + minY) * w + x + minX];
  }

  const paths = traceBitmap(bitmap, {
    turdsize: Math.max(0, Math.round(opts.speckle ?? 12)),
    alphamax: 1,
    opttolerance: 0.4,
    optcurve: true,
  });
  if (paths.length === 0) return empty;

  const d = (getSVG(paths, 1).match(/ d="([^"]*)"/)?.[1] ?? "").replace(/-?\d+\.\d+/g, roundNum);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cw} ${ch}" width="${cw}" height="${ch}">` +
    `<path d="${d}" fill="#000000" fill-rule="evenodd"/></svg>`;
  return {
    svg,
    width: cw,
    height: ch,
    threshold,
    inkRatio: count / (w * h),
    nodes: (d.match(/[CL]/g) ?? []).length,
    lineWidth,
    empty: false,
  };
}
