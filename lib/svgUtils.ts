/**
 * Helper untuk menyiapkan markup SVG hasil tracing (custom_svg) sebelum
 * dirender ulang di editor, preview, dan pipeline ekspor. Sebelumnya logika
 * regex ini diketik ulang identik di tiga tempat berbeda.
 */

/** Menyeragamkan semua fill="..." pada markup SVG ke satu warna elemen. */
export function applySvgFillColor(svgMarkup: string, color: string): string {
  return svgMarkup.replace(/fill="[^"]*"/g, `fill="${color}"`);
}

/**
 * Membuang atribut x/y/width/height lama pada tag <svg> root (akan diganti
 * pemanggil sesuai konteks render) dan memastikan preserveAspectRatio ada
 * supaya proporsi gambar tidak gepeng saat di-resize.
 */
export function stripSvgPositionAttrs(svgMarkup: string): string {
  return svgMarkup.replace(/<svg([^>]*)>/, (_match, attrs: string) => {
    let cleaned = attrs.replace(/\s(x|y|width|height)="[^"]*"/g, "");
    if (!cleaned.includes("preserveAspectRatio")) {
      cleaned += ' preserveAspectRatio="xMidYMid meet"';
    }
    return `<svg${cleaned}>`;
  });
}

/** Menyisipkan atribut baru (posisi/ukuran) ke tag <svg> root. */
export function withSvgAttrs(svgMarkup: string, extraAttrs: string): string {
  return svgMarkup.replace("<svg", `<svg ${extraAttrs}`);
}

/** Gabungan: warnai + bersihkan posisi lama + pasang posisi/ukuran baru, siap dirender. */
export function prepareCustomSvgMarkup(svgMarkup: string, color: string, positionAttrs: string): string {
  return withSvgAttrs(stripSvgPositionAttrs(applySvgFillColor(svgMarkup, color)), positionAttrs);
}
