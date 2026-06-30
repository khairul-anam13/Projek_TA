import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { DesignProject } from "@/lib/types";

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
    .update({
      name: body.name,
      product_type: body.productType,
      category: body.category,
      concept: body.concept,
      audience: body.audience,
      background_color: body.backgroundColor,
      slogan: body.slogan,
      description: body.description,
      status: body.status,
      palette: body.palette ?? null,
      typography: body.typography ?? null,
      layout_type: body.layoutType ?? null,
      elements: body.elements,
      updated_at: new Date().toISOString(),
    })
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

  const updated: DesignProject = {
    id: data.id,
    name: data.name,
    productType: data.product_type,
    category: data.category,
    concept: data.concept,
    audience: data.audience,
    backgroundColor: data.background_color,
    slogan: data.slogan,
    description: data.description,
    createdAt: data.created_at,
    status: data.status,
    palette: data.palette ?? undefined,
    typography: data.typography ?? undefined,
    layoutType: data.layout_type ?? undefined,
    elements: data.elements ?? [],
  };

  return NextResponse.json({ project: updated });
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
