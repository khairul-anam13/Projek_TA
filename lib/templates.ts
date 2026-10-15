import { CanvasElement, DesignProject, PrintSize, SchoolFieldKey } from "./types";
import { getMikaRect, getPrintSizeCm } from "./canvasConstraints";
import { getMockupTemplate } from "./mockupTemplates";

/**
 * Registry template sampul rapor (kurasi sendiri) + pengikatan data sekolah.
 *
 * Setiap template menghasilkan `CanvasElement[]` untuk ukuran cetak tertentu.
 * Elemen teks membawa `bind` (judulRapor/namaSekolah/alamatSekolah/
 * subInformasi) sehingga mengganti data sekolah memperbarui semua elemen
 * terikat sekaligus (lihat applyBindings). Tata letak dihitung dari posisi
 * mika fisik per ukuran, jadi blok atas/bawah selalu menghindari jendela mika.
 */

export type SchoolData = Partial<Record<SchoolFieldKey, string>>;

export const SCHOOL_FIELDS: { key: SchoolFieldKey; label: string; multiline?: boolean }[] = [
  { key: "judulRapor", label: "Judul rapor" },
  { key: "namaSekolah", label: "Nama sekolah" },
  { key: "alamatSekolah", label: "Alamat sekolah" },
  { key: "subInformasi", label: "Sub informasi", multiline: true },
];

const FIELD_DEFAULTS: Record<SchoolFieldKey, string> = {
  judulRapor: "RAPOR PESERTA DIDIK",
  namaSekolah: "NAMA SEKOLAH",
  alamatSekolah: "Alamat Sekolah",
  subInformasi: "Keterangan Tambahan",
};

const UPPERCASE_FIELDS: SchoolFieldKey[] = ["judulRapor", "namaSekolah"];

/** Teks tampil untuk satu field: kosong -> placeholder; judul & nama sekolah KAPITAL. */
export function bindText(key: SchoolFieldKey, data: SchoolData): string {
  const raw = data[key];
  const value = raw && raw.trim() ? raw : FIELD_DEFAULTS[key];
  return UPPERCASE_FIELDS.includes(key) ? value.toUpperCase() : value;
}

/** Terapkan data sekolah ke elemen yang punya `bind`; field yang belum ada di data dibiarkan. */
export function applyBindings(elements: CanvasElement[], data: SchoolData): CanvasElement[] {
  return elements.map((el) =>
    el.bind && data[el.bind] !== undefined ? { ...el, text: bindText(el.bind, data) } : el
  );
}

/** Data sekolah yang hilang (proyek lama) diisi dari teks elemen terikat yang sudah ada. */
export function deriveSchoolData(elements: CanvasElement[], existing: SchoolData = {}): SchoolData {
  const data: SchoolData = { ...existing };
  for (const el of elements) {
    if (el.bind && data[el.bind] === undefined && el.text !== undefined) data[el.bind] = el.text;
  }
  return data;
}

/** Proyek lama belum punya `bind`; tebak dari id elemen bawaan template/AI. */
export function withInferredBindings(elements: CanvasElement[]): CanvasElement[] {
  const map: [RegExp, SchoolFieldKey][] = [
    [/^el_title/, "judulRapor"],
    [/^el_school/, "namaSekolah"],
    [/^el_address/, "alamatSekolah"],
    [/^el_(subinfo|sub_info)/, "subInformasi"],
  ];
  return elements.map((el) => {
    if (el.type !== "text" || el.bind) return el;
    const hit = map.find(([re]) => re.test(el.id));
    return hit ? { ...el, bind: hit[1] } : el;
  });
}

export interface TemplateContext {
  data: SchoolData;
  mockupType: string;
  printSize?: PrintSize;
}

export interface CoverTemplate {
  id: string;
  nama: string;
  gaya: string;
  deskripsi: string;
  build: (ctx: TemplateContext) => CanvasElement[];
}

const GOLD = "#D4AF37";
const FONT = "Times New Roman";
const r2 = (n: number) => parseFloat(n.toFixed(2));

