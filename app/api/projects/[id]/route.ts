import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { DesignProject } from "@/lib/types";
import { mapRowToProject, mapProjectToRow } from "@/lib/supabase/projectMapper";

/**
 * GET /api/projects/[id]
 * Mengambil satu proyek berdasarkan id. RLS/ownership check memastikan
 * hanya pemilik proyek yang bisa mengaksesnya — id milik user lain atau
 * yang tidak ada akan mengembalikan 404.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { data, error } = await supabase
    .from("design_projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Proyek tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json({ project: mapRowToProject(data) });
}

/**
 * PUT /api/projects/[id]
 * Memperbarui proyek yang sudah ada. RLS Supabase memastikan hanya
 * pemilik proyek yang bisa memperbarui datanya.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body: DesignProject = await req.json();

  const { data, error } = await supabase
    .from("design_projects")
    .update({ ...mapProjectToRow(body), updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id) // Double-check ownership (defense in depth)
    .select()
    .single();

  if (error) {
    console.error(`[PUT /api/projects/${id}] Error:`, error);
    return NextResponse.json(
      { error: "Gagal memperbarui proyek." },
      { status: 500 }
    );
  }

  return NextResponse.json({ project: mapRowToProject(data) });
}

/**
 * DELETE /api/projects/[id]
 * Menghapus proyek. RLS Supabase memastikan hanya pemilik yang bisa menghapus.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { error } = await supabase
    .from("design_projects")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error(`[DELETE /api/projects/${id}] Error:`, error);
    return NextResponse.json(
      { error: "Gagal menghapus proyek." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
