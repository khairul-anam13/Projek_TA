import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { DesignProject } from "@/lib/types";
import { mapRowToProject, mapProjectToRow } from "@/lib/supabase/projectMapper";

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
    .insert({ id: body.id, user_id: user.id, ...mapProjectToRow(body) })
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
