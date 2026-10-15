import jsPDF from "jspdf";
import type { CanvasElement, DesignProject } from "./types";
import { getPrintSizeCm } from "./canvasConstraints";
import { fitTextInBox, scaledInitialFontSize } from "./textLayout";
import { logoIconPaths, LOGO_ICON_STROKE_WIDTH } from "./logoIcons";
import { PathCmd, escapeXml, parseCustomSvg, parsePath } from "./svgUtils";

/**
 * Ekspor vektor sampul untuk percetakan (pembuatan klise foil / sablon).
 *
 * Alurnya: proyek -> "scene" (primitif vektor dalam mm, ukuran fisik asli) ->
 * SVG atau PDF. Hanya ARTWORK yang diekspor (tanpa warna bahan & tanpa
 * gambar mika), satu warna sesuai tinta. Teks sudah dipecah per baris dengan
 * algoritma yang sama persis dengan ekspor PNG (lib/textLayout.ts), jadi
 * posisi & ukuran huruf identik dengan pratinjau.
 *
 * Catatan: teks tetap berupa TEKS (font Times/Arial), bukan kurva. PDF
 * memakai font standar PDF (Times/Helvetica, metrik setara Times New Roman/
 * Arial) sehingga aman dibuka di mesin mana pun; ubah ke kurva di CorelDRAW
 * sebelum membuat klise. Gambar raster tidak bersifat vektor.
 */

/** Lebar kanvas ukur — sama dengan kanvas ekspor PNG supaya pemenggalan baris identik. */
export const EXPORT_CANVAS_WIDTH_PX = 1600;

export type SceneItem =
  | { kind: "rect"; x: number; y: number; w: number; h: number; fill: string }
  | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number; fill: string }
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number; stroke: string; width: number }
  | { kind: "path"; cmds: PathCmd[]; fill?: string; stroke?: string; strokeWidth?: number; evenOdd?: boolean }
  | {
      kind: "text";
      lines: string[];
      x: number;
      y0: number;
      lineHeight: number;
      size: number;
      anchor: "start" | "middle" | "end";
      serif: boolean;
      bold: boolean;
      fill: string;
    }
  | { kind: "image"; x: number; y: number; w: number; h: number; href: string };

export interface VectorScene {
  widthMm: number;
  heightMm: number;
  items: SceneItem[];
}

const MM_TO_PT = 72 / 25.4;

/** Skala + geser perintah path dari koordinat sumber ke mm. */
function transformCmds(cmds: PathCmd[], ox: number, oy: number, s: number, minX = 0, minY = 0): PathCmd[] {
  return cmds.map((c) => ({
    op: c.op,
    p: c.p.map((n, i) => (i % 2 === 0 ? ox + (n - minX) * s : oy + (n - minY) * s)),
  }));
}

/** Pasang kotak sumber (sw x sh) ke dalam kotak tujuan, rata tengah, tanpa distorsi. */
function fitInto(sw: number, sh: number, x: number, y: number, w: number, h: number) {
  const s = Math.min(w / sw, h / sh);
  return { s, ox: x + (w - sw * s) / 2, oy: y + (h - sh * s) / 2 };
}

