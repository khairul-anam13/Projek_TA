# Page Free — Layout Sampul Rapor

Alat desain **sampul rapor siap cetak** untuk percetakan: pilih template → isi data sekolah → sesuaikan → cek siap cetak → ekspor file vektor untuk klise foil/sablon. Proyek Tugas Akhir D3.

## Keputusan produk

- **Pengguna utama:** operator percetakan (banyak sekolah, kerja berulang). Staf sekolah pengguna sekunder.
- **Cakupan:** sampul depan saja. Ukuran **A (23×34 cm)** dan **B (17×23 cm)**.
- **Template:** kurasi sendiri (registry di `lib/templates.ts`), bukan buatan pengguna.
- **Output utama:** PDF/SVG **vektor** ukuran asli (artwork saja). PNG/PDF raster hanya pratinjau.
- **AI** (Groq) hanya pembantu opsional; layout utama dari template yang deterministik.
- Belum dikerjakan (fase lanjut): tautan persetujuan klien, pustaka logo resmi + profil sekolah tersimpan, teks→kurva.

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

Next.js 15 App Router, React 19, Tailwind 4, Supabase (Google OAuth, Postgres + RLS, Storage), Groq `openai/gpt-oss-20b`, jspdf (hanya untuk PDF), `@cadit-app/potrace-ts` (trace logo ke SVG satu tinta), `@imgly/background-removal` (opsional, hapus latar AI untuk foto), `motion`, vitest.

Alias import: `@/*` → root proyek.

## Alur halaman

`/login` → `/dashboard` → `/create` (data sekolah + ukuran + **galeri template**) → `/editor/[id]` → `/preview/[id]` (cek siap cetak + ekspor); `/create/result` hanya untuk jalur AI; `/history` = arsip; `/batch` = unggah CSV banyak sekolah → ZIP PDF/SVG vektor (tautan dari dashboard, tidak menyimpan proyek ke database).

- `middleware.ts`: refresh sesi Supabase; redirect belum-login ke `/login`, sudah-login dari `/`/`/login` ke `/dashboard`; `/api/projects*` dan `/api/gemini*` balas 401 tanpa sesi (route gemini hanya dijaga middleware). `/qa-test` 404 di production, publik hanya di dev.
- `app/auth/callback`: parameter `next` wajib lewat `safeNextPath` (`lib/utils.ts`), jangan dipakai mentah (open redirect).
- `app/(app)/layout.tsx` memasang `AppProvider` (`lib/appContext.tsx`): state `user` + `projects` bertahan antar halaman terautentikasi.
- Halaman di `app/(app)/*` tipis: ambil data/handler dari context, render komponen di `components/`.
- State lintas halaman create↔result lewat `sessionStorage` (`pagefree:ai_recommendation`, `pagefree:create_form_draft`).

## Peta kode

