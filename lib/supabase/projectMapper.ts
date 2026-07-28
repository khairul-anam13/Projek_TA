import { DesignProject } from "@/lib/types";

/**
 * Pemetaan baris tabel `design_projects` (snake_case) <-> DesignProject
 * (camelCase). SATU-SATUNYA tempat pemetaan ini didefinisikan.
 *
 * Riwayat bug: pemetaan ini sebelumnya diduplikasi terpisah di 3 tempat
 * (GET/POST /api/projects, GET/PUT /api/projects/[id]) — saat field baru
 * (materialColor, printSize, printMethod, mockupType, dynamicData)
 * ditambahkan ke DesignProject, field-field itu tidak pernah ditambahkan ke
 * SEMUA salinan pemetaan (atau ke skema database sama sekali), sehingga
 * perubahan warna/ukuran/metode cetak yang disimpan user hilang lagi setiap
 * kali project dibuka ulang. Dengan satu fungsi bersama di sini, field baru
 * hanya perlu ditambahkan di satu tempat.
 */

/** Konversi satu baris tabel `design_projects` menjadi DesignProject. */
export function mapRowToProject(row: Record<string, any>): DesignProject {
  return {
    id: row.id,
    name: row.name,
    productType: row.product_type,
    category: row.category,
    concept: row.concept,
    audience: row.audience,
    mockupType: row.mockup_type ?? undefined,
    dynamicData: row.dynamic_data ?? undefined,
    backgroundColor: row.background_color,
    materialColor: row.material_color ?? undefined,
    printSize: row.print_size ?? undefined,
    printMethod: row.print_method ?? undefined,
    elements: row.elements ?? [],
    slogan: row.slogan,
    description: row.description,
    createdAt: row.created_at,
    status: row.status,
    palette: row.palette ?? undefined,
    typography: row.typography ?? undefined,
    layoutType: row.layout_type ?? undefined,
  };
}

/**
 * Konversi DesignProject menjadi kolom-kolom tabel (snake_case), TANPA
 * id/user_id/updated_at — field-field itu ditambahkan terpisah oleh
 * pemanggil karena kebutuhannya berbeda antara insert (butuh id + user_id)
 * dan update (butuh updated_at, TIDAK boleh menimpa id/user_id).
 */
export function mapProjectToRow(project: DesignProject): Record<string, any> {
  return {
    name: project.name,
    product_type: project.productType,
    category: project.category,
    concept: project.concept,
    audience: project.audience,
    mockup_type: project.mockupType ?? null,
    dynamic_data: project.dynamicData ?? null,
    background_color: project.backgroundColor,
    material_color: project.materialColor ?? null,
    print_size: project.printSize ?? null,
    print_method: project.printMethod ?? null,
    elements: project.elements,
    slogan: project.slogan,
    description: project.description,
    status: project.status,
    palette: project.palette ?? null,
    typography: project.typography ?? null,
    layout_type: project.layoutType ?? null,
  };
}
