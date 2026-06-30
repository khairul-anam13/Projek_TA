import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { DesignProject } from "@/lib/types";

/**
 * GET /api/projects
 * Mengambil semua proyek milik pengguna yang sedang login.
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("design_projects")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[GET /api/projects] Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data proyek." },
      { status: 500 }
    );
  }

  // Konversi kolom snake_case dari database ke camelCase (sesuai interface DesignProject)
  const projects: DesignProject[] = (data ?? []).map(mapRowToProject);

  return NextResponse.json({ projects });
}

/**
 * POST /api/projects
 * Membuat proyek baru dan menyimpannya ke database.
 * Body: DesignProject (tanpa user_id, akan diambil dari sesi)
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: DesignProject = await req.json();

  const { data, error } = await supabase
    .from("design_projects")
    .insert(mapProjectToRow(body, user.id))
    .select()
    .single();

  if (error) {
    console.error("[POST /api/projects] Error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan proyek baru." },
      { status: 500 }
    );
  }

  return NextResponse.json({ project: mapRowToProject(data) }, { status: 201 });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function mapRowToProject(row: Record<string, any>): DesignProject {
  return {
    id: row.id,
    name: row.name,
    productType: row.product_type,
    category: row.category,
    concept: row.concept,
    audience: row.audience,
    backgroundColor: row.background_color,
    slogan: row.slogan,
    description: row.description,
    createdAt: row.created_at,
    status: row.status,
    palette: row.palette ?? undefined,
    typography: row.typography ?? undefined,
    layoutType: row.layout_type ?? undefined,
    elements: row.elements ?? [],
  };
}

function mapProjectToRow(project: DesignProject, userId: string) {
  return {
    id: project.id,
    user_id: userId,
    name: project.name,
    product_type: project.productType,
    category: project.category,
    concept: project.concept,
    audience: project.audience,
    background_color: project.backgroundColor,
    slogan: project.slogan,
    description: project.description,
    status: project.status,
    palette: project.palette ?? null,
    typography: project.typography ?? null,
    layout_type: project.layoutType ?? null,
    elements: project.elements,
  };
}