/** Bangun scene vektor dari proyek. `ctx` = konteks Canvas 2D untuk mengukur teks. */
export function buildScene(project: DesignProject, ctx: CanvasRenderingContext2D): VectorScene {
  const { width: wCm, height: hCm } = getPrintSizeCm(project.printSize);
  const widthMm = wCm * 10;
  const heightMm = hCm * 10;
  const canvasW = EXPORT_CANVAS_WIDTH_PX;
  const canvasH = (canvasW / widthMm) * heightMm;
  const k = widthMm / canvasW; // px kanvas ukur -> mm
  const items: SceneItem[] = [];

  const sorted = [...project.elements].sort((a, b) => a.zIndex - b.zIndex);
  for (const el of sorted) {
    const x = (el.x / 100) * widthMm;
    const y = (el.y / 100) * heightMm;
    const w = (el.width / 100) * widthMm;
    const h = (el.height / 100) * heightMm;
    const color = el.color || "#000000";

    if (el.type === "shape") {
      if (el.shapeType === "circle") {
        items.push({ kind: "ellipse", cx: x + w / 2, cy: y + h / 2, rx: w / 2, ry: h / 2, fill: color });
      } else if (el.shapeType === "line") {
        // Sama dengan ekspor PNG: tebal garis = height * 2 px pada kanvas 1600 px.
        items.push({ kind: "line", x1: x, y1: y, x2: x + w, y2: y, stroke: color, width: (el.height || 3) * 2 * k });
      } else {
        items.push({ kind: "rect", x, y, w, h, fill: color });
      }
    } else if (el.type === "text" && el.text && el.text.trim()) {
      const fontFamily = el.fontFamily || "Times New Roman";
      const fontWeight = el.fontWeight || "normal";
      const box = { x: 0, y: 0, width: (el.width / 100) * canvasW, height: (el.height / 100) * canvasH };
      const fit = fitTextInBox(ctx, el.text, box, scaledInitialFontSize(el.fontSize, canvasW), fontFamily, fontWeight);
      if (fit.lines.length === 0) continue;

      const align = el.align || "left";
      items.push({
        kind: "text",
        lines: fit.lines,
        x: align === "center" ? x + w / 2 : align === "right" ? x + w : x,
        y0: y + fit.startY * k,
        lineHeight: fit.lineHeight * k,
        size: fit.fontSize * k,
        anchor: align === "center" ? "middle" : align === "right" ? "end" : "start",
        serif: /times|serif|georgia|garamond/i.test(fontFamily) && !/sans/i.test(fontFamily),
        bold: fontWeight === "bold",
        fill: color,
      });
    } else if (el.type === "logo") {
      const { s, ox, oy } = fitInto(100, 100, x, y, w, h);
      for (const icon of logoIconPaths(el.logoIcon)) {
        const cmds = transformCmds(parsePath(icon.d), ox, oy, s);
        items.push(
          icon.outline
            ? { kind: "path", cmds, fill: color, stroke: color, strokeWidth: LOGO_ICON_STROKE_WIDTH * s }
            : { kind: "path", cmds, fill: color }
        );
      }
    } else if (el.type === "custom_svg" && el.customSvg) {
      const { viewBox, inner } = parseCustomSvg(el.customSvg);
      const [minX, minY, vw, vh] = viewBox;
      const { s, ox, oy } = fitInto(vw, vh, x, y, w, h);
      const evenOdd = /fill-rule="evenodd"/i.test(inner);
      for (const m of inner.matchAll(/<path\b[^>]*?\sd="([^"]+)"/gi)) {
        items.push({ kind: "path", cmds: transformCmds(parsePath(m[1]), ox, oy, s, minX, minY), fill: color, evenOdd });
      }
    } else if (el.type === "image" && el.imageUrl) {
      items.push({ kind: "image", x, y, w, h, href: el.imageUrl });
    }
  }

  return { widthMm, heightMm, items };
}

const f3 = (n: number) => String(parseFloat(n.toFixed(3)));

function pathD(cmds: PathCmd[]): string {
  return cmds.map((c) => (c.op === "Z" ? "Z" : `${c.op}${c.p.map(f3).join(" ")}`)).join(" ");
}

