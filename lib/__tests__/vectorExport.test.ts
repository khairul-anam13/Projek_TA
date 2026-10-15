import { describe, it, expect } from "vitest";
import { buildScene, sceneToSvg, sceneToPdf } from "../vectorExport";
import { buildTemplatePreviewProject } from "../templates";
import type { DesignProject } from "../types";

/** Mock CanvasRenderingContext2D: tiap karakter selebar fontSize*0.5 px. */
function makeMockCtx() {
  let font = "";
  return {
    set font(v: string) { font = v; },
    get font() { return font; },
    measureText: (text: string) => {
      const m = font.match(/(\d+(?:\.\d+)?)px/);
      const size = m ? parseFloat(m[1]) : 16;
      return { width: text.length * size * 0.5 } as TextMetrics;
    },
  } as unknown as CanvasRenderingContext2D;
}

const DATA = {
  judulRapor: "Rapor Peserta Didik",
  namaSekolah: "SMKN 2 Karanganyar",
  alamatSekolah: "Jl. Yos Sudarso, Kayangan, Bejen",
  subInformasi: "NPSN: 20312071",
};

function projectFor(templateId: string, printSize: DesignProject["printSize"]) {
  return buildTemplatePreviewProject(templateId, { data: DATA, mockupType: "Rapor SMA/SMK", printSize });
}

describe("buildScene + sceneToSvg", () => {
  it("SVG berukuran fisik Size A (230 x 340 mm) dengan viewBox mm", () => {
    const svg = sceneToSvg(buildScene(projectFor("klasik", "Size A (23x34cm)"), makeMockCtx()));
    expect(svg).toContain('width="230mm"');
    expect(svg).toContain('height="340mm"');
    expect(svg).toContain('viewBox="0 0 230 340"');
  });

  it("Size B = 170 x 230 mm", () => {
    const svg = sceneToSvg(buildScene(projectFor("klasik", "Size B (17x23cm)"), makeMockCtx()));
    expect(svg).toContain('width="170mm"');
    expect(svg).toContain('height="230mm"');
  });

  it("hanya artwork: tanpa warna bahan, tanpa gambar mika, teks nama sekolah ikut", () => {
    const svg = sceneToSvg(buildScene(projectFor("bingkai-ganda", "Size A (23x34cm)"), makeMockCtx()));
    expect(svg).not.toContain("mika-nama");
    expect(svg).not.toContain("#111111");
    expect(svg).toContain("SMKN");
    expect(svg).toContain('fill="#D4AF37"');
  });

  it("logo menjadi path vektor (bukan <image>)", () => {
    const svg = sceneToSvg(buildScene(projectFor("klasik", "Size A (23x34cm)"), makeMockCtx()));
    expect(svg).toContain("<path ");
    expect(svg).not.toContain("<image");
  });

  it("teks di-escape XML", () => {
    const p = projectFor("klasik", "Size A (23x34cm)");
    p.elements = p.elements.map((e) => (e.bind === "namaSekolah" ? { ...e, text: "A & B <C>" } : e));
    const svg = sceneToSvg(buildScene(p, makeMockCtx()));
    expect(svg).toContain("A &amp; B &lt;C&gt;");
  });

  it("custom_svg bergaya potrace (tanpa viewBox) diskalakan ke kotak elemen", () => {
    const p = projectFor("klasik", "Size A (23x34cm)");
    p.elements = [
      {
        id: "logo",
        type: "custom_svg",
        customSvg:
          '<svg id="svg" version="1.1" width="40" height="20" xmlns="http://www.w3.org/2000/svg"><path d="M0.000 0.000 C 10 0,20 0,20 10 L 40 20 0 20 " stroke="none" fill="black" fill-rule="evenodd"/></svg>',
        color: "#D4AF37",
        x: 10,
        y: 10,
        width: 20, // 46 mm
        height: 10, // 34 mm
        zIndex: 0,
      },
    ];
    const scene = buildScene(p, makeMockCtx());
    const path = scene.items.find((i) => i.kind === "path");
    expect(path && path.kind === "path" && path.evenOdd).toBe(true);
    if (!path || path.kind !== "path") throw new Error("path tidak ditemukan");
    // 40x20 ke kotak 46x34 mm: skala min(46/40, 34/20) = 1.15; titik (0,0) bergeser rata tengah vertikal.
    const first = path.cmds[0];
    expect(first.op).toBe("M");
    expect(first.p[0]).toBeCloseTo(23, 3); // x = 10% * 230
    expect(first.p[1]).toBeCloseTo(34 + (34 - 20 * 1.15) / 2, 3); // y = 10% * 340 + offset tengah
  });
});

describe("sceneToPdf", () => {
  it("menghasilkan PDF satu halaman berukuran fisik, dengan operator path & teks", () => {
    const doc = sceneToPdf(buildScene(projectFor("sudut-ornamen", "Size A (23x34cm)"), makeMockCtx()));
    expect(doc.getNumberOfPages()).toBe(1);
    expect(doc.internal.pageSize.getWidth()).toBeCloseTo(230, 1);
    expect(doc.internal.pageSize.getHeight()).toBeCloseTo(340, 1);
    const out = doc.output();
    expect(out.startsWith("%PDF")).toBe(true);
    expect(out).toContain(" Tj"); // teks nyata (vektor), bukan gambar
    expect(out).not.toContain("/Subtype /Image");
  });

  it("Size B memakai halaman 170 x 230 mm", () => {
    const doc = sceneToPdf(buildScene(projectFor("klasik", "Size B (17x23cm)"), makeMockCtx()));
    expect(doc.internal.pageSize.getWidth()).toBeCloseTo(170, 1);
    expect(doc.internal.pageSize.getHeight()).toBeCloseTo(230, 1);
  });
});