| Area | File | Catatan |
|---|---|---|
| Model | `lib/types.ts` | `CanvasElement` (x/y/width/height persen 0–100, `bind?`), `DesignProject`, `PrintSize` |
| Template | `lib/templates.ts` | 6 template × ukuran A/B; `buildTemplateElements`, `applyBindings`, `withInferredBindings`, `deriveSchoolData` |
| Data terikat | `CanvasElement.bind` | `judulRapor`/`namaSekolah`/`alamatSekolah`/`subInformasi`; ubah data → semua elemen terikat ikut. Judul & nama sekolah selalu KAPITAL |
| Mika & ukuran | `lib/canvasConstraints.ts` | `getPrintSizeCm`, `getMikaRect`, `getMikaZone` (dari ukuran fisik), snap, resize, overlap, impor gambar |
| Cek siap cetak | `lib/preflight.ts` | `runPreflight(project)`: mika, kanvas/margin 8 mm, font ≥ 7 pt (butuh browser), warna tinta, raster, non-Latin, tumpukan |
| Ekspor vektor | `lib/vectorExport.ts` | `buildScene` → `sceneToSvg` / `sceneToPdf`; mm ukuran asli, artwork saja |
| Batch CSV | `lib/csv.ts`, `lib/batch.ts`, `lib/zip.ts`, `components/BatchPage.tsx` | `parseCsv` (RFC 4180, auto `,`/`;`, baris kosong dipertahankan agar indeks = baris spreadsheet) → `parseBatchCsv` (header toleran, kolom wajib `judulRapor/namaSekolah/alamatSekolah/subInformasi`, `mockupType` opsional; baris salah masuk `errors`, tidak menghentikan baris lain) → `buildBatchCover` (template + `buildScene` + `runPreflight` + byte PDF/SVG) / `runBatch` (bertahap, `setTimeout(0)` per baris) → `zipStore` (ZIP tanpa kompresi, tanpa dependensi). `namaSekolah` kosong = baris dilewati; alamat/sub informasi kosong = elemen terikat dihapus (bukan placeholder); judul kosong = judul bawaan. Nama berkas `NNN_Nama_Sekolah.pdf/.svg` (NNN = nomor baris spreadsheet). CSV contoh: `public/contoh-batch.csv` |
| Utilitas SVG | `lib/svgUtils.ts` | `parsePath`, `parseCustomSvg` (menjamin viewBox hasil potrace), `customSvgMarkup` |
| Trace logo | `lib/logoTrace.ts`, `components/ImageToVectorConverter.tsx` | Pipeline murni: `workingSize` (sisi panjang 640–1000 px) → blur peredam derau → latar = median bingkai tepi → mask tinta → potong ke bbox → potrace → SVG berviewBox `0 0 w h` (satu `<path>` evenodd). Tiga mode: `detail` (Otsu tonal hanya dari piksel bukan-latar, sisi tinta otomatis menjauhi luminans latar), `siluet` (jarak warna dari latar), `garis` (Sobel per kanal → kerangka Zhang-Suen → tebal seragam; komponen tonal yang tipis seluruhnya, mis. huruf, tetap padat). `suggestMode` memilih bawaan (berwarna → garis). UI: pratinjau langsung, slider ambang/bintik/derau/tebal garis, "Balik", opsi AI hapus-latar (dynamic import, mati secara bawaan). Aset disimpan ke `user_assets` hanya saat "Gunakan di kanvas". Elemen disisipkan dengan rasio logo (`computeImageImportSize`) |
| Ikon logo | `lib/logoIcons.ts` | Satu sumber path ikon untuk editor, preview, PNG, vektor |
| Layout teks | `lib/textLayout.ts` | Wrap + shrink-to-fit (binary search). Kata tunggal terlalu lebar terus mengecil, bukan dipotong "…" (kecuali sudah di ukuran minimum) |
| Tekstur bahan | `lib/materialTexture.ts` | Parameter SVG filter dipakai on-screen DAN ekspor PNG |
| Cari sekolah | `app/api/gemini/sekolah/route.ts`, `lib/kemendikdasmen.ts`, `lib/fuzzyMatch.ts` | Data dari API resmi Kemendikdasmen, bukan LLM. Auto-select hanya jika skor ≥ 0.9 dan unik |
| AI layout | `app/api/gemini/route.ts` | Groq json_schema strict; output wajib lewat `sanitizeLayoutElements` (zona konservatif 50–80) |
| Persistensi | `lib/supabase/projectMapper.ts` | Satu-satunya pemetaan row ↔ `DesignProject`. `bind` ikut tersimpan di JSONB `elements`. Nama template disimpan di `layoutType` |
| API proyek | `app/api/projects/route.ts`, `[id]/route.ts` | Selalu filter `user_id` (defense in depth di atas RLS) |
| Editor | `components/EditorPage.tsx` | Drag/resize via rAF, zoom, undo/redo, panel Properties (Data sekolah / Mockup & bahan) dan Insert |
| Pratinjau kanvas | `components/DesignCanvas.tsx` | Render SVG hanya-baca; dipakai preview 3D/flat dan galeri template |
| Preview/ekspor | `components/PreviewPage.tsx` | Kartu cek siap cetak; PDF/SVG vektor; PNG/PDF raster pratinjau (`generateHighResFile`) |
| Galeri template | `components/CreateProjectPage.tsx` | Pilihan ukuran A/B + kartu template berpratinjau data sendiri |
| Teks SVG | `components/CanvasFitText.tsx` | Render `lines` hasil `computeFitLayout` persis, tanpa word-wrap browser |
| UI kit | `components/ui/*` | `Button`, `IconButton` (title otomatis jadi aria-label), `Card`, `Badge`, `Input`, `PageHeader`, `ConfirmDialog` (pengganti `window.confirm`; hapus proyek lewat `lib/useDeleteProject.tsx`) |
| Harness QA | `app/qa-test/page.tsx` | Dev-only: semua template × ukuran (pratinjau vs ekspor vektor), form create, batch CSV, dashboard & riwayat (data contoh + dialog hapus), editor, preview |

## Aturan bisnis yang tidak boleh rusak