/** Serialisasi scene ke SVG berukuran fisik (width/height dalam mm). */
export function sceneToSvg(scene: VectorScene): string {
  const parts = scene.items.map((it) => {
    switch (it.kind) {
      case "rect":
        return `<rect x="${f3(it.x)}" y="${f3(it.y)}" width="${f3(it.w)}" height="${f3(it.h)}" fill="${it.fill}"/>`;
      case "ellipse":
        return `<ellipse cx="${f3(it.cx)}" cy="${f3(it.cy)}" rx="${f3(it.rx)}" ry="${f3(it.ry)}" fill="${it.fill}"/>`;
      case "line":
        return `<line x1="${f3(it.x1)}" y1="${f3(it.y1)}" x2="${f3(it.x2)}" y2="${f3(it.y2)}" stroke="${it.stroke}" stroke-width="${f3(it.width)}"/>`;
      case "path": {
        const stroke = it.stroke
          ? ` stroke="${it.stroke}" stroke-width="${f3(it.strokeWidth ?? 0)}" stroke-linecap="round"`
          : "";
        const rule = it.evenOdd ? ` fill-rule="evenodd"` : "";
        return `<path d="${pathD(it.cmds)}" fill="${it.fill ?? "none"}"${rule}${stroke}/>`;
      }
      case "text": {
        const family = it.serif ? `'Times New Roman', Times, serif` : `Arial, Helvetica, sans-serif`;
        return it.lines
          .map(
            (line, i) =>
              `<text x="${f3(it.x)}" y="${f3(it.y0 + i * it.lineHeight)}" font-family="${family}" font-size="${f3(it.size)}" font-weight="${it.bold ? "bold" : "normal"}" text-anchor="${it.anchor}" fill="${it.fill}">${escapeXml(line)}</text>`
          )
          .join("");
      }
      case "image":
        return `<image x="${f3(it.x)}" y="${f3(it.y)}" width="${f3(it.w)}" height="${f3(it.h)}" href="${escapeXml(it.href)}" preserveAspectRatio="none"/>`;
    }
  });

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${f3(scene.widthMm)}mm" height="${f3(scene.heightMm)}mm" ` +
    `viewBox="0 0 ${f3(scene.widthMm)} ${f3(scene.heightMm)}">${parts.join("")}</svg>`
  );
}

/** Serialisasi scene ke PDF vektor satu halaman berukuran fisik (mm). */
export function sceneToPdf(scene: VectorScene, title = "Sampul Rapor"): jsPDF {
  const doc = new jsPDF({
    orientation: scene.heightMm >= scene.widthMm ? "portrait" : "landscape",
    unit: "mm",
    format: [scene.widthMm, scene.heightMm],
  });
  doc.setProperties({ title, creator: "Page Free" });

  for (const it of scene.items) {
    switch (it.kind) {
      case "rect":
        doc.setFillColor(it.fill);
        doc.rect(it.x, it.y, it.w, it.h, "F");
        break;
      case "ellipse":
        doc.setFillColor(it.fill);
        doc.ellipse(it.cx, it.cy, it.rx, it.ry, "F");
        break;
      case "line":
        doc.setDrawColor(it.stroke);
        doc.setLineWidth(it.width);
        doc.line(it.x1, it.y1, it.x2, it.y2);
        break;
      case "path": {
        for (const c of it.cmds) {
          if (c.op === "M") doc.moveTo(c.p[0], c.p[1]);
          else if (c.op === "L") doc.lineTo(c.p[0], c.p[1]);
          else if (c.op === "C") doc.curveTo(c.p[0], c.p[1], c.p[2], c.p[3], c.p[4], c.p[5]);
          else doc.close();
        }
        if (it.fill) doc.setFillColor(it.fill);
        if (it.stroke) {
          doc.setDrawColor(it.stroke);
          doc.setLineWidth(it.strokeWidth ?? 0.2);
          doc.setLineCap("round");
        }
        if (it.fill && it.stroke) {
          if (it.evenOdd) doc.fillStrokeEvenOdd();
          else doc.fillStroke();
        } else if (it.fill) {
          if (it.evenOdd) doc.fillEvenOdd();
          else doc.fill();
        } else {
          doc.stroke();
        }
        break;
      }
      case "text": {
        doc.setFont(it.serif ? "times" : "helvetica", it.bold ? "bold" : "normal");
        doc.setFontSize(it.size * MM_TO_PT);
        doc.setTextColor(it.fill);
        const align = it.anchor === "middle" ? "center" : it.anchor === "end" ? "right" : "left";
        it.lines.forEach((line, i) => doc.text(line, it.x, it.y0 + i * it.lineHeight, { align }));
        break;
      }
      case "image": {
        const fmt = it.href.match(/^data:image\/(png|jpe?g|webp)/i)?.[1]?.toUpperCase().replace("JPG", "JPEG");
        if (fmt) doc.addImage(it.href, fmt, it.x, it.y, it.w, it.h);
        break;
      }
    }
  }
  return doc;
}

/** Elemen yang tidak bisa diekspor sebagai vektor (untuk peringatan di UI). */
export function nonVectorElements(elements: CanvasElement[]): CanvasElement[] {
  return elements.filter((e) => e.type === "image");
}
