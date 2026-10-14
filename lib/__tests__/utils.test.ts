import { describe, it, expect } from "vitest";
import { cn, safeNextPath } from "../utils";

describe("safeNextPath (cegah open redirect pada auth callback)", () => {
  it("path internal diteruskan apa adanya", () => {
    expect(safeNextPath("/dashboard")).toBe("/dashboard");
    expect(safeNextPath("/editor/p_abc?x=1")).toBe("/editor/p_abc?x=1");
  });

  it("kosong/null/undefined jatuh ke '/'", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath("")).toBe("/");
  });

  it.each(["@evil.com", "https://evil.com", "//evil.com", "/\\evil.com", "evil.com/x"])(
    "target eksternal/ambigu '%s' ditolak -> '/'",
    (bad) => {
      expect(safeNextPath(bad)).toBe("/");
    }
  );
});

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
