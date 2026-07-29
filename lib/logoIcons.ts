/**
 * Sumber tunggal path SVG untuk ikon logo/stamp (dipakai di EditorPage,
 * PreviewPage, dan pipeline ekspor Canvas 2D). Sebelumnya path yang sama
 * diketik ulang di tiga tempat berbeda dan bisa saling drift (mis. ikon
 * "building" pernah hanya ada di EditorPage, hilang dari preview & ekspor).
 */

export type LogoIconName = "sparkles" | "mortarboard" | "shield" | "leaf" | "building";

const LOGO_ICON_MARKUP: Record<LogoIconName, (color: string) => string> = {
  sparkles: (c) =>
    `<path fill="${c}" d="M50,0 L57,37 L94,44 L57,51 L50,88 L43,51 L6,44 L43,37 Z M25,12 L28,21 L37,23 L28,25 L25,34 L22,25 L13,23 L22,21 Z"/>`,
  mortarboard: (c) =>
    `<g fill="${c}"><polygon points="50,15 90,35 50,55 10,35"/><polygon points="25,48 25,75 50,88 75,75 75,48 50,60"/><polygon points="85,35 85,65 89,68 89,37"/></g>`,
  shield: (c) =>
    `<path fill="${c}" d="M50,10 C70,10 85,18 85,18 C85,18 85,55 50,85 C15,55 15,18 15,18 C15,18 30,10 50,10 Z"/>`,
  leaf: (c) =>
    `<path fill="${c}" d="M15,90 C15,90 35,40 85,15 C85,15 80,50 50,75 C30,92 15,90 15,90 Z"/>`,
  building: (c) =>
    `<path fill="${c}" stroke="${c}" stroke-width="4" stroke-linecap="round" d="M10,90 L90,90 M20,90 L20,30 L50,10 L80,30 L80,90 M30,40 L40,40 M30,55 L40,55 M60,40 L70,40 M60,55 L70,55"/>`,
};

/** Markup isi (`<path>`/`<g>`) untuk satu ikon; lingkaran polos sebagai fallback bila nama ikon tidak dikenal. */
export function getLogoIconMarkup(icon: string | undefined, color: string): string {
  const build = LOGO_ICON_MARKUP[icon as LogoIconName];
  return build ? build(color) : `<circle cx="50" cy="50" r="40" fill="${color}"/>`;
}

/** SVG `<svg>...</svg>` lengkap berukuran piksel, siap dijadikan data URL (dipakai pipeline ekspor Canvas 2D). */
export function getLogoIconSvgString(icon: string | undefined, color: string, width: number, height: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">${getLogoIconMarkup(icon, color)}</svg>`;
}

export const LOGO_ICON_LIST: { icon: LogoIconName; label: string }[] = [
  { icon: "mortarboard", label: "Toga" },
  { icon: "shield", label: "Perisai" },
  { icon: "sparkles", label: "Bintang" },
  { icon: "leaf", label: "Daun" },
  { icon: "building", label: "Gedung" },
];
