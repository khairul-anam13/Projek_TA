import { CanvasElement, DesignProject } from "./types";

/**
 * Aturan bisnis penempatan elemen pada kanvas editor (drag, snap, dan
 * constraint fisik produk cetak). Dipisah dari EditorPage.tsx agar dapat
 * diuji secara terisolasi (unit test).
 */

export const CANVAS_MIN = 0;
export const CANVAS_MAX = 95;

export const SNAP_POINTS = [5, 50, 95];
export const SNAP_THRESHOLD = 1.5;

// Zona mika nama (jendela plastik fisik) memblokir teks pada Y 50-80.
export const MIKA_ZONE_MIN = 50;
export const MIKA_ZONE_MAX = 80;
export const MIKA_ZONE_SPLIT = 65;

export const IMAGE_MAX_WIDTH_PCT = 30;
export const IMAGE_MAX_HEIGHT_PCT = 40;

/** Membatasi koordinat agar tetap berada di dalam area kanvas yang dapat digeser. */
export function clampToCanvas(value: number, min = CANVAS_MIN, max = CANVAS_MAX): number {
  return Math.max(min, Math.min(max, value));
}

/** Posisi X saat elemen dalam keadaan "Kunci Sumbu X" (selalu rata tengah). */
export function getCenteredX(width: number): number {
  return 50 - width / 2;
}

export interface SnapResult {
  x: number;
  y: number;
  guides: { type: "v" | "h"; value: number }[];
}

/** Menempelkan (snap) koordinat ke garis bantu terdekat (5, 50, 95). */
export function applySnap(
  tx: number,
  ty: number,
  snapPoints: number[] = SNAP_POINTS,
  threshold: number = SNAP_THRESHOLD
): SnapResult {
  let x = tx;
  let y = ty;
  const guides: { type: "v" | "h"; value: number }[] = [];

  snapPoints.forEach((sp) => {
    if (Math.abs(x - sp) < threshold) {
      x = sp;
      guides.push({ type: "v", value: sp });
    }
    if (Math.abs(y - sp) < threshold) {
      y = sp;
      guides.push({ type: "h", value: sp });
    }
  });

  return { x, y, guides };
}

/**
 * Constraint Zona Mika: elemen teks tidak boleh diletakkan pada Y 50-80
 * (area fisik jendela mika nama). Elemen didorong keluar ke tepi terdekat.
 */
export function enforceMikaConstraint(elementType: CanvasElement["type"] | undefined, ty: number): number {
  if (elementType === "text" && ty >= MIKA_ZONE_MIN && ty <= MIKA_ZONE_MAX) {
    return ty < MIKA_ZONE_SPLIT ? MIKA_ZONE_MIN - 1 : MIKA_ZONE_MAX + 1;
  }
  return ty;
}

export const OVERLAP_GAP = 1;

/**
 * Mendorong elemen yang saling bertumpang tindih (overlap) secara vertikal
 * ke bawah agar tidak lagi bertabrakan — jaring pengaman terakhir untuk
 * layout hasil AI, yang Y-range per elemennya "disarankan" lewat prompt tapi
 * tidak dijamin benar-benar tidak overlap satu sama lain.
 *
 * Diproses berurutan dari elemen paling atas (Y terkecil) ke bawah: setiap
 * elemen hanya bisa didorong oleh elemen LAIN yang sudah "final" (sudah
 * diproses) dan tumpang tindih secara horizontal juga — supaya elemen di
 * baris atas tidak pernah ikut bergeser akibat elemen di bawahnya.
 */
export function resolveVerticalOverlaps(elements: CanvasElement[]): CanvasElement[] {
  const order = elements.map((_, i) => i).sort((a, b) => elements[a].y - elements[b].y);
  const result = [...elements];
  const finalized: CanvasElement[] = [];

  for (const i of order) {
    const el = result[i];
    let y = el.y;

    for (const prev of finalized) {
      const overlapsHorizontally = el.x < prev.x + prev.width && el.x + el.width > prev.x;
      if (!overlapsHorizontally) continue;
      const prevBottom = prev.y + prev.height;
      if (y < prevBottom + OVERLAP_GAP) {
        y = prevBottom + OVERLAP_GAP;
      }
    }

    y = clampToCanvas(y, 0, 100 - el.height);

    // Dorongan ke bawah bisa saja mendarat di Zona Mika — kalau begitu,
    // dorong lagi sampai ke bawah zona (mendorong ke atas akan menabrakkan
    // lagi elemen yang baru saja dihindari).
    if (el.type === "text" && y < MIKA_ZONE_MAX && y + el.height > MIKA_ZONE_MIN) {
      y = clampToCanvas(MIKA_ZONE_MAX, 0, 100 - el.height);
    }

    const updated = { ...el, y: parseFloat(y.toFixed(2)) };
    result[i] = updated;
    finalized.push(updated);
  }

  return result;
}

