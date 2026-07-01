# Web-to-Print Editor (SaaS Sampul Rapor)

Selamat datang di repositori **Web-to-Print Editor**, sebuah platform lunak berbasis web (*Software as a Service*) yang ditujukan untuk digitalisasi pra-cetak industri pembuatan sampul rapor (SD, SMP, SMA, MAN). 

Aplikasi ini menyederhanakan siklus desain dengan menggabungkan Editor Vektor bergaya klasik, otomatisasi AI Generatif dari Google Gemini, dan rendering Mockup 3D interaktif. Klien percetakan kini dapat merancang tata letak rapor sendiri dalam hitungan menit tanpa harus memiliki keterampilan desain tingkat lanjut!

---

## ✨ Fitur Utama

- **🤖 AI Auto-Layout Generator (Gemini)**
  Tidak tahu cara menyusun teks yang proporsional? Cukup ketik Nama Sekolah, Judul, dan Alamat, lalu AI Google Gemini akan otomatis mendesain ukuran font, tata letak, dan koordinat *canvas* secara matematis.
- **🎨 Web-Based Vector Editor (Gaya CorelDRAW Klasik)**
  Editor kanvas interaktif yang memungkinkan *drag & drop*, undo/redo, serta kustomisasi warna dan font (Times New Roman & Arial). Dilengkapi fitur **Sumbu X Lock** (Gembok Rata Tengah) untuk menjaga teks tetap presisi di tengah desain.
- **📏 Constraint Zona Mika (Anti-Tabrak)**
  Sistem perlindungan cerdas yang melarang (*blocking*) penempatan elemen teks di koordinat `Y = 50 - 80`. Hal ini dirancang untuk mencegah tulisan cetak tertimpa lubang plastik transparan (Mika Nama) fisik pada buku rapor.
- **🖼️ Image Import & Smart Vector Tracing**
  Dukung penarikan gambar kustom (Logo Sekolah). Saat diimpor, gambar otomatis dibatasi rasio skalanya maksimal 30% dan dikonversi secara pintar menjadi vektor hitam-putih (*B&W*) demi kebutuhan plat cetak metode "Embos Foil" maupun "Sablon".
- **🕶️ Pratinjau Mockup 3D (Realistis)**
  Lihat hasil akhirnya dengan interaksi efek 3D *Parallax*. Mensimulasikan tekstur ASE kulit, bayangan fisik, dan pantulan (*glare*) material foil emas sebelum masuk meja produksi nyata.

---

## 🛠️ Technology Stack

Sistem dibangun secara *Full-Stack* (Client-Server) menggunakan teknologi web modern:
- **Framework Utama:** `React.js`, `Next.js (App Router)`
- **Styling UI:** `Tailwind CSS`, `Vanilla CSS`
- **Kecerdasan Buatan:** `Google Gemini 3.5 Flash API`
- **Database & Auth:** `Supabase (PostgreSQL)` untuk penyimpanan state (JSONB) *Canvas* (Project) dan file SVG *Vector Asset*.

---

## 🚀 Instalasi & Menjalankan Aplikasi Lokal

Ikuti langkah-langkah di bawah ini untuk menjalankan aplikasi di mesin lokal Anda:

### 1. Prasyarat
Pastikan Anda sudah menginstal:
- [Node.js](https://nodejs.org/en/) (Versi terbaru atau LTS direkomendasikan)
- Akun [Supabase](https://supabase.com) (Untuk Database)
- API Key [Google Gemini AI Studio](https://aistudio.google.com/app/apikey)

### 2. Kloning Repositori & Instalasi
```bash
# Instal dependensi
npm install
```

### 3. Pengaturan *Environment Variables*
Ubah nama file `.env.example` menjadi `.env.local`, kemudian lengkapi data kredensial berikut:
```env
NEXT_PUBLIC_SUPABASE_URL="https://[YOUR_SUPABASE_ID].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..."
GEMINI_API_KEY="AIzaSyA..."
```

### 4. Menyiapkan Database Supabase
Jalankan file *SQL script* yang tersedia di *folder* `/supabase` pada dasbor SQL Editor Supabase Anda untuk membangun skema tabel yang dibutuhkan:
- Jalankan `supabase/schema.sql` (Untuk tabel `design_projects`)
- Jalankan `supabase/assets_schema.sql` (Untuk tabel `user_assets`)

### 5. Jalankan Server Pengembangan
```bash
npm run dev
# Atau jika menggunakan pnpm
pnpm run dev
```
Buka browser dan akses [http://localhost:3000](http://localhost:3000)

---

## 📝 Lisensi
Proyek ini dibuat untuk keperluan Tugas Akhir / Penelitian D3 dan bersifat sumber terbuka (*open-source*) untuk penggunaan edukasional.
