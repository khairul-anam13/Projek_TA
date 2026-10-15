import { describe, it, expect } from "vitest";
import { parsePath, parseCustomSvg, customSvgMarkup, escapeXml } from "../svgUtils";

describe("parsePath", () => {
  it("M/L/C/Z absolut dengan pemisah spasi & koma", () => {
    const cmds = parsePath("M10,20 L30,40 C1,2,3,4,5,6 Z");
    expect(cmds).toEqual([
      { op: "M", p: [10, 20] },
      { op: "L", p: [30, 40] },
      { op: "C", p: [1, 2, 3, 4, 5, 6] },
      { op: "Z", p: [] },
    ]);
  });

  it("pasangan koordinat berulang setelah L dianggap L lanjutan (format potrace)", () => {
    const cmds = parsePath("M0 0 L 5 5 10 10 ");
    expect(cmds.map((c) => c.op)).toEqual(["M", "L", "L"]);
    expect(cmds[2].p).toEqual([10, 10]);
  });

  it("koordinat setelah M dianggap L", () => {
    const cmds = parsePath("M0 0 4 4");
    expect(cmds.map((c) => c.op)).toEqual(["M", "L"]);
  });

  it("H, V, dan perintah relatif dinormalkan jadi absolut", () => {
    const cmds = parsePath("M10 10 h5 v5 l-5 0 z");
    expect(cmds).toEqual([
      { op: "M", p: [10, 10] },
      { op: "L", p: [15, 10] },
      { op: "L", p: [15, 15] },
      { op: "L", p: [10, 15] },
      { op: "Z", p: [] },
    ]);
  });

  it("perintah tak dikenal tidak membuat loop tak berujung", () => {
    expect(() => parsePath("M0 0 A5 5 0 0 1 10 10 L 20 20")).not.toThrow();
  });
});

describe("parseCustomSvg", () => {
  it("memakai viewBox bila ada", () => {
    const { viewBox, inner } = parseCustomSvg('<svg viewBox="0 0 50 80"><path d="M0 0"/></svg>');
    expect(viewBox).toEqual([0, 0, 50, 80]);
    expect(inner).toBe('<path d="M0 0"/>');
  });

  it("tanpa viewBox (hasil potrace) memakai width/height", () => {
    const { viewBox } = parseCustomSvg('<svg id="svg" version="1.1" width="320" height="180" xmlns="x"><path d="M0 0"/></svg>');
    expect(viewBox).toEqual([0, 0, 320, 180]);
  });

  it("tanpa informasi ukuran jatuh ke 100x100", () => {
    expect(parseCustomSvg("<svg><path d='M0 0'/></svg>").viewBox).toEqual([0, 0, 100, 100]);
  });
});

describe("customSvgMarkup", () => {
  it("menambah viewBox, mengganti fill dengan warna, mempertahankan fill-rule", () => {
    const out = customSvgMarkup(
      '<svg width="40" height="20"><path d="M0 0" fill="black" fill-rule="evenodd"/></svg>',
      "#D4AF37",
      'x="1%" y="2%" width="3%" height="4%"'
    );
    expect(out).toContain('viewBox="0 0 40 20"');
    expect(out).toContain('fill="#D4AF37"');
    expect(out).not.toContain('fill="black"');
    expect(out).toContain('fill-rule="evenodd"');
  });
});

describe("escapeXml", () => {
  it("meloloskan karakter khusus XML", () => {
    expect(escapeXml(`A & B <"C">`)).toBe("A &amp; B &lt;&quot;C&quot;&gt;");
  });
});
