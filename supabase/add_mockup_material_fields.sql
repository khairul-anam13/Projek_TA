-- =============================================================
-- PAGE FREE — Migration: kolom mockup & material yang hilang
-- Jalankan di: Supabase Dashboard → SQL Editor → New Query → Run
--
-- Kenapa migration ini diperlukan:
-- Tabel design_projects yang sudah ada (dibuat lewat schema.sql) tidak
-- pernah punya kolom untuk materialColor, printSize, printMethod,
-- mockupType, dan dynamicData — walau field-field itu sudah lama ada di
-- tipe DesignProject dan bisa diubah user di editor. Akibatnya perubahan
-- warna bahan/ukuran/metode cetak yang di-save HILANG lagi setiap kali
-- project dibuka ulang, karena tidak ada tempat untuk menyimpannya sama
-- sekali di database.
--
-- Migration ini AMAN dijalankan di database yang sudah berisi data — hanya
-- menambah kolom baru (IF NOT EXISTS), tidak mengubah/menghapus apa pun
-- yang sudah ada.
-- =============================================================

alter table public.design_projects
  add column if not exists material_color text null,
  add column if not exists print_size     text null,
  add column if not exists print_method   text null,
  add column if not exists mockup_type    text null,
  add column if not exists dynamic_data   jsonb null;

-- ──────────────────────────────────────────────────────────────
-- VERIFIKASI (opsional, jalankan setelah migration di atas)
-- ──────────────────────────────────────────────────────────────
-- select column_name, data_type, is_nullable
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name = 'design_projects'
--   and column_name in ('material_color', 'print_size', 'print_method', 'mockup_type', 'dynamic_data')
-- order by column_name;