type BlockKey = "title" | "logo" | "school" | "address";

interface Block {
  key: BlockKey;
  weight: number;
  /** Override properti elemen (mis. ukuran font) untuk blok ini. */
  props?: Partial<CanvasElement>;
}

/** Alat bantu geometri & pembuat elemen untuk satu pemanggilan template. */
function toolkit(ctx: TemplateContext) {
  const { width, height } = getPrintSizeCm(ctx.printSize);
  const wMm = width * 10;
  const hMm = height * 10;
  const mika = getMikaRect(ctx.printSize);
  const stamp = Date.now();
  let z = 0;

  const px = (mm: number) => r2((mm / wMm) * 100);
  const py = (mm: number) => r2((mm / hMm) * 100);
  const id = (name: string) => `el_${name}_${stamp}`;

  /** Batas bawah blok atas & batas atas blok bawah, dengan jarak aman dari mika. */
  const topEnd = r2(mika.y - 4);
  const bottomStart = r2(mika.y + mika.height + 3);

  const text = (name: string, bind: SchoolFieldKey, o: Partial<CanvasElement>): CanvasElement => ({
    id: id(name),
    type: "text",
    bind,
    text: bindText(bind, ctx.data),
    x: 10,
    y: 0,
    width: 80,
    height: 8,
    fontSize: 23,
    fontWeight: "normal",
    fontFamily: FONT,
    color: GOLD,
    align: "center",
    isLockedX: true,
    zIndex: ++z,
    ...o,
  });

  const logo = (y: number, h: number, o: Partial<CanvasElement> = {}): CanvasElement => {
    // Persegi secara fisik: lebar% = tinggi% * (tinggi mm / lebar mm).
    const w = r2(Math.min(40, (h * hMm) / wMm));
    return {
      id: id("logo"),
      type: "logo",
      logoIcon: ctx.mockupType === "Rapor MAN" ? "building" : "shield",
      x: r2(50 - w / 2),
      y: r2(y),
      width: w,
      height: r2(h),
      color: GOLD,
      isLockedX: true,
      zIndex: ++z,
      ...o,
    };
  };

  const bar = (name: string, x: number, y: number, w: number, h: number): CanvasElement => ({
    id: id(name),
    type: "shape",
    shapeType: "rectangle",
    x: r2(x),
    y: r2(y),
    width: r2(w),
    height: r2(h),
    color: GOLD,
    isLockedX: false,
    zIndex: ++z,
  });

  /** Bingkai persegi panjang dari 4 batang tipis (inset & tebal dalam mm). */
  const frame = (name: string, insetMm: number, thickMm: number): CanvasElement[] => [
    bar(`${name}_t`, px(insetMm), py(insetMm), 100 - 2 * px(insetMm), py(thickMm)),
    bar(`${name}_b`, px(insetMm), 100 - py(insetMm) - py(thickMm), 100 - 2 * px(insetMm), py(thickMm)),
    bar(`${name}_l`, px(insetMm), py(insetMm), px(thickMm), 100 - 2 * py(insetMm)),
    bar(`${name}_r`, 100 - px(insetMm) - px(thickMm), py(insetMm), px(thickMm), 100 - 2 * py(insetMm)),
  ];

  /** Siku sudut (L) di keempat sudut. */
  const corners = (name: string, insetMm: number, lenMm: number, thickMm: number): CanvasElement[] => {
    const out: CanvasElement[] = [];
    const xs = [px(insetMm), 100 - px(insetMm) - px(lenMm)];
    const ys = [py(insetMm), 100 - py(insetMm) - py(lenMm)];
    xs.forEach((x, xi) =>
      ys.forEach((y, yi) => {
        const right = xi === 1;
        const bottom = yi === 1;
        out.push(bar(`${name}_h${xi}${yi}`, x, bottom ? y + py(lenMm) - py(thickMm) : y, px(lenMm), py(thickMm)));
        out.push(bar(`${name}_v${xi}${yi}`, right ? x + px(lenMm) - px(thickMm) : x, y, px(thickMm), py(lenMm)));
      })
    );
    return out;
  };

  /**
   * Menyusun blok atas (judul/logo/nama sekolah/alamat) dari atas ke bawah di
   * dalam [t0, topEnd], membagi tinggi sesuai bobot. Mengembalikan elemen
   * beserta posisi tiap blok (untuk menaruh dekorasi di antaranya).
   */
  const stack = (
    blocks: Block[],
    t0: number,
    gapWeight: number,
    layout: { align?: "left" | "center"; logoHeightMax?: number; end?: number } = {}
  ) => {
    const total = blocks.reduce((s, b) => s + b.weight, 0) + gapWeight * (blocks.length - 1);
    const unit = ((layout.end ?? topEnd) - t0) / total;
    const left = layout.align === "left";
    const pos: Partial<Record<BlockKey, { y: number; h: number }>> = {};
    const elements: CanvasElement[] = [];
    let y = t0;

    for (const b of blocks) {
      const h = b.weight * unit;
      pos[b.key] = { y, h };
      const common: Partial<CanvasElement> = left
        ? { align: "left", isLockedX: false, x: 10 }
        : {};

      if (b.key === "logo") {
        elements.push(
          logo(y, Math.min(h, layout.logoHeightMax ?? h), left ? { x: 10, isLockedX: false, ...b.props } : b.props)
        );
      } else if (b.key === "title") {
        elements.push(text("title", "judulRapor", { y: r2(y), height: r2(h), fontSize: 43, fontWeight: "bold", ...common, ...b.props }));
      } else if (b.key === "school") {
        elements.push(text("school", "namaSekolah", { y: r2(y), height: r2(h), fontSize: 33, fontWeight: "bold", ...common, ...b.props }));
      } else {
        elements.push(text("address", "alamatSekolah", { y: r2(y), height: r2(h), fontSize: 23, ...common, ...b.props }));
      }
      y += h + gapWeight * unit;
    }
    return { elements, pos };
  };

  /** Teks sub-informasi di bawah mika. */
  const subInfo = (o: Partial<CanvasElement> = {}): CanvasElement =>
    text("subinfo", "subInformasi", { y: r2(bottomStart + 1), height: 9, fontSize: 13, ...o });

  return { px, py, topEnd, bottomStart, bar, frame, corners, stack, subInfo };
}

