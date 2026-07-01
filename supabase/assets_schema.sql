-- =============================================================
-- PAGE FREE — Supabase Assets Schema
-- Jalankan di: Supabase Dashboard → SQL Editor → New Query → Run
-- =============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. TABEL: user_assets
-- ──────────────────────────────────────────────────────────────
create table if not exists public.user_assets (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users(id) on delete cascade,
  
  -- Nama file (misalnya: "Foto Kucing")
  name            text        not null default 'Untitled Asset',
  
  -- Path di Supabase Storage (bucket: user_assets) untuk file asli 
  -- (misal: "user_id/original_123.jpg")
  original_path   text        null,
  
  -- Path di Supabase Storage untuk file SVG yang sudah divetorisasi
  -- (misal: "user_id/vector_123.svg") 
  -- ATAU bisa juga kita simpan SVG string langsung di database jika ukurannya kecil
  vector_svg      text        not null,
  
  -- Timestamps
  created_at      timestamptz not null default now()
);

-- Index untuk mempercepat query aset milik pengguna tertentu
create index if not exists idx_user_assets_user_id
  on public.user_assets(user_id);

-- ──────────────────────────────────────────────────────────────
-- 2. ROW LEVEL SECURITY (RLS)
-- ──────────────────────────────────────────────────────────────

alter table public.user_assets enable row level security;

-- SELECT
create policy "Users can view their own assets"
  on public.user_assets
  for select
  using (auth.uid() = user_id);

-- INSERTA
create policy "Users can insert their own assets"
  on public.user_assets
  for insert
  with check (auth.uid() = user_id);

-- DELETE
create policy "Users can delete their own assets"
  on public.user_assets
  for delete
  using (auth.uid() = user_id);


-- ──────────────────────────────────────────────────────────────
-- 3. CATATAN TENTANG STORAGE BUCKET
-- ──────────────────────────────────────────────────────────────
-- Pastikan Anda sudah membuat Storage Bucket bernama `user_assets`
-- di Supabase Dashboard (Storage -> New Bucket).
-- Jika ingin mengatur RLS Storage (opsional tapi disarankan):

-- (Opsional, hapus komentar jika ingin dijalankan lewat SQL):
-- insert into storage.buckets (id, name, public) values ('user_assets', 'user_assets', true);
--
-- create policy "Users can upload their own assets to storage"
--   on storage.objects for insert
--   with check (bucket_id = 'user_assets' and auth.uid()::text = (storage.foldername(name))[1]);
--
-- create policy "Users can view their own assets from storage"
--   on storage.objects for select
--   using (bucket_id = 'user_assets' and auth.uid()::text = (storage.foldername(name))[1]);
