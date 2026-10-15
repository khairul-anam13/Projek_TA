import { describe, it, expect } from "vitest";
import {
  COVER_TEMPLATES,
  applyBindings,
  bindText,
  buildTemplateElements,
  deriveSchoolData,
  getTemplate,
  withInferredBindings,
} from "../templates";
import { getMikaRect } from "../canvasConstraints";
import { runPreflight } from "../preflight";
import type { CanvasElement, DesignProject, PrintSize } from "../types";

const SIZES: PrintSize[] = ["Size A (23x34cm)", "Size B (17x23cm)"];

const DATA = {
  judulRapor: "rapor peserta didik",
  namaSekolah: "sd negeri 1 contoh",
  alamatSekolah: "Jl. Pendidikan No. 1, Kec. Contoh, Kab. Contoh",
  subInformasi: "NPSN: 12345678",
};

const overlaps = (a: CanvasElement, b: { x: number; y: number; width: number; height: number }) =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

describe.each(COVER_TEMPLATES.map((t) => [t.id, t] as const))("template %s", (_id, template) => {
  describe.each(SIZES)("ukuran %s", (printSize) => {
    const elements = buildTemplateElements(template.id, { data: DATA, mockupType: "Rapor SD", printSize });
    const mika = getMikaRect(printSize);

    it("menghasilkan elemen dengan id unik", () => {
      expect(elements.length).toBeGreaterThanOrEqual(5);
      expect(new Set(elements.map((e) => e.id)).size).toBe(elements.length);
    });

    it("semua elemen berada di dalam kanvas 0-100", () => {
      for (const el of elements) {
        expect(el.x).toBeGreaterThanOrEqual(0);
        expect(el.y).toBeGreaterThanOrEqual(0);
        expect(el.x + el.width).toBeLessThanOrEqual(100.01);
        expect(el.y + el.height).toBeLessThanOrEqual(100.01);
      }
    });

    it("tidak ada teks yang menutupi mika fisik ukuran ini", () => {
      const hits = elements.filter((e) => e.type === "text" && overlaps(e, mika));
      expect(hits.map((e) => e.id)).toEqual([]);
    });

    it("bentuk dekoratif (bingkai, garis, siku) tidak menimpa teks atau logo", () => {
      const shapes = elements.filter((e) => e.type === "shape");
      const content = elements.filter((e) => e.type !== "shape");
      const hits: string[] = [];
      for (const sh of shapes) for (const c of content) if (overlaps(sh, c)) hits.push(`${sh.id} x ${c.id}`);
      expect(hits).toEqual([]);
    });

    it("teks terikat data: judul & nama sekolah KAPITAL, alamat & sub-info apa adanya", () => {
      const byBind = (k: string) => elements.find((e) => e.bind === k)?.text;
      expect(byBind("judulRapor")).toBe("RAPOR PESERTA DIDIK");
      expect(byBind("namaSekolah")).toBe("SD NEGERI 1 CONTOH");
      expect(byBind("alamatSekolah")).toBe(DATA.alamatSekolah);
      expect(byBind("subInformasi")).toBe(DATA.subInformasi);
    });

    it("lolos cek siap cetak tanpa temuan (di luar ukuran font yang butuh canvas)", () => {
      const project = {
        id: "t",
        name: "t",
        productType: "Sampul Rapor",
        category: "",
        concept: "",
        audience: "",
        backgroundColor: "#111111",
        printMethod: "Embos Foil",
        printSize,
        elements,
        slogan: "",
        description: "",
        createdAt: "",
        status: "Draft",
      } as DesignProject;
      expect(runPreflight(project)).toEqual([]);
    });
  });
});

describe("bindText / applyBindings", () => {
  it("field kosong memakai placeholder", () => {
    expect(bindText("namaSekolah", {})).toBe("NAMA SEKOLAH");
    expect(bindText("alamatSekolah", { alamatSekolah: "   " })).toBe("Alamat Sekolah");
  });

  it("mengubah data memperbarui semua elemen terikat, elemen lain tidak disentuh", () => {
    const base = buildTemplateElements("bingkai-ganda", { data: DATA, mockupType: "Rapor SD" });
    const next = applyBindings(base, { namaSekolah: "smkn 2 karanganyar" });
    expect(next.find((e) => e.bind === "namaSekolah")?.text).toBe("SMKN 2 KARANGANYAR");
    expect(next.find((e) => e.bind === "judulRapor")?.text).toBe("RAPOR PESERTA DIDIK");
    expect(next.filter((e) => e.type === "shape")).toEqual(base.filter((e) => e.type === "shape"));
  });

  it("field yang tidak ada di data tidak menimpa teks elemen", () => {
    const base = buildTemplateElements("klasik", { data: DATA, mockupType: "Rapor SD" });
    const next = applyBindings(base, {});
    expect(next).toEqual(base);
  });
});

describe("withInferredBindings (proyek lama tanpa bind)", () => {
  it("menebak bind dari id elemen bawaan", () => {
    const old = [
      { id: "el_title_1", type: "text", text: "A", x: 0, y: 0, width: 1, height: 1, zIndex: 0 },
      { id: "el_sub_info", type: "text", text: "B", x: 0, y: 0, width: 1, height: 1, zIndex: 1 },
      { id: "el_lain", type: "text", text: "C", x: 0, y: 0, width: 1, height: 1, zIndex: 2 },
    ] as CanvasElement[];
    const out = withInferredBindings(old);
    expect(out[0].bind).toBe("judulRapor");
    expect(out[1].bind).toBe("subInformasi");
    expect(out[2].bind).toBeUndefined();
  });
});

describe("getTemplate", () => {
  it("id tidak dikenal jatuh ke template pertama (klasik)", () => {
    expect(getTemplate("tidak-ada").id).toBe("klasik");
    expect(getTemplate(undefined).id).toBe("klasik");
  });
});

describe("deriveSchoolData", () => {
  it("mengisi field yang hilang dari teks elemen terikat, tidak menimpa data yang ada", () => {
    const els = buildTemplateElements("klasik", { data: DATA, mockupType: "Rapor SD" });
    const out = deriveSchoolData(els, { namaSekolah: "tetap" });
    expect(out.namaSekolah).toBe("tetap");
    expect(out.judulRapor).toBe("RAPOR PESERTA DIDIK");
    expect(out.alamatSekolah).toBe(DATA.alamatSekolah);
  });
});