/**
 * Membatasi geometri elemen layout hasil generasi AI ke area kanvas yang valid.
 * Prompt AI hanya "meminta" x/y/width/height berada di 0-100 dan di luar Zona
 * Mika — model tidak dijamin patuh (mis. alamat sekolah panjang bisa membuat
 * AI mengeluarkan width/x yang meluber), jadi ini lapisan enforcement keras
 * sebelum layout tersebut sampai ke kanvas/ekspor. Sebagai langkah terakhir,
 * elemen yang masih saling tumpang tindih didorong agar tidak bertabrakan.
 */
export function sanitizeLayoutElements(elements: unknown): CanvasElement[] {
  if (!Array.isArray(elements)) return [];

  const clamped = elements.map((raw, index) => {
    const el = (raw && typeof raw === "object" ? raw : {}) as Partial<CanvasElement> & Record<string, unknown>;

    const width = clampToCanvas(Number(el.width) || 20, 5, 100);
    const height = clampToCanvas(Number(el.height) || 8, 3, 100);
    const x = clampToCanvas(Number(el.x) || 0, 0, 100 - width);
    let y = clampToCanvas(Number(el.y) || 0, 0, 100 - height);

    if (el.type === "text" && y < MIKA_ZONE_MAX && y + height > MIKA_ZONE_MIN) {
      y = y + height / 2 < MIKA_ZONE_SPLIT
        ? clampToCanvas(MIKA_ZONE_MIN - height, 0, 100 - height)
        : clampToCanvas(MIKA_ZONE_MAX, 0, 100 - height);
    }

    return {
      ...el,
      id: typeof el.id === "string" && el.id ? el.id : `el_${index}_${Date.now()}`,
      x,
      y,
      width,
      height,
      fontSize: el.type === "logo" ? 0 : clampToCanvas(Number(el.fontSize) || 16, 6, 72),
      zIndex: typeof el.zIndex === "number" ? el.zIndex : index,
    } as CanvasElement;
  });

  return resolveVerticalOverlaps(clamped);
}

export const MIN_ELEMENT_SIZE = 3;

export type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export interface ResizeGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Menghitung geometri baru sebuah elemen saat di-resize lewat salah satu dari
 * 8 handle sudut/tepi. Sisi yang berlawanan dengan handle yang ditarik selalu
 * tetap diam (anchor), mirip perilaku resize di Figma/Canva. Ukuran dibatasi
 * minimum MIN_ELEMENT_SIZE dan tidak pernah keluar batas kanvas 0-100.
 *
 * Elemen "Kunci Sumbu X" tetap rata tengah horizontal selama resize (sisi kiri
 * & kanan tumbuh simetris dari tengah), konsisten dengan perilaku drag yang
 * sudah ada untuk elemen terkunci.
 */
export function computeResize(
  start: ResizeGeometry,
  handle: ResizeHandle,
  dxPct: number,
  dyPct: number,
  isLockedX: boolean,
  minSize: number = MIN_ELEMENT_SIZE
): ResizeGeometry {
  const left = start.x;
  const top = start.y;
  const right = start.x + start.width;
  const bottom = start.y + start.height;

  let newLeft = left;
  let newRight = right;
  let newTop = top;
  let newBottom = bottom;

  if (handle.includes("e")) {
    newRight = clampToCanvas(right + dxPct, left + minSize, 100);
  }
  if (handle.includes("w")) {
    newLeft = clampToCanvas(left + dxPct, 0, right - minSize);
  }
  if (handle.includes("s")) {
    newBottom = clampToCanvas(bottom + dyPct, top + minSize, 100);
  }
  if (handle.includes("n")) {
    newTop = clampToCanvas(top + dyPct, 0, bottom - minSize);
  }

  const width = parseFloat((newRight - newLeft).toFixed(2));
  const height = parseFloat((newBottom - newTop).toFixed(2));
  let x = parseFloat(newLeft.toFixed(2));
  const y = parseFloat(newTop.toFixed(2));

  if (isLockedX && (handle.includes("e") || handle.includes("w"))) {
    x = parseFloat(getCenteredX(width).toFixed(2));
  }

  return { x, y, width, height };
}

/** Rasio kartu (lebar/tinggi) berdasarkan ukuran cetak yang dipilih. */
export function getCardRatio(printSize: DesignProject["printSize"]): number {
  return printSize === "Size B (17x23cm)" ? 17 / 23 : 23 / 34;
}

/**
 * Menghitung dimensi gambar yang diimpor agar proporsional, dibatasi
 * maksimal 30% lebar kanvas dan 40% tinggi kanvas.
 */
export function computeImageImportSize(
  imgWidth: number,
  imgHeight: number,
  cardRatio: number,
  maxWidthPct: number = IMAGE_MAX_WIDTH_PCT,
  maxHeightPct: number = IMAGE_MAX_HEIGHT_PCT
): { width: number; height: number } {
  let w = maxWidthPct;
  let h = w * (imgHeight / imgWidth) * cardRatio;

  if (h > maxHeightPct) {
    h = maxHeightPct;
    w = (h * (imgWidth / imgHeight)) / cardRatio;
  }

  return {
    width: parseFloat(w.toFixed(2)),
    height: parseFloat(h.toFixed(2)),
  };
}
