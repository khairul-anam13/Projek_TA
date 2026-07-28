import { describe, it, expect } from "vitest";
import { mapProjectToRow, mapRowToProject } from "../projectMapper";
import { DesignProject } from "@/lib/types";

const FULL_PROJECT: DesignProject = {
  id: "p1",
  name: "Test Project",
  productType: "Sampul Rapor",
  category: "Sekolah",
  concept: "Formal",
  audience: "Siswa",
  mockupType: "Rapor SMA/SMK",
  dynamicData: { namaSekolah: "SMKN 2 KARANGANYAR", alamatSekolah: "Jl. Contoh No. 1" },
  backgroundColor: "#111111",
  materialColor: "#800000",
  printSize: "Size B (17x23cm)",
  printMethod: "Sablon",
  elements: [{ id: "el_1", type: "text", x: 10, y: 10, width: 80, height: 10, zIndex: 1, text: "Halo" }],
  slogan: "Slogan Test",
  description: "Deskripsi test",
  createdAt: "2026-01-01T00:00:00Z",
  status: "Final",
  palette: { primary: "#111", secondary: "#222", accent: "#333", explanation: "x" },
  typography: { title: "Times", body: "Arial", explanation: "y" },
  layoutType: "AI Layout",
};

const MINIMAL_PROJECT: DesignProject = {
  id: "p2",
  name: "Minimal",
  productType: "Sampul Rapor",
  category: "",
  concept: "",
  audience: "",
  backgroundColor: "#ffffff",
  elements: [],
  slogan: "",
  description: "",
  createdAt: "2026-01-01T00:00:00Z",
  status: "Draft",
};

describe("mapProjectToRow — regresi: materialColor/printSize/printMethod/mockupType/dynamicData sempat hilang total", () => {
  it("memetakan kelima field yang sempat hilang ke kolom snake_case yang benar", () => {
    const row = mapProjectToRow(FULL_PROJECT);
    expect(row.material_color).toBe("#800000");
    expect(row.print_size).toBe("Size B (17x23cm)");
    expect(row.print_method).toBe("Sablon");
    expect(row.mockup_type).toBe("Rapor SMA/SMK");
    expect(row.dynamic_data).toEqual(FULL_PROJECT.dynamicData);
  });

  it("field opsional yang tidak diisi dipetakan ke null (aman untuk kolom database nullable)", () => {
    const row = mapProjectToRow(MINIMAL_PROJECT);
    expect(row.material_color).toBeNull();
    expect(row.print_size).toBeNull();
    expect(row.print_method).toBeNull();
    expect(row.mockup_type).toBeNull();
    expect(row.dynamic_data).toBeNull();
  });

  it("tidak menyertakan id/user_id/updated_at — tanggung jawab pemanggil (beda kebutuhan insert vs update)", () => {
    const row = mapProjectToRow(FULL_PROJECT);
    expect(row).not.toHaveProperty("id");
    expect(row).not.toHaveProperty("user_id");
    expect(row).not.toHaveProperty("updated_at");
  });
});

describe("mapRowToProject — memetakan baris database kembali ke DesignProject", () => {
  it("memetakan kelima kolom yang sempat hilang kembali ke camelCase", () => {
    const row = { ...mapProjectToRow(FULL_PROJECT), id: FULL_PROJECT.id, created_at: FULL_PROJECT.createdAt };
    const project = mapRowToProject(row);
    expect(project.materialColor).toBe("#800000");
    expect(project.printSize).toBe("Size B (17x23cm)");
    expect(project.printMethod).toBe("Sablon");
    expect(project.mockupType).toBe("Rapor SMA/SMK");
    expect(project.dynamicData).toEqual(FULL_PROJECT.dynamicData);
  });

  it("kolom null di database dipetakan ke undefined (bukan null) sesuai tipe DesignProject", () => {
    const row = {
      ...mapProjectToRow(MINIMAL_PROJECT),
      id: MINIMAL_PROJECT.id,
      created_at: MINIMAL_PROJECT.createdAt,
    };
    const project = mapRowToProject(row);
    expect(project.materialColor).toBeUndefined();
    expect(project.printSize).toBeUndefined();
    expect(project.printMethod).toBeUndefined();
    expect(project.mockupType).toBeUndefined();
    expect(project.dynamicData).toBeUndefined();
  });
});

describe("round-trip project -> row -> project — jaring pengaman utama supaya field tidak lagi diam-diam hilang", () => {
  it("proyek lengkap bertahan utuh setelah pulang-pergi lewat representasi baris database", () => {
    const row = { ...mapProjectToRow(FULL_PROJECT), id: FULL_PROJECT.id, created_at: FULL_PROJECT.createdAt };
    expect(mapRowToProject(row)).toEqual(FULL_PROJECT);
  });

  it("proyek minimal (tanpa field opsional) bertahan utuh setelah pulang-pergi", () => {
    const row = { ...mapProjectToRow(MINIMAL_PROJECT), id: MINIMAL_PROJECT.id, created_at: MINIMAL_PROJECT.createdAt };
    expect(mapRowToProject(row)).toEqual(MINIMAL_PROJECT);
  });
});
