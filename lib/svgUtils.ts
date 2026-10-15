/**
 * Utilitas SVG kecil yang dipakai bersama oleh editor, preview, dan ekspor
 * vektor: parser path (M/L/H/V/C/Z, absolut & relatif) dan normalisasi SVG
 * hasil tracing (potrace) supaya selalu punya viewBox.
 */

export type PathCmd = { op: "M" | "L" | "C" | "Z"; p: number[] };

/** Mengurai atribut `d` SVG menjadi perintah M/L/C/Z absolut (H/V/relatif dinormalkan). */
export function parsePath(d: string): PathCmd[] {
  const tokens = d.match(/[MmLlHhVvCcZz]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? [];
  const out: PathCmd[] = [];
  let i = 0;
  let cmd = "";
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  const num = () => parseFloat(tokens[i++]);

  while (i < tokens.length) {
    if (/^[a-z]$/i.test(tokens[i])) cmd = tokens[i++];
    const rel = cmd !== "" && cmd === cmd.toLowerCase();

    switch (cmd.toUpperCase()) {
      case "M": {
        let nx = num();
        let ny = num();
        if (rel) { nx += x; ny += y; }
        x = startX = nx;
        y = startY = ny;
        out.push({ op: "M", p: [x, y] });
        cmd = rel ? "l" : "L"; // koordinat lanjutan setelah M dianggap L
        break;
      }
      case "L": {
        let nx = num();
        let ny = num();
        if (rel) { nx += x; ny += y; }
        x = nx;
        y = ny;
        out.push({ op: "L", p: [x, y] });
        break;
      }
      case "H": {
        const nx = num();
        x = rel ? x + nx : nx;
        out.push({ op: "L", p: [x, y] });
        break;
      }
      case "V": {
        const ny = num();
        y = rel ? y + ny : ny;
        out.push({ op: "L", p: [x, y] });
        break;
      }
      case "C": {
        const v = [num(), num(), num(), num(), num(), num()];
        const p = rel ? v.map((n, k) => n + (k % 2 === 0 ? x : y)) : v;
        x = p[4];
        y = p[5];
        out.push({ op: "C", p });
        break;
      }
      case "Z": {
        out.push({ op: "Z", p: [] });
        x = startX;
        y = startY;
        break;
      }
      default:
        i++; // perintah tak didukung (A/Q/S): lewati token
    }
  }
  return out.filter((c) => c.op === "Z" || c.p.every((n) => Number.isFinite(n)));
}

export interface ParsedCustomSvg {
  /** [minX, minY, width, height] sistem koordinat isi SVG. */
  viewBox: [number, number, number, number];
  /** Isi di antara <svg ...> dan </svg>. */
  inner: string;
}

/**
 * SVG hasil potrace (`getSVG`) hanya punya `width`/`height` tanpa `viewBox`,
 * sehingga saat dibungkus <svg x y width height> koordinat path-nya tidak
 * ikut diskalakan. Fungsi ini memastikan viewBox selalu tersedia.
 */
export function parseCustomSvg(svg: string): ParsedCustomSvg {
  const m = svg.match(/<svg([^>]*)>([\s\S]*)<\/svg>\s*$/i);
  const attrs = m?.[1] ?? "";
  const inner = m?.[2] ?? svg;

  const vb = attrs.match(/viewBox="([^"]+)"/i)?.[1].trim().split(/[\s,]+/).map(Number);
  if (vb && vb.length === 4 && vb.every(Number.isFinite) && vb[2] > 0 && vb[3] > 0) {
    return { viewBox: [vb[0], vb[1], vb[2], vb[3]], inner };
  }

  const w = parseFloat(attrs.match(/\swidth="([\d.]+)/i)?.[1] ?? "");
  const h = parseFloat(attrs.match(/\sheight="([\d.]+)/i)?.[1] ?? "");
  return { viewBox: [0, 0, w > 0 ? w : 100, h > 0 ? h : 100], inner };
}

/**
 * Markup <svg> bersarang untuk `customSvg` (satu warna). `attrs` berisi
 * atribut posisi/ukuran (x, y, width, height) sesuai konteks pemakaian.
 */
export function customSvgMarkup(svg: string, color: string, attrs: string): string {
  const { viewBox, inner } = parseCustomSvg(svg);
  const body = inner.replace(/fill="[^"]*"/g, `fill="${color}"`);
  return `<svg ${attrs} viewBox="${viewBox.join(" ")}" preserveAspectRatio="xMidYMid meet" overflow="visible">${body}</svg>`;
}

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
