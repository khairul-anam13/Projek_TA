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
