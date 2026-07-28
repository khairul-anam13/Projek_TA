/**
 * Definisi tekstur bahan (efek permukaan bertekstur, mis. kulit/ASE) yang
 * dipakai di kanvas editor, preview (3D & flat), MAUPUN hasil ekspor
 * PNG/PDF — satu sumber kebenaran untuk parameter visualnya.
 *
 * Riwayat bug: lapisan ini sebelumnya hanya diimplementasikan sebagai efek
 * SVG filter di komponen on-screen (EditorPage & PreviewPage), sementara
 * pipeline ekspor (generateHighResFile di PreviewPage.tsx) menggambar ulang
 * kanvas secara manual lewat Canvas 2D API TANPA lapisan ini sama sekali —
 * hasilnya, file yang diekspor terlihat polos (hanya elemen teks/bentuk)
 * dibanding tampilan kaya-tekstur di editor/preview. Modul ini dipakai oleh
 * kedua sisi (JSX on-screen & string SVG untuk di-rasterisasi ke Canvas 2D)
 * supaya parameternya tidak bisa lagi diam-diam berbeda.
 */

export const MATERIAL_TEXTURE_OPACITY = 0.6;
export const MATERIAL_TEXTURE_BLEND_MODE = "multiply" as const;
export const MATERIAL_TEXTURE_BASE_FREQUENCY = 0.05;
export const MATERIAL_TEXTURE_NUM_OCTAVES = 3;
// feColorMatrix: pertahankan RGB=0 (hitam), pakai channel alpha noise * 0.3
// sebagai kekuatan efeknya.
export const MATERIAL_TEXTURE_COLOR_MATRIX_VALUES =
  "0 0 0 0 0   0 0 0 0 0   0 0 0 0 0   0 0 0 0.3 0";

/**
 * SVG utuh (siap dipakai sebagai data URL) berisi satu rect bertekstur pada
 * ukuran piksel yang diberikan. Dipakai oleh pipeline ekspor Canvas 2D
 * (lib tidak bisa langsung merender elemen React <svg> ke canvas, jadi
 * dirender dulu sebagai image lalu di-drawImage dengan opacity & blend mode
 * yang sama seperti versi on-screen).
 */
export function materialTextureSvgString(widthPx: number, heightPx: number): string {
  const filterId = "material-texture-export";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${widthPx}" height="${heightPx}">` +
    `<filter id="${filterId}">` +
    `<feTurbulence type="fractalNoise" baseFrequency="${MATERIAL_TEXTURE_BASE_FREQUENCY}" numOctaves="${MATERIAL_TEXTURE_NUM_OCTAVES}" result="noise" />` +
    `<feColorMatrix type="matrix" values="${MATERIAL_TEXTURE_COLOR_MATRIX_VALUES}" />` +
    `</filter>` +
    `<rect width="100%" height="100%" filter="url(#${filterId})" />` +
    `</svg>`
  );
}
