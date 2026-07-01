# Web-to-Print Editor

> Platform *Software as a Service* (SaaS) untuk digitalisasi dan otomatisasi proses desain pra-cetak sampul rapor sekolah (SD, SMP, SMA, MAN).

Proyek ini merupakan Tugas Akhir Program Studi D3 Teknik Informatika.

---

## Deskripsi

Industri percetakan konvensional masih mengandalkan perangkat lunak berat seperti CorelDRAW untuk menyusun tata letak sampul rapor secara manual. Proses ini memakan waktu, rawan kesalahan teknis, dan tidak dapat diakses oleh klien tanpa keahlian desain.

Web-to-Print Editor hadir sebagai solusi berbasis web yang menggabungkan tiga pilar utama:

1. **Otomatisasi berbasis AI** — Tata letak elemen desain dihasilkan secara otomatis menggunakan Google Gemini.
2. **Editor vektor interaktif** — Antarmuka berbasis kanvas yang bekerja langsung di browser tanpa instalasi.
3. **Pratinjau produk fisik** — Visualisasi 3D yang mensimulasikan tampilan nyata sebelum naik cetak.

---

## Fitur Utama

### AI Auto-Layout Generator
Pengguna cukup mengisi formulir (nama sekolah, judul, alamat). Sistem AI secara otomatis menghasilkan susunan elemen desain beserta koordinat, hierarki ukuran font (`43pt → 33pt → 23pt → 13pt`), dan warna yang sesuai metode cetak yang dipilih.

### Vector Editor (Gaya CorelDRAW)
Antarmuka editor kanvas interaktif yang familiar bagi operator percetakan, dilengkapi dengan:
- Drag & drop elemen (teks, logo, gambar)
- Undo / Redo hingga 50 langkah
- Sistem **Kunci Sumbu X** — elemen terkunci di posisi rata tengah secara default; pengguna membuka gembok untuk menggeser bebas
- Panel Properties adaptif per jenis elemen

### Constraint Zona Mika
Sistem perlindungan koordinat yang memblokir penempatan elemen teks di rentang `Y = 50–80`. Area ini dicadangkan untuk jendela plastik transparan (*mika nama*) yang terdapat secara fisik pada buku rapor.

### Image Import & Vector Tracing
Pengguna dapat mengimpor logo sekolah (JPG, PNG, SVG). Sistem otomatis:
- Membatasi ukuran gambar maksimal 30% lebar kanvas
- Mengonversi gambar ke vektor hitam-putih (*B&W*) untuk keperluan cetak embos foil dan sablon

### Pratinjau Mockup 3D
Desain yang telah dibuat dapat divisualisasikan dalam bentuk mockup tiga dimensi interaktif dengan efek *parallax* berbasis pergerakan kursor, simulasi tekstur bahan ASE, pantulan material foil, dan representasi mika fisik.

---

## Technology Stack

| Lapisan | Teknologi |
|---|---|
| Framework | Next.js (App Router), React.js |
| Styling | Tailwind CSS, Vanilla CSS |
| Kecerdasan Buatan | Google Gemini 3.5 Flash API |
| Database | Supabase (PostgreSQL) |
| Autentikasi | Supabase Auth (Row Level Security) |
| Penyimpanan Aset | Supabase Storage |

---

## Instalasi

### Prasyarat

- [Node.js](https://nodejs.org/en/) LTS atau versi terbaru
- Akun [Supabase](https://supabase.com)
- API Key dari [Google AI Studio](https://aistudio.google.com/app/apikey)

### Langkah Instalasi

**1. Instal dependensi**

```bash
npm install
# atau
pnpm install
```

**2. Konfigurasi environment**

Salin file `.env.example` menjadi `.env.local` dan isi dengan kredensial berikut:

```env
NEXT_PUBLIC_SUPABASE_URL="https://[YOUR_PROJECT_ID].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
GEMINI_API_KEY="your-gemini-api-key"
```

**3. Inisialisasi database**

Buka SQL Editor pada dasbor Supabase Anda, lalu jalankan kedua skrip berikut secara berurutan:

```
supabase/schema.sql        → Membuat tabel design_projects
supabase/assets_schema.sql → Membuat tabel user_assets
```

**4. Jalankan server pengembangan**

```bash
npm run dev
# atau
pnpm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

---

## Struktur Database

Sistem menggunakan dua tabel utama:

- **`design_projects`** — Menyimpan seluruh data proyek termasuk elemen kanvas dalam format JSONB, metode cetak, ukuran kertas, dan status pengerjaan.
- **`user_assets`** — Menyimpan aset gambar yang diunggah pengguna beserta hasil konversi vektor SVG-nya.

Kedua tabel dilindungi dengan kebijakan *Row Level Security* (RLS) sehingga setiap pengguna hanya dapat mengakses data miliknya sendiri.

---

## Lisensi

Proyek ini dikembangkan untuk keperluan akademik (Tugas Akhir D3) dan terbuka untuk penggunaan edukasional.