import { describe, it, expect } from "vitest";
import { runPreflight, preflightSummary } from "../preflight";
import type { CanvasElement, DesignProject } from "../types";

const GOLD = "#D4AF37";

function project(elements: Partial<CanvasElement>[], over: Partial<DesignProject> = {}): DesignProject {
  return {
    id: "p",
    name: "p",
    productType: "Sampul Rapor",
    category: "",
    concept: "",
    audience: "",
    backgroundColor: "#111111",
    printMethod: "Embos Foil",
    printSize: "Size A (23x34cm)",
    elements: elements.map((e, i) => ({
      id: `e${i}`,
      type: "text",
      text: "Halo",
      x: 20,
      y: 10,
      width: 60,
      height: 8,
      color: GOLD,
      zIndex: i,
      ...e,
    })) as CanvasElement[],
    slogan: "",
    description: "",
    createdAt: "",
    status: "Draft",
    ...over,
  };
}

const codes = (p: DesignProject) => runPreflight(p).map((i) => i.code);

describe("runPreflight", () => {
  it("proyek bersih -> tanpa temuan", () => {
    expect(runPreflight(project([{}]))).toEqual([]);
  });

  it("teks yang menutupi mika (Size A: Y 66-79) -> error mika-overlap", () => {
    expect(codes(project([{ y: 70, height: 6 }]))).toContain("mika-overlap");
  });

  it("zona mika mengikuti ukuran: Y 60 aman di Size A tapi menabrak di Size B", () => {
    const el = [{ y: 60, height: 5 }];
    expect(codes(project(el, { printSize: "Size A (23x34cm)" }))).not.toContain("mika-overlap");
    expect(codes(project(el, { printSize: "Size B (17x23cm)" }))).toContain("mika-overlap");
  });

  it("logo boleh berada di zona mika (hanya teks dilarang)", () => {
    expect(codes(project([{ type: "logo", y: 68, height: 8, text: undefined }]))).not.toContain("mika-overlap");
  });

  it("elemen keluar kanvas -> error out-of-canvas", () => {
    expect(codes(project([{ x: 80, width: 40 }]))).toContain("out-of-canvas");
  });

  it("terlalu dekat tepi -> warning safe-margin", () => {
    const issues = runPreflight(project([{ x: 0.5, width: 50 }]));
    expect(issues.find((i) => i.code === "safe-margin")?.severity).toBe("warning");
  });

  it("warna bukan emas pada Embos Foil -> error ink-color", () => {
    expect(codes(project([{ color: "#000000" }]))).toContain("ink-color");
  });

  it("Sablon menerima hitam/putih, menolak emas", () => {
    const sablon = { printMethod: "Sablon" as const };
    expect(codes(project([{ color: "#111111" }], sablon))).not.toContain("ink-color");
    expect(codes(project([{ color: "#ffffff" }], sablon))).not.toContain("ink-color");
    expect(codes(project([{ color: GOLD }], sablon))).toContain("ink-color");
  });

  it("gambar raster -> warning raster-image", () => {
    expect(codes(project([{ type: "image", imageUrl: "data:image/png;base64,AAAA", text: undefined }]))).toContain(
      "raster-image"
    );
  });

  it("teks kosong dan karakter non-Latin -> warning", () => {
    expect(codes(project([{ text: "  " }]))).toContain("empty-text");
    expect(codes(project([{ text: "مدرسة" }]))).toContain("non-latin");
  });

  it("konten saling bertumpuk -> warning, bentuk dekoratif diabaikan", () => {
    expect(codes(project([{ y: 10 }, { y: 12 }]))).toContain("element-overlap");
    expect(codes(project([{ y: 10 }, { type: "shape", shapeType: "rectangle", y: 12, text: undefined }]))).not.toContain(
      "element-overlap"
    );
  });

  it("error diurutkan sebelum warning dan dihitung oleh preflightSummary", () => {
    const issues = runPreflight(project([{ color: "#000000", x: 0.5, width: 50 }]));
    expect(issues[0].severity).toBe("error");
    const s = preflightSummary(issues);
    expect(s.errors).toBeGreaterThanOrEqual(1);
    expect(s.warnings).toBeGreaterThanOrEqual(1);
  });
});
