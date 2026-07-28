import { describe, it, expect } from "vitest";
import {
  materialTextureSvgString,
  MATERIAL_TEXTURE_OPACITY,
  MATERIAL_TEXTURE_BLEND_MODE,
} from "../materialTexture";

describe("materialTextureSvgString", () => {
  it("menghasilkan SVG valid dengan lebar/tinggi yang diberikan", () => {
    const svg = materialTextureSvgString(1600, 2367);
    expect(svg).toContain('width="1600"');
    expect(svg).toContain('height="2367"');
    expect(svg).toContain("<feTurbulence");
    expect(svg).toContain("<feColorMatrix");
    expect(svg).toContain("<rect");
  });

  it("rect mengacu ke filter id yang sama dengan yang didefinisikan", () => {
    const svg = materialTextureSvgString(100, 100);
    const filterIdMatch = svg.match(/filter id="([^"]+)"/);
    expect(filterIdMatch).not.toBeNull();
    const filterId = filterIdMatch![1];
    expect(svg).toContain(`filter="url(#${filterId})"`);
  });

  it("konstanta opacity & blend mode berada di rentang yang masuk akal", () => {
    expect(MATERIAL_TEXTURE_OPACITY).toBeGreaterThan(0);
    expect(MATERIAL_TEXTURE_OPACITY).toBeLessThanOrEqual(1);
    expect(MATERIAL_TEXTURE_BLEND_MODE).toBe("multiply");
  });
});
