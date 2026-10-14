# Page Free — Web-to-Print Editor

SaaS Tugas Akhir D3 untuk mendesain sampul rapor sekolah (SD/SMP/SMA-SMK/MAN) pra-cetak: form data sekolah → layout otomatis (AI atau template) → editor kanvas vektor → preview 3D + ekspor PNG/PDF.

## Perintah

```bash
pnpm dev          # next dev
pnpm build        # next build (output: standalone, ESLint di-skip saat build)
pnpm lint         # eslint .
pnpm test         # vitest run (environment node, bukan jsdom)
```

Env (`.env.local`, lihat `.env.example`): `GROQ_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
SQL: `supabase/schema.sql`, `supabase/assets_schema.sql` (bucket storage `user_assets` dibuat manual).

## Stack

Next.js 15 App Router, React 19, Tailwind 4, Supabase (Google OAuth, Postgres + RLS, Storage), Groq `openai/gpt-oss-20b`, jspdf, `@imgly/background-removal` + `@cadit-app/potrace-ts` (trace logo ke SVG B&W), `motion`, vitest.

Alias import: `@/*` → root proyek.

## Alur halaman

`/login` → `/dashboard` → `/create` → `/create/result` (opsional, hasil AI) → `/editor/[id]` → `/preview/[id]`; `/history` = arsip.

- `middleware.ts`: refresh sesi Supabase; redirect belum-login ke `/login`, sudah-login dari `/`/`/login` ke `/dashboard`; `/api/projects*` dan `/api/gemini*` balas 401 tanpa sesi (route gemini hanya dijaga middleware, tanpa cek di handler). `/qa-test` 404 di production, publik hanya di dev.
- `app/auth/callback`: parameter `next` wajib lewat `safeNextPath` (`lib/utils.ts`), jangan dipakai mentah (open redirect).
- `app/(app)/layout.tsx` memasang `AppProvider` (`lib/appContext.tsx`): state `user` + `projects` bertahan antar halaman terautentikasi.
- Halaman di `app/(app)/*` tipis: ambil data/handler dari context, render komponen di `components/`.
- State lintas halaman create↔result lewat `sessionStorage` (`pagefree:ai_recommendation`, `pagefree:create_form_draft`).

## Peta kode

| Area | File | Catatan |
|---|---|---|
| Model | `lib/types.ts` | `CanvasElement` (x/y/width/height dalam persen 0–100), `DesignProject`, `PRODUCT_CATALOG` |
| Persistensi | `lib/supabase/projectMapper.ts` | Satu-satunya pemetaan row snake_case ↔ `DesignProject`. Field baru ditambah di sini + SQL |
| API proyek | `app/api/projects/route.ts`, `[id]/route.ts` | Selalu filter `user_id` (defense in depth di atas RLS) |
| AI layout | `app/api/gemini/route.ts` | Groq json_schema strict; output wajib lewat `sanitizeLayoutElements` |
| Cari sekolah | `app/api/gemini/sekolah/route.ts`, `lib/kemendikdasmen.ts`, `lib/fuzzyMatch.ts` | Data dari API resmi Kemendikdasmen, bukan LLM. Auto-select hanya jika skor ≥ 0.9 dan unik |
| Aturan kanvas | `lib/canvasConstraints.ts` | Snap (5/50/95 + tepi elemen lain), zona mika, resize 8 handle, resolver overlap, ukuran impor gambar |
| Layout teks | `lib/textLayout.ts` | Wrap + shrink-to-fit (binary search). Dipakai editor, preview, ekspor |
| Tekstur bahan | `lib/materialTexture.ts` | Parameter SVG filter dipakai on-screen DAN ekspor |
| Template | `lib/mockupTemplates.ts` | 5 elemen standar, font 43/33/23/13 |
| Editor | `components/EditorPage.tsx` | Drag/resize via rAF, zoom Ctrl+scroll, undo/redo, panel Properties/Insert |
| Preview/ekspor | `components/PreviewPage.tsx` | `generateHighResFile` menggambar ulang kanvas via Canvas 2D (bukan screenshot DOM) |
| Teks SVG | `components/CanvasFitText.tsx` | Render `lines` hasil `computeFitLayout` persis, tanpa word-wrap browser |
| UI kit | `components/ui/*` | `Button`, `IconButton`, `Card`, `Badge`, `Input`, `PageHeader` (cva + `cn`) |
| Harness QA | `app/qa-test/page.tsx` | Halaman uji visual editor/preview/ekspor dengan data panjang |

## Aturan bisnis yang tidak boleh rusak

- **Zona Mika:** elemen `text` tidak boleh berada di Y 50–80 (jendela plastik fisik). Ditegakkan di drag, panah keyboard, duplikat, dan `sanitizeLayoutElements`. Belum ditegakkan di resize handle dan input angka X/Y panel Properties. Logo/shape boleh.
- **Kunci Sumbu X (`isLockedX`):** elemen terkunci selalu rata tengah (`x = 50 - width/2`); default true untuk elemen baru.
- **Ukuran cetak:** Size A 23×34 cm (rasio 23/34), Size B 17×23 cm (17/23). PDF diekspor dalam mm sebenarnya.
- **Metode cetak:** Embos Foil memaksa warna `#D4AF37`; Sablon hanya hitam/putih. Mengganti metode menimpa warna semua elemen.
- **Konsistensi render:** ukuran font awal HARUS lewat `scaledInitialFontSize(fontSize, canvasWidthPx)` (basis kanvas 400 px). Jangan buat jalur wrap/shrink sendiri; editor, preview, dan ekspor harus identik.
- **Impor gambar:** maks 30% lebar / 40% tinggi kanvas, proporsional.
- **Data sekolah** (alamat, NPSN, akreditasi) tidak boleh dikarang/dikoreksi AI; prompt dan schema dijaga oleh test regresi di `gemini.test.ts`.

## Konvensi

- Komentar kode, teks UI, dan pesan error berbahasa Indonesia; nama simbol berbahasa Inggris.
- **Font UI = sans-serif saja** (Inter, fallback `ui-sans-serif, system-ui, sans-serif`), didefinisikan sekali di `app/layout.tsx` (`--font-inter`) + `app/globals.css` (`--font-sans`). Dilarang `font-serif`, `font-family` serif, atau `style={{ fontFamily }}` pada chrome UI. Pengecualian: konten desain cover di kanvas (`CanvasElement.fontFamily`, default Times New Roman) adalah output produk cetak, bukan UI.
- Logika bisnis ditaruh di `lib/*.ts` murni agar bisa diuji; test di `lib/__tests__`, `app/api/**/__tests__`.
- `computeFitLayout` sengaja no-op saat SSR (tidak ada `document`); jangan panggil Canvas API di jalur render server.
- Jangan `rm -rf .next` saat `next dev` jalan (merusak cache CSS/Tailwind).

## Masalah yang sudah diketahui (belum diperbaiki)

- Docs/README/teks UI masih menyebut Gemini; kode memakai Groq. Route `/api/gemini*` hanya nama warisan.
- Belum ada rate limit pada `/api/gemini*` (user login masih bisa menghabiskan kuota Groq).
- Tooltip Save menulis "Ctrl+S" tetapi tidak ada handler-nya. Undo/redo tidak dibatasi 50 langkah seperti klaim README.
- `commitHistory`/`commitUpdate` memanggil `pushHistory` di dalam updater `setProject` (rawan dobel di StrictMode dev; belum diverifikasi).
- Path SVG logo diduplikasi di `EditorPage` dan `PreviewPage` (2 tempat); `generateId` ada di `EditorPage` dan `lib/utils.ts`.
- Field warisan `palette`, `typography`, `slogan`, `concept` tidak lagi diisi alur create; hanya Dashboard/Preview yang membacanya.
- Zona mika 50–80 berlaku sama untuk Size B padahal mika fisiknya hanya Y 50–69.56.
