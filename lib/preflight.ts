import type { CanvasElement, DesignProject } from "./types";
import { getMikaRect, getPrintSizeCm } from "./canvasConstraints";
import type { Rect } from "./canvasConstraints";
import { computeFitLayout, scaledInitialFontSize } from "./textLayout";

/**
 * "Cek siap cetak": aturan fisik produk (foil/sablon di ASE + jendela mika)
 * yang harus dipenuhi sebelum file diserahkan ke percetakan. Murni fungsi
 * dari proyek, tidak mengubah apa pun. Ambang di bawah adalah ASUMSI awal
 * dan sebaiknya dikonfirmasi ke percetakan.
 */

export type IssueSeverity = "error" | "warning";

export interface PreflightIssue {
  severity: IssueSeverity;
  code:
    | "mika-overlap"
    | "out-of-canvas"
    | "safe-margin"
    | "font-too-small"
    | "empty-text"
    | "ink-color"
    | "raster-image"
    | "non-latin"
    | "element-overlap";
  message: string;
  elementId?: string;
}

/** Jarak aman minimum dari tepi sampul (mm). */
export const SAFE_MARGIN_MM = 8;
/** Ukuran huruf minimum (pt) agar stempel foil masih terbaca. */
export const FOIL_MIN_FONT_PT = 7;

export const FOIL_COLOR = "#D4AF37";
const SABLON_COLORS = ["#FFFFFF", "#111111", "#000000"];

// Karakter di luar Latin-1/tanda baca umum tidak ada di font standar PDF.
const NON_LATIN = /[^\u0000-ÿ–—‘’“”•…€]/;

const EXPORT_CANVAS_WIDTH_PX = 1600;

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function label(el: CanvasElement): string {
  if (el.type === "text") return `Teks "${(el.text ?? "").slice(0, 24)}"`;
  if (el.type === "logo") return "Logo";
  if (el.type === "custom_svg") return "Logo vektor";
  if (el.type === "image") return "Gambar";
  return "Bentuk";
}

export function runPreflight(project: DesignProject): PreflightIssue[] {
  const issues: PreflightIssue[] = [];
  const { width: wCm, height: hCm } = getPrintSizeCm(project.printSize);
  const widthMm = wCm * 10;
  const heightMm = hCm * 10;
  const mika = getMikaRect(project.printSize);
  const method = project.printMethod ?? "Embos Foil";
  const marginX = (SAFE_MARGIN_MM / widthMm) * 100;
  const marginY = (SAFE_MARGIN_MM / heightMm) * 100;
  const canvasW = EXPORT_CANVAS_WIDTH_PX;
  const canvasH = (canvasW / widthMm) * heightMm;

  const add = (i: PreflightIssue) => issues.push(i);

  for (const el of project.elements) {
    const name = label(el);

    if (el.x < 0 || el.y < 0 || el.x + el.width > 100 || el.y + el.height > 100) {
      add({ severity: "error", code: "out-of-canvas", elementId: el.id, message: `${name} keluar dari area sampul.` });
    } else if (
      el.x < marginX ||
      el.y < marginY ||
      el.x + el.width > 100 - marginX ||
      el.y + el.height > 100 - marginY
    ) {
      add({
        severity: "warning",
        code: "safe-margin",
        elementId: el.id,
        message: `${name} terlalu dekat tepi (< ${SAFE_MARGIN_MM} mm) dan berisiko terpotong/tidak terstempel.`,
      });
    }

    if (el.type === "text") {
      if (!el.text || !el.text.trim()) {
        add({ severity: "warning", code: "empty-text", elementId: el.id, message: "Ada elemen teks kosong." });
        continue;
      }

      if (overlaps(el, mika)) {
        add({
          severity: "error",
          code: "mika-overlap",
          elementId: el.id,
          message: `${name} menutupi jendela mika nama.`,
        });
      }

      if (NON_LATIN.test(el.text)) {
        add({
          severity: "warning",
          code: "non-latin",
          elementId: el.id,
          message: `${name} memuat karakter non-Latin yang tidak didukung PDF vektor.`,
        });
      }

      // Ukuran huruf SETELAH shrink-to-fit; hanya bermakna di browser (butuh canvas).
      if (typeof document !== "undefined") {
        const { fontSize } = computeFitLayout(
          el.text,
          (el.width / 100) * canvasW,
          (el.height / 100) * canvasH,
          scaledInitialFontSize(el.fontSize, canvasW),
          el.fontFamily || "Times New Roman",
          el.fontWeight || "normal"
        );
        const pt = fontSize * (widthMm / canvasW) * (72 / 25.4);
        if (pt < FOIL_MIN_FONT_PT) {
          add({
            severity: "warning",
            code: "font-too-small",
            elementId: el.id,
            message: `${name} mengecil jadi ±${pt.toFixed(1)} pt (minimum ${FOIL_MIN_FONT_PT} pt). Perbesar kotak atau persingkat teks.`,
          });
        }
      }
    }

    if (el.type === "image") {
      add({
        severity: "warning",
        code: "raster-image",
        elementId: el.id,
        message: "Gambar raster tidak ikut sebagai vektor. Ubah lewat Tracing ke Vector (B&W).",
      });
    }

    if (el.type !== "image") {
      const color = (el.color || "").toUpperCase();
      const ok = method === "Embos Foil" ? color === FOIL_COLOR : SABLON_COLORS.includes(color);
      if (!ok) {
        add({
          severity: "error",
          code: "ink-color",
          elementId: el.id,
          message: `${name} berwarna ${el.color || "tanpa warna"}; ${method} hanya ${method === "Embos Foil" ? "emas (#D4AF37)" : "hitam/putih"}.`,
        });
      }
    }
  }

  // Tumpang tindih antar konten (teks/logo); bentuk dekoratif sengaja diabaikan.
  const content = project.elements.filter((e) => e.type === "text" || e.type === "logo" || e.type === "custom_svg");
  for (let i = 0; i < content.length; i++) {
    for (let j = i + 1; j < content.length; j++) {
      if (overlaps(content[i], content[j])) {
        add({
          severity: "warning",
          code: "element-overlap",
          elementId: content[j].id,
          message: `${label(content[i])} dan ${label(content[j]).toLowerCase()} saling bertumpukan.`,
        });
      }
    }
  }

  return issues.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "error" ? -1 : 1));
}

export function preflightSummary(issues: PreflightIssue[]): { errors: number; warnings: number } {
  return {
    errors: issues.filter((i) => i.severity === "error").length,
    warnings: issues.filter((i) => i.severity === "warning").length,
  };
}
