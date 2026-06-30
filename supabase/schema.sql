-- =============================================================
-- PAGE FREE — Supabase Database Schema
-- Jalankan seluruh isi file ini di:
--   Supabase Dashboard → SQL Editor → New Query → Run
-- =============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. TABEL: design_projects
-- ──────────────────────────────────────────────────────────────
create table if not exists public.design_projects (
  -- Primary key: UUID, dibuat otomatis oleh aplikasi (nanoid/uuid)
  id              text        primary key,

  -- Relasi ke tabel auth.users bawaan Supabase
  user_id         uuid        not null references auth.users(id) on delete cascade,

  -- Informasi dasar proyek
  name            text        not null,
  product_type    text        not null default 'Sampul Rapor',
  category        text        not null default '',
  concept         text        not null default '',
  audience        text        not null default '',
  slogan          text        not null default '',
  description     text        not null default '',
  status          text        not null default 'Draft'
                              check (status in ('Draft', 'Final', 'Selesai')),

  -- Tampilan kanvas
  background_color text       not null default '#1E3A8A',

  -- Data JSONB: array elemen kanvas (teks, bentuk, logo)
  elements        jsonb       not null default '[]'::jsonb,

  -- Data JSONB opsional: palet warna dari AI
  palette         jsonb       null,

  -- Data JSONB opsional: tipografi dari AI
  typography      jsonb       null,

  -- Layout type
  layout_type     text        null,

  -- Timestamps
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────
-- 2. INDEX untuk performa query
-- ──────────────────────────────────────────────────────────────

-- Index utama: ambil semua proyek milik user tertentu (query paling sering)
create index if not exists idx_design_projects_user_id
  on public.design_projects(user_id);

-- Index untuk sorting berdasarkan waktu pembuatan
create index if not exists idx_design_projects_created_at
  on public.design_projects(created_at desc);

-- ──────────────────────────────────────────────────────────────
-- 3. TRIGGER: otomatis update kolom updated_at
-- ──────────────────────────────────────────────────────────────

-- Fungsi trigger (dipakai ulang untuk tabel lain jika perlu)
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Pasang trigger ke tabel design_projects
drop trigger if exists trg_design_projects_updated_at on public.design_projects;
create trigger trg_design_projects_updated_at
  before update on public.design_projects
  for each row
  execute function public.handle_updated_at();

-- ──────────────────────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY (RLS) — Setiap user hanya bisa akses
--    data miliknya sendiri
-- ──────────────────────────────────────────────────────────────

-- Aktifkan RLS
alter table public.design_projects enable row level security;

-- Policy: SELECT — hanya bisa baca proyek milik sendiri
create policy "Users can view their own projects"
  on public.design_projects
  for select
  using (auth.uid() = user_id);

-- Policy: INSERT — hanya bisa membuat proyek untuk diri sendiri
create policy "Users can insert their own projects"
  on public.design_projects
  for insert
  with check (auth.uid() = user_id);

-- Policy: UPDATE — hanya bisa mengubah proyek milik sendiri
create policy "Users can update their own projects"
  on public.design_projects
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policy: DELETE — hanya bisa menghapus proyek milik sendiri
create policy "Users can delete their own projects"
  on public.design_projects
  for delete
  using (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────
-- 5. VERIFIKASI (opsional, jalankan setelah schema di atas)
-- ──────────────────────────────────────────────────────────────
-- select column_name, data_type, is_nullable, column_default
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name = 'design_projects'
-- order by ordinal_position;
