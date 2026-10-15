/**
 * Ikon logo bawaan (kotak 100x100), satu sumber untuk editor, preview, ekspor
 * PNG, dan ekspor vektor. `outline: true` = diisi DAN diberi garis tepi
 * (ikon "building" digambar dengan garis).
 */

export interface IconPath {
  d: string;
  outline?: boolean;
}

export const LOGO_ICON_STROKE_WIDTH = 4;

const CIRCLE: IconPath = {
  d: "M90,50 C90,72.09 72.09,90 50,90 C27.91,90 10,72.09 10,50 C10,27.91 27.91,10 50,10 C72.09,10 90,27.91 90,50 Z",
};

const ICONS: Record<string, IconPath[]> = {
  sparkles: [
    { d: "M50,0 L57,37 L94,44 L57,51 L50,88 L43,51 L6,44 L43,37 Z M25,12 L28,21 L37,23 L28,25 L25,34 L22,25 L13,23 L22,21 Z" },
  ],
  mortarboard: [
    { d: "M50,15 L90,35 L50,55 L10,35 Z" },
    { d: "M25,48 L25,75 L50,88 L75,75 L75,48 L50,60 Z" },
    { d: "M85,35 L85,65 L89,68 L89,37 Z" },
  ],
  shield: [
    { d: "M50,10 C70,10 85,18 85,18 C85,18 85,55 50,85 C15,55 15,18 15,18 C15,18 30,10 50,10 Z" },
  ],
  leaf: [{ d: "M15,90 C15,90 35,40 85,15 C85,15 80,50 50,75 C30,92 15,90 15,90 Z" }],
  building: [
    {
      d: "M10,90 L90,90 M20,90 L20,30 L50,10 L80,30 L80,90 M30,40 L40,40 M30,55 L40,55 M60,40 L70,40 M60,55 L70,55",
      outline: true,
    },
  ],
};

/** Ikon yang tersedia di panel Insert editor. */
export const LOGO_ICON_NAMES = ["mortarboard", "shield", "sparkles", "leaf", "building"] as const;

/** Path ikon; nama tak dikenal jatuh ke lingkaran polos. */
export function logoIconPaths(icon?: string): IconPath[] {
  return ICONS[icon ?? ""] ?? [CIRCLE];
}

/** Markup SVG (di dalam viewBox 0 0 100 100) untuk satu ikon. */
export function logoIconMarkup(icon: string | undefined, color: string): string {
  return logoIconPaths(icon)
    .map((p) =>
      p.outline
        ? `<path d="${p.d}" fill="${color}" stroke="${color}" stroke-width="${LOGO_ICON_STROKE_WIDTH}" stroke-linecap="round"/>`
        : `<path d="${p.d}" fill="${color}"/>`
    )
    .join("");
}
