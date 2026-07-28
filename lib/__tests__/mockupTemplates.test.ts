import { describe, it, expect } from "vitest";
import { getMockupTemplate } from "../mockupTemplates";
import { MIKA_ZONE_MIN, MIKA_ZONE_MAX } from "../canvasConstraints";

describe("getMockupTemplate (AI Auto-Layout fallback template, Equivalence Partitioning)", () => {
  const data = {
    judulRapor: "rapor peserta didik",
    namaSekolah: "sd negeri 1 contoh",
    alamatSekolah: "Jl. Contoh No. 1",
    subInformasi: "NISN: 123",
  };

  it("menghasilkan 5 elemen kanvas (title, logo, school, address, subinfo)", () => {
    const elements = getMockupTemplate("Rapor SD", data);
    expect(elements).toHaveLength(5);
  });

  it("teks judul dan nama sekolah diubah ke huruf kapital", () => {
    const elements = getMockupTemplate("Rapor SD", data);
    const title = elements.find((e) => e.id.startsWith("el_title"));
    const school = elements.find((e) => e.id.startsWith("el_school"));
    expect(title?.text).toBe("RAPOR PESERTA DIDIK");
    expect(school?.text).toBe("SD NEGERI 1 CONTOH");
  });

  it("hierarki ukuran font sesuai spesifikasi (43 -> 33 -> 23 -> 13)", () => {
    const elements = getMockupTemplate("Rapor SD", data);
    const byId = (prefix: string) => elements.find((e) => e.id.startsWith(prefix));
    expect(byId("el_title")?.fontSize).toBe(43);
    expect(byId("el_school")?.fontSize).toBe(33);
    expect(byId("el_address")?.fontSize).toBe(23);
    expect(byId("el_subinfo")?.fontSize).toBe(13);
  });

  it("mockup 'Rapor MAN' memakai ikon logo 'building' (Kemenag)", () => {
    const elements = getMockupTemplate("Rapor MAN", data);
    const logo = elements.find((e) => e.type === "logo");
    expect(logo?.logoIcon).toBe("building");
  });

  it.each(["Rapor SD", "Rapor SMP", "Rapor SMA/SMK"])(
    "mockup '%s' memakai ikon logo default 'shield' (Garuda)",
    (mockupType) => {
      const elements = getMockupTemplate(mockupType, data);
      const logo = elements.find((e) => e.type === "logo");
      expect(logo?.logoIcon).toBe("shield");
    }
  );

  it("menggunakan nilai default saat dynamicData kosong (semua field opsional)", () => {
    const elements = getMockupTemplate("Rapor SD", {});
    const title = elements.find((e) => e.id.startsWith("el_title"));
    expect(title?.text).toBe("RAPOR PESERTA DIDIK");
  });

  it("tidak ada elemen teks yang jatuh di dalam Zona Mika (Y 50-80)", () => {
    const elements = getMockupTemplate("Rapor SD", data);
    const textInMikaZone = elements.filter(
      (e) => e.type === "text" && e.y >= MIKA_ZONE_MIN && e.y <= MIKA_ZONE_MAX
    );
    expect(textInMikaZone).toEqual([]);
  });
});
