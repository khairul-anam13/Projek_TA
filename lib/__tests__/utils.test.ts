import { describe, it, expect } from "vitest";
import { cn } from "../utils";

describe("cn (class name merge utility)", () => {
  it("menggabungkan beberapa string class", () => {
    expect(cn("px-2", "text-sm")).toBe("px-2 text-sm");
  });

  it("mengabaikan nilai falsy (undefined, false, null)", () => {
    expect(cn("px-2", undefined, false, null, "text-sm")).toBe("px-2 text-sm");
  });

  it("class Tailwind yang konflik: yang terakhir menang (twMerge)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("mendukung penerapan bersyarat via objek", () => {
    expect(cn("base", { active: true, hidden: false })).toBe("base active");
  });
});