- **Mika nama fisik:** 13×4,5 cm, tepi bawah 7 cm dari bawah, rata tengah. Posisinya dihitung `getMikaRect(printSize)`: Size A ≈ Y 66,2–79,4; Size B ≈ Y 50–69,6. Jangan menulis ulang angka persen di komponen.
- **Zona mika untuk teks:** elemen `text` tidak boleh menutupi mika. Ditegakkan di drag, panah keyboard, duplikat (size-aware, memperhitungkan tinggi elemen via `enforceMikaConstraint(type, y, height, zone)`), dan `runPreflight`. **Belum** ditegakkan di resize handle dan input angka X/Y (preflight yang menangkap). Layout AI memakai zona konservatif 50–80 yang aman untuk kedua ukuran.
- **Template harus lolos preflight tanpa temuan** di kedua ukuran (dites di `templates.test.ts`): tanpa teks di mika, dekorasi tidak menimpa konten, di dalam margin aman 8 mm.
- **Kunci Sumbu X (`isLockedX`):** elemen terkunci selalu rata tengah (`x = 50 - width/2`).
- **Metode cetak:** Embos Foil memaksa warna `#D4AF37`; Sablon hanya hitam/putih. Mengganti metode menimpa warna semua elemen. Logo hasil tracing otomatis mengikuti metode.
- **Konsistensi render:** ukuran font awal HARUS lewat `scaledInitialFontSize(fontSize, canvasWidthPx)` (basis kanvas 400 px). Jangan buat jalur wrap/shrink sendiri; editor, preview, PNG, dan vektor harus identik. Ekspor vektor mengukur teks di kanvas 1600 px, sama dengan ekspor PNG.
- **Ekspor vektor = artwork saja:** tanpa warna bahan, tanpa gambar mika, satu warna tinta. Teks tetap teks (font Times/Helvetica standar PDF), gambar raster tidak ikut sebagai vektor.
- **Impor gambar:** maks 30% lebar / 40% tinggi kanvas, proporsional.
- **Data sekolah** (alamat, NPSN, akreditasi) tidak boleh dikarang/dikoreksi AI; prompt dan schema dijaga test regresi di `gemini.test.ts`.

## Menambah template

Tambah objek di `TEMPLATES` (`lib/templates.ts`) dengan `build(ctx)` memakai `toolkit(ctx)`: `stack(...)` untuk blok atas (judul/logo/nama/alamat), `subInfo()` untuk teks bawah mika, `frame`/`corners`/`bar` untuk dekorasi. Semua test template otomatis ikut (`COVER_TEMPLATES`); lihat hasil visual di `/qa-test` (dev).

## Konvensi

- Komentar kode, teks UI, dan pesan error berbahasa Indonesia; nama simbol berbahasa Inggris.
- **Font UI = sans-serif saja** (Inter, fallback `ui-sans-serif, system-ui, sans-serif`), didefinisikan sekali di `app/layout.tsx` (`--font-inter`) + `app/globals.css` (`--font-sans`). Dilarang `font-serif`, `font-family` serif, atau `style={{ fontFamily }}` pada chrome UI. Pengecualian: konten desain cover di kanvas (`CanvasElement.fontFamily`, default Times New Roman) adalah output produk cetak, bukan UI.
- Logika bisnis ditaruh di `lib/*.ts` murni agar bisa diuji; test di `lib/__tests__`, `app/api/**/__tests__`.
- `computeFitLayout` sengaja no-op saat SSR (tidak ada `document`); jangan panggil Canvas API di jalur render server. `runPreflight` melewati cek ukuran font di luar browser.
- Jangan `rm -rf .next` saat `next dev` jalan (merusak cache CSS/Tailwind). Hook `rtk` membungkus `next dev` jadi ringkasan build; jalankan server lewat PowerShell bila perlu proses mentah.

## Masalah yang sudah diketahui (belum diperbaiki)

- Docs/README masih menyebut Gemini; kode memakai Groq (teks UI sudah dinetralkan). Route `/api/gemini*` hanya nama warisan.
- Belum ada rate limit pada `/api/gemini*` (user login masih bisa menghabiskan kuota Groq).
- Undo/redo tidak dibatasi 50 langkah seperti klaim README.
- `commitHistory`/`commitUpdate` memanggil `pushHistory` di dalam updater `setProject` (rawan dobel di StrictMode dev; belum diverifikasi).
- Teks di ekspor vektor belum dikonversi ke kurva; font hanya Times New Roman/Arial (belum ada pustaka font, belum ada Arab untuk madrasah).
- Ambang preflight (margin 8 mm, font minimum 7 pt) adalah asumsi awal; konfirmasi ke percetakan.
- Field warisan `palette`, `typography`, `slogan`, `concept`, `audience`, `category` dan `PRODUCT_CATALOG` masih ada walau tidak lagi dipakai alur utama.
- `app/qa-test/page.tsx` punya error lint lama (`setMounted` di effect).
- Batch CSV dibaca sebagai UTF-8 (CSV ANSI/Windows-1252 dari Excel merusak karakter non-ASCII); baris dengan temuan preflight tetap ikut ZIP (hanya ditandai di tabel); tanpa pratinjau gambar per sekolah.
- Aset `user_assets` (hasil tracing) tersimpan tetapi belum ada UI untuk memakainya ulang.
- Trace logo: gradasi besar pada mode `detail` tetap terpotong di satu ambang (pakai `garis`/`siluet`); teks logo sangat kecil (< ±1 mm pada ukuran cetak) hilang atau pecah di semua mode; tebal garis `garis` memakai piksel kerja, belum dikonversi ke mm sesuai ukuran elemen di kanvas; hasil belum dipratinjau dengan warna tinta metode cetak.
- Vitest meng-inline `@cadit-app/potrace-ts` (`vitest.config.ts`) karena import relatif tanpa ekstensi; muncul peringatan "Sourcemap ... missing source files" yang tidak berbahaya.