const TEMPLATES: CoverTemplate[] = [
  {
    id: "klasik",
    nama: "Klasik",
    gaya: "Formal",
    deskripsi: "Susunan rata tengah sederhana: judul, logo, nama sekolah, alamat.",
    build: (ctx) => getMockupTemplate(ctx.mockupType, ctx.data as Record<string, string>),
  },
  {
    id: "bingkai-ganda",
    nama: "Bingkai Ganda",
    gaya: "Formal",
    deskripsi: "Rata tengah dengan bingkai ganda tebal-tipis di tepi sampul.",
    build: (ctx) => {
      const t = toolkit(ctx);
      const { elements } = t.stack(
        [
          { key: "title", weight: 0.14 },
          { key: "logo", weight: 0.2 },
          { key: "school", weight: 0.16 },
          { key: "address", weight: 0.17 },
        ],
        t.py(20),
        0.08
      );
      return [...t.frame("frame1", 10, 1), ...t.frame("frame2", 13.5, 0.5), ...elements, t.subInfo()];
    },
  },
  {
    id: "sudut-ornamen",
    nama: "Sudut Ornamen",
    gaya: "Klasik",
    deskripsi: "Siku di empat sudut dan garis pemisah pendek di bawah judul.",
    build: (ctx) => {
      const t = toolkit(ctx);
      const { elements, pos } = t.stack(
        [
          { key: "title", weight: 0.14 },
          { key: "logo", weight: 0.2 },
          { key: "school", weight: 0.16 },
          { key: "address", weight: 0.17 },
        ],
        t.py(20),
        0.1
      );
      const titleEnd = pos.title!.y + pos.title!.h;
      const divider = t.bar("divider", 35, (titleEnd + pos.logo!.y) / 2, 30, t.py(0.8));
      return [...t.corners("corner", 10, 22, 1.2), divider, ...elements, t.subInfo()];
    },
  },
  {
    id: "minimalis",
    nama: "Minimalis",
    gaya: "Modern",
    deskripsi: "Rata kiri dengan nama sekolah menonjol dan satu garis aksen.",
    build: (ctx) => {
      const t = toolkit(ctx);
      const t0 = t.py(18);
      const { elements, pos } = t.stack(
        [
          { key: "logo", weight: 0.18 },
          { key: "title", weight: 0.09, props: { fontSize: 23, fontWeight: "normal" } },
          { key: "school", weight: 0.3, props: { fontSize: 43 } },
          { key: "address", weight: 0.16 },
        ],
        t0,
        0.06,
        { align: "left", logoHeightMax: 14 }
      );
      const accentTop = pos.logo!.y;
      const accentEnd = pos.address!.y + pos.address!.h;
      const accent = t.bar("accent", t.px(14), accentTop, t.px(1.2), accentEnd - accentTop);
      return [accent, ...elements, t.subInfo({ align: "left", isLockedX: false })];
    },
  },
  {
    id: "logo-besar",
    nama: "Logo Besar",
    gaya: "Modern",
    deskripsi: "Logo sekolah besar di atas, teks tersusun rapat di bawahnya.",
    build: (ctx) => {
      const t = toolkit(ctx);
      const { elements } = t.stack(
        [
          { key: "logo", weight: 0.32 },
          { key: "title", weight: 0.13 },
          { key: "school", weight: 0.16 },
          { key: "address", weight: 0.15 },
        ],
        t.py(14),
        0.06
      );
      return [...elements, t.subInfo()];
    },
  },
  {
    id: "garis-ganda",
    nama: "Garis Ganda",
    gaya: "Klasik",
    deskripsi: "Dua pasang garis tebal-tipis mengapit blok judul dan nama sekolah.",
    build: (ctx) => {
      const t = toolkit(ctx);
      const x = t.px(12);
      const w = 100 - 2 * x;
      const rulePair = (name: string, y: number): CanvasElement[] => [
        t.bar(`${name}_thick`, x, y, w, t.py(1.2)),
        t.bar(`${name}_thin`, x, y + t.py(2.6), w, t.py(0.5)),
      ];
      // Blok teks berhenti sebelum pasangan garis bawah, supaya garis tidak menimpa alamat.
      const stackEnd = t.topEnd - t.py(7);
      const { elements } = t.stack(
        [
          { key: "title", weight: 0.14 },
          { key: "logo", weight: 0.18 },
          { key: "school", weight: 0.16 },
          { key: "address", weight: 0.17 },
        ],
        t.py(24),
        0.08,
        { end: stackEnd }
      );
      return [
        ...rulePair("rule_top", t.py(14)),
        ...rulePair("rule_bottom", stackEnd + t.py(2)),
        ...elements,
        t.subInfo(),
      ];
    },
  },
];

export const COVER_TEMPLATES: readonly CoverTemplate[] = TEMPLATES;
export const DEFAULT_TEMPLATE_ID = "klasik";

export function getTemplate(id?: string): CoverTemplate {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

/** Elemen kanvas untuk template terpilih + data sekolah + ukuran cetak. */
export function buildTemplateElements(templateId: string | undefined, ctx: TemplateContext): CanvasElement[] {
  return applyBindings(getTemplate(templateId).build(ctx), ctx.data);
}

/** Proyek minimal untuk pratinjau (galeri template) — tidak disimpan ke database. */
export function buildTemplatePreviewProject(templateId: string, ctx: TemplateContext): DesignProject {
  return {
    id: `tpl_${templateId}`,
    name: getTemplate(templateId).nama,
    productType: "Sampul Rapor",
    category: "",
    concept: "",
    audience: "",
    backgroundColor: "#111111",
    printMethod: "Embos Foil",
    printSize: ctx.printSize,
    elements: buildTemplateElements(templateId, ctx),
    slogan: "",
    description: "",
    createdAt: "",
    status: "Draft",
  };
}
