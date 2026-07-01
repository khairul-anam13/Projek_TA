# Bab III — Perancangan Sistem
## Web-to-Print Editor (SaaS Sampul Rapor)

---

## 3.1 Flowchart Alur Sistem

Berikut adalah alur kerja utama sistem dari pengguna pertama kali membuka aplikasi hingga proyek desain selesai.

```mermaid
flowchart TD
    A([Mulai]) --> B[Buka Aplikasi]
    B --> C{Sudah Login?}
    C -- Tidak --> D[Halaman Login / Register]
    D --> E[Autentikasi via Supabase Auth]
    E --> F[Dashboard Proyek]
    C -- Ya --> F

    F --> G{Pilih Aksi}
    G -- Buka Proyek Lama --> H[Load Data Proyek dari Database]
    G -- Buat Proyek Baru --> I[Pilih Jenis Mockup\nRapor SD / SMP / SMA / MAN]

    I --> J[Isi Formulir Data Sekolah\nJudul, Nama, Alamat, Sub-Info]
    J --> K[Pilih Ukuran Cetak\nSize A 23x34cm / Size B 17x23cm]
    K --> L[Pilih Metode Cetak\nEmbos Foil / Sablon]
    L --> M{Gunakan AI?}

    M -- Ya --> N[Kirim Prompt ke Google Gemini API]
    N --> O[Tampil Animasi Loading]
    O --> P{AI Berhasil Merespons?}
    P -- Tidak --> Q[Tampilkan Pesan Error]
    Q --> M
    P -- Ya --> R[Terima Array JSON Koordinat Elemen]
    R --> S[Render Elemen ke Canvas Editor]

    M -- Tidak --> T[Load Template Default Mockup]
    T --> S
    H --> S

    S --> U[Halaman Editor]
    U --> V{Aksi Pengguna}
    V -- Tambah atau Edit Elemen --> W[Manipulasi via Editor Canvas]
    W --> U
    V -- Simpan --> AB[Simpan JSON ke Supabase DB]
    AB --> AC{Berhasil?}
    AC -- Ya --> AD[Tampil Notifikasi Sukses]
    AD --> U
    AC -- Tidak --> AE[Tampil Pesan Gagal]
    AE --> U
    V -- Preview --> AF[Halaman Preview & Mockup 3D]
    AF --> AG([Selesai])
```

---

## 3.12 Perancangan Sistem

### 3.12.1 Use Case Diagram

Diagram berikut menggambarkan interaksi antara aktor (Pengguna) dengan fungsionalitas yang tersedia dalam sistem.

**Aktor:**
- **Pengguna** — Operator percetakan atau klien sekolah yang menggunakan aplikasi
- **Sistem AI** — Google Gemini API yang dipanggil sebagai layanan eksternal

```mermaid
graph TB
    subgraph Aktor
        U([Pengguna])
        AI([Sistem AI\nGemini API])
    end

    subgraph "Sistem Web-to-Print Editor"
        UC01[UC01\nRegister & Login]
        UC02[UC02\nLihat Daftar Proyek]
        UC03[UC03\nBuat Proyek Baru]
        UC04[UC04\nPilih Jenis Mockup]
        UC05[UC05\nIsi Formulir Data Sekolah]
        UC06[UC06\nGenerate Layout dengan AI]
        UC07[UC07\nEdit Elemen di Canvas]
        UC08[UC08\nKunci / Buka Gembok Sumbu X]
        UC09[UC09\nImport Gambar / Logo]
        UC10[UC10\nSimpan Proyek]
        UC11[UC11\nPratinjau Mockup 3D]
        UC12[UC12\nHapus Proyek]
    end

    U --- UC01
    U --- UC02
    U --- UC03
    U --- UC04
    U --- UC05
    U --- UC06
    U --- UC07
    U --- UC08
    U --- UC09
    U --- UC10
    U --- UC11
    U --- UC12

    UC06 -. "menggunakan" .-> AI

    UC03 -. "include" .-> UC04
    UC04 -. "include" .-> UC05
    UC05 -. "extend" .-> UC06
    UC07 -. "include" .-> UC08
```

| Kode | Nama Use Case | Aktor | Deskripsi |
|---|---|---|---|
| UC01 | Register & Login | Pengguna | Mendaftar akun baru atau masuk menggunakan email dan kata sandi |
| UC02 | Lihat Daftar Proyek | Pengguna | Melihat semua proyek milik pengguna di halaman dashboard |
| UC03 | Buat Proyek Baru | Pengguna | Memulai sesi pembuatan desain baru |
| UC04 | Pilih Jenis Mockup | Pengguna | Memilih jenis rapor (SD, SMP, SMA, MAN) sebelum mengisi data |
| UC05 | Isi Formulir Data Sekolah | Pengguna | Memasukkan teks konten: judul, nama, alamat, dan sub-informasi |
| UC06 | Generate Layout dengan AI | Pengguna, Sistem AI | Mengirim data ke Gemini API untuk mendapatkan tata letak otomatis |
| UC07 | Edit Elemen di Canvas | Pengguna | Memanipulasi elemen (drag, ubah teks, ubah warna, resize) |
| UC08 | Kunci / Buka Gembok Sumbu X | Pengguna | Mengunci atau membebaskan posisi horizontal suatu elemen |
| UC09 | Import Gambar / Logo | Pengguna | Mengunggah gambar eksternal (logo sekolah) ke dalam kanvas |
| UC10 | Simpan Proyek | Pengguna | Menyimpan state kanvas ke database Supabase |
| UC11 | Pratinjau Mockup 3D | Pengguna | Membuka halaman pratinjau dengan efek tiga dimensi |
| UC12 | Hapus Proyek | Pengguna | Menghapus proyek yang tidak dibutuhkan dari dashboard |

---

### 3.12.2 Activity Diagram

Berikut adalah activity diagram per fitur/aktivitas utama dalam sistem.

---

#### AD-01: Register dan Login

```mermaid
flowchart TD
    A([Mulai]) --> B[Buka Halaman Aplikasi]
    B --> C{Sudah punya akun?}
    C -- Tidak --> D[Klik Daftar]
    D --> E[Isi Email dan Kata Sandi]
    E --> F[Klik Daftar]
    F --> G[Sistem Kirim Data ke Supabase Auth]
    G --> H{Registrasi Berhasil?}
    H -- Tidak --> I[Tampilkan Pesan Error]
    I --> E
    H -- Ya --> J[Kirim Email Verifikasi]
    J --> K[Pengguna Verifikasi Email]
    K --> L[Arahkan ke Dashboard]
    C -- Ya --> M[Isi Email dan Kata Sandi]
    M --> N[Klik Masuk]
    N --> O[Sistem Validasi via Supabase Auth]
    O --> P{Login Berhasil?}
    P -- Tidak --> Q[Tampilkan Pesan Salah]
    Q --> M
    P -- Ya --> L
    L --> R([Selesai])
```

---

#### AD-02: Membuat Proyek Baru

```mermaid
flowchart TD
    A([Mulai]) --> B[Klik Buat Proyek Baru di Dashboard]
    B --> C[Pilih Jenis Mockup]
    C --> D{Mockup Dipilih?}
    D -- Tidak --> C
    D -- Ya --> E[Isi Formulir Data Sekolah]
    E --> F[Pilih Ukuran Cetak]
    F --> G[Pilih Metode Cetak]
    G --> H{Gunakan AI?}
    H -- Ya --> I[Lanjut ke Alur Generate AI]
    H -- Tidak --> J[Load Template Default Mockup]
    J --> K[Buka Editor dengan Elemen Default]
    I --> K
    K --> L([Selesai])
```

---

#### AD-03: Generate Layout dengan AI

```mermaid
flowchart TD
    A([Mulai]) --> B[Sistem Susun Prompt dari Data Formulir]
    B --> C[Tampilkan Halaman Loading Animasi]
    C --> D[Kirim Request POST ke API Gemini]
    D --> E[Google Gemini Terima Prompt]
    E --> F[AI Proses Koordinat Font dan Warna]
    F --> G[AI Kembalikan JSON Array Elemen]
    G --> H{Respons Valid?}
    H -- Tidak --> I[Tangkap Error]
    I --> J[Tampilkan Pesan Gagal]
    J --> K[Pengguna Kembali ke Form]
    K --> A
    H -- Ya --> L[Parse JSON Array]
    L --> M[Validasi: Tidak Ada Elemen di Zona Mika Y50-80]
    M --> N[Render Elemen ke Canvas Editor]
    N --> O[Loading Hilang, Editor Tampil Penuh]
    O --> P([Selesai])
```

---

#### AD-04: Penggunaan Editor Canvas

Diagram ini mencakup seluruh interaksi pengguna di dalam halaman Editor: penambahan elemen, manipulasi properti, pengaturan posisi, validasi zona mika, undo/redo, dan penyimpanan proyek.

```mermaid
flowchart TD
    Start([Masuk ke Halaman Editor]) --> Loop{Pilih Aksi}

    Loop -- Tambah Teks --> AT1[Buat Objek Elemen Teks]
    AT1 --> AT2[Hitung X = 50 - lebar/2\nSet isLockedX = true]
    AT2 --> AT3[Set Default: fontSize 23, fontFamily,\ncolor, align center]
    AT3 --> Commit[Tambah ke Array Elements\nPush ke History Stack]

    Loop -- Tambah Logo --> AL1[Buat Objek Logo SVG]
    AL1 --> AL2[Set isLockedX = true, Posisi Tengah]
    AL2 --> Commit

    Loop -- Import Gambar --> IMG1{Format Valid?\nJPG PNG SVG}
    IMG1 -- Tidak --> IMG2[Tampil Pesan Error Format]
    IMG2 --> Loop
    IMG1 -- Ya --> IMG3[Baca File via FileReader]
    IMG3 --> IMG4{Lebar lebih dari 30 Persen?}
    IMG4 -- Ya --> IMG5[Skalakan Proporsional]
    IMG4 -- Tidak --> IMG6[Gunakan Ukuran Asli]
    IMG5 --> Commit
    IMG6 --> Commit

    Loop -- Klik Elemen --> SEL[Elemen Terpilih\nPanel Properties Tampil]
    SEL --> Aksi{Pilih Sub-Aksi}

    Aksi -- Ubah Teks --> E1[Update field text]
    Aksi -- Ubah Font Size --> E2[Pilih: 43 / 33 / 23 / 13 pt]
    Aksi -- Ubah Warna --> E3{Metode Cetak?}
    E3 -- Embos Foil --> E3A[Paksa Emas #D4AF37]
    E3 -- Sablon --> E3B[Pilih Hitam atau Putih]
    E3A --> Commit
    E3B --> Commit
    E1 --> Commit
    E2 --> Commit

    Aksi -- Toggle Gembok --> E4{Status isLockedX?}
    E4 -- true --> E4A[Set false, Elemen Bebas Bergerak]
    E4 -- false --> E4B[Hitung X Tengah, Set true]
    E4A --> Commit
    E4B --> Commit

    Aksi -- Geser via Drag --> DRG1[Catat Posisi Awal]
    DRG1 --> DRG2[Hitung delta dx dan dy]
    DRG2 --> DRG3{isLockedX aktif?}
    DRG3 -- Ya --> DRG4[Paksa tx = 50 - lebar/2]
    DRG3 -- Tidak --> DRG5[Gunakan tx Normal]
    DRG4 --> DRG6{ty masuk Y 50-80?}
    DRG5 --> DRG6
    DRG6 -- Ya --> DRG7[Dorong ke Y 49 atau Y 81]
    DRG6 -- Tidak --> DRG8[Posisi Diterima]
    DRG7 --> DRG9{Mouse Dilepas?}
    DRG8 --> DRG9
    DRG9 -- Tidak --> DRG2
    DRG9 -- Ya --> Commit

    Aksi -- Hapus Elemen --> DEL1[Filter Array: Buang selectedId]
    DEL1 --> DEL2[Set selectedId = null]
    DEL2 --> Commit

    Commit --> Loop

    Loop -- Ctrl+Z Undo --> UND{History Ada?}
    UND -- Tidak --> Loop
    UND -- Ya --> UND1[Ambil State Lama, Terapkan ke Elements]
    UND1 --> Loop

    Loop -- Ctrl+Y Redo --> RED{Future Ada?}
    RED -- Tidak --> Loop
    RED -- Ya --> RED1[Ambil State Berikutnya, Terapkan]
    RED1 --> Loop

    Loop -- Simpan Ctrl+S --> SAV1[Serialisasi JSON Elements + Metadata]
    SAV1 --> SAV2[Kirim Upsert ke Supabase DB]
    SAV2 --> SAV3{Berhasil?}
    SAV3 -- Ya --> SAV4[Toast: Project Saved]
    SAV3 -- Tidak --> SAV5[Toast: Gagal, Coba Lagi]
    SAV4 --> Loop
    SAV5 --> Loop

    Loop -- Preview --> END1([Lanjut ke AD-05 Preview])
    Loop -- Kembali ke Dashboard --> END2([Selesai])
```

---

#### AD-05: Pratinjau Mockup 3D

```mermaid
flowchart TD
    A([Mulai]) --> B[Klik Tombol Preview di Toolbar]
    B --> C[Halaman Preview Dibuka]
    C --> D[Ambil Data Proyek dari State]
    D --> E[Render Canvas Desain 2D Flat]
    E --> F[Terapkan CSS 3D Transforms\nperspective, rotateX, rotateY]
    F --> G[Overlay Tekstur Bahan Sesuai material_color]
    G --> H[Tampilkan Aset Mika di Koordinat Fisik]
    H --> I[Aktifkan Listener Mouse Move]
    I --> J[Hitung Rotasi dari Posisi Kursor]
    J --> K[Update rotateX dan rotateY Real-time]
    K --> L{Pengguna Klik Kembali?}
    L -- Tidak --> J
    L -- Ya --> M[Kembali ke Editor]
    M --> N([Selesai])
```

---

#### AD-06: Menghapus Proyek dari Dashboard

```mermaid
flowchart TD
    A([Mulai]) --> B[Klik Hapus pada Kartu Proyek]
    B --> C[Tampilkan Dialog Konfirmasi]
    C --> D{Konfirmasi Pengguna?}
    D -- Batal --> E[Dialog Ditutup]
    E --> F([Selesai])
    D -- Ya, Hapus --> G[Kirim Request DELETE ke Supabase]
    G --> H{Berhasil?}
    H -- Tidak --> I[Tampil Pesan Error]
    I --> F
    H -- Ya --> J[Hapus Proyek dari State Lokal]
    J --> K[Kartu Proyek Hilang dari Dashboard]
    K --> F
```

---

## 3.13 Perancangan Database

### 3.13.1 Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    USERS ||--o{ DESIGN_PROJECTS : "memiliki (1 ke banyak)"
    USERS ||--o{ USER_ASSETS : "mengunggah (1 ke banyak)"

    USERS {
        uuid    id          PK
        text    email
        text    created_at
    }

    DESIGN_PROJECTS {
        text        id              PK
        uuid        user_id         FK
        text        name
        text        product_type
        text        mockup_type
        text        status
        text        print_size
        text        print_method
        text        background_color
        text        material_color
        jsonb       elements
        jsonb       palette
        jsonb       typography
        text        layout_type
        jsonb       dynamic_data
        timestamptz created_at
        timestamptz updated_at
    }

    USER_ASSETS {
        uuid        id              PK
        uuid        user_id         FK
        text        name
        text        original_path
        text        vector_svg
        timestamptz created_at
    }
```

---

### 3.13.2 Entity Relationship Table

#### Tabel `design_projects`

| Nama Kolom | Tipe Data | Constraint | Keterangan |
|---|---|---|---|
| id | TEXT | PRIMARY KEY | ID unik proyek |
| user_id | UUID | NOT NULL, FK → auth.users(id) | Pemilik proyek; CASCADE DELETE |
| name | TEXT | NOT NULL | Nama proyek desain |
| product_type | TEXT | NOT NULL, DEFAULT 'Sampul Rapor' | Kategori produk cetak |
| mockup_type | TEXT | NULL | Jenis rapor (SD, SMP, SMA, MAN) |
| status | TEXT | CHECK (Draft/Final/Selesai) | Status pengerjaan proyek |
| print_size | TEXT | NULL | Ukuran kertas cetak (A atau B) |
| print_method | TEXT | NULL | Metode cetak (Embos Foil / Sablon) |
| background_color | TEXT | DEFAULT '#1E3A8A' | Warna latar kanvas editor |
| material_color | TEXT | NULL | Warna bahan ASE untuk pratinjau 3D |
| elements | JSONB | NOT NULL, DEFAULT '[]' | Array objek elemen kanvas |
| palette | JSONB | NULL | Palet warna hasil rekomendasi AI |
| typography | JSONB | NULL | Tipografi hasil rekomendasi AI |
| layout_type | TEXT | NULL | Jenis layout (Modern Center, dll.) |
| dynamic_data | JSONB | NULL | Data input formulir (judul, nama sekolah, dsb.) |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Waktu proyek dibuat |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Waktu terakhir proyek diubah (auto-trigger) |

**Sub-skema kolom `elements` (JSONB Array):**

| Field | Tipe | Keterangan |
|---|---|---|
| id | string | ID unik elemen |
| type | string | Jenis elemen: `text`, `logo`, `image`, `shape` |
| text | string? | Isi teks (khusus type = text) |
| x | number | Posisi horizontal (persentase 0–100) |
| y | number | Posisi vertikal (persentase 0–100) |
| width | number | Lebar elemen (persentase 0–100) |
| height | number | Tinggi elemen (persentase 0–100) |
| fontSize | number? | Ukuran font dalam pt (43, 33, 23, atau 13) |
| fontFamily | string? | Jenis font (Times New Roman / Arial) |
| fontWeight | string? | Ketebalan font (normal / bold) |
| align | string? | Perataan teks (left / center / right) |
| color | string? | Warna elemen dalam format hex |
| isLockedX | boolean | Status kunci sumbu horizontal (default: true) |
| zIndex | number | Urutan layer elemen |
| imageUrl | string? | URL gambar (khusus type = image) |
| logoIcon | string? | Nama ikon logo (khusus type = logo) |

---

#### Tabel `user_assets`

| Nama Kolom | Tipe Data | Constraint | Keterangan |
|---|---|---|---|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | ID unik aset |
| user_id | UUID | NOT NULL, FK → auth.users(id) | Pemilik aset; CASCADE DELETE |
| name | TEXT | NOT NULL, DEFAULT 'Untitled Asset' | Nama berkas yang diunggah |
| original_path | TEXT | NULL | Path file asli di Supabase Storage |
| vector_svg | TEXT | NOT NULL | String SVG hasil konversi vektor B&W |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Waktu aset diunggah |

**Relasi antar tabel:**

| Tabel Sumber | Kolom | Tabel Target | Kolom | Jenis Relasi |
|---|---|---|---|---|
| design_projects | user_id | auth.users | id | Many-to-One |
| user_assets | user_id | auth.users | id | Many-to-One |

---

## 3.14 Perancangan Antarmuka

Berikut adalah rancangan tampilan (*wireframe*) dari tiap halaman utama aplikasi.

---

### Halaman 1: Dashboard Proyek

```
+------------------------------------------------------------------+
|  [Logo]  Web-to-Print Editor                       [Avatar User] |
+------------------------------------------------------------------+
|                                                                  |
|  Selamat datang, [Nama User]                                     |
|  Proyek desain Anda                                              |
|                                                                  |
|  +------------------+  +------------------+  +----------------+ |
|  |  [Thumbnail]     |  |  [Thumbnail]     |  |  [ + Baru ]    | |
|  |  Rapor SD N 1    |  |  Rapor SMP 2     |  |                | |
|  |  Draft           |  |  Final           |  |  Buat Proyek   | |
|  |  [Buka] [Hapus]  |  |  [Buka] [Hapus]  |  |  Baru          | |
|  +------------------+  +------------------+  +----------------+ |
|                                                                  |
+------------------------------------------------------------------+
```

---

### Halaman 2: Form Buat Proyek Baru

```
+------------------------------------------------------------------+
|  < Kembali       Buat Proyek Baru                                |
+------------------------------------------------------------------+
|                                                                  |
|  Langkah 1: Pilih Jenis Mockup                                   |
|  [ ] Rapor SD    [ ] Rapor SMP    [ ] Rapor SMA/SMK              |
|  [ ] Rapor MAN                                                   |
|                                                                  |
|  Langkah 2: Isi Data Sekolah                                     |
|  Judul Rapor    : [......................................]         |
|  Nama Sekolah   : [......................................]         |
|  Alamat Sekolah : [......................................]         |
|  Sub Informasi  : [......................................]         |
|                                                                  |
|  Langkah 3: Pengaturan Cetak                                     |
|  Ukuran  : [ Size A (23x34cm) v ]                                |
|  Metode  : [ Embos Foil        v ]                               |
|                                                                  |
|  Langkah 4: Pilih Mode Desain                                    |
|  ( ) Gunakan AI (Otomatis)                                       |
|  ( ) Tanpa AI (Langsung ke Editor)                               |
|                                                                  |
|  [ Mulai Desain ]                                                |
|                                                                  |
+------------------------------------------------------------------+
```

---

### Halaman 3: Loading AI Generation

```
+------------------------------------------------------------------+
|                                                                  |
|              [ Animasi Spinner / Gelombang ]                     |
|                                                                  |
|         AI sedang merancang tata letak desain Anda...            |
|                                                                  |
|         Memproses data sekolah                       [====  ]    |
|         Menghitung koordinat elemen                  [======]    |
|         Menyusun hierarki tipografi                  [===   ]    |
|                                                                  |
+------------------------------------------------------------------+
```

---

### Halaman 4: Editor Kanvas

```
+------------------------------------------------------------------+
| File  Edit  View  Layout  Arrange  Text  Tools  Help  |  [Simpan]|
+------------------------------------------------------------------+
| [<Back] [Save] [Undo] [Redo] [Preview] | Zoom: [100%]  [Export] |
+-------------------------------+---------+------------------------+
|                               |         |                        |
| [Insert Docker]               | KANVAS  | [Properties Docker]   |
| - Teks                        |         |                        |
| - Logo / Icon                 | +------+| [ Kunci Sumbu X  ]    |
| - Import Gambar               | |      || [Buka Gembok]          |
|                               | |Desain||                        |
| [Layers Docker]               | |      || [ Tipografi ]          |
| - el_title     (locked)       | |      || Font: [Times New R. v] |
| - el_logo      (locked)       | |      || Teks: [............]   |
| - el_school    (locked)       | |      || Size: [33 pt     v]    |
| - el_address   (locked)       | |      || B I [ Rata Tengah ]    |
|                               | |======||                        |
| [Colors Docker]               | | MIKA || [ Warna ]             |
| [Warna Material]              | |======|| [Emas][Hitam][Putih]   |
| [  ] [  ] [  ] [  ]          | |      ||                        |
|                               | +------+| [ Posisi ]            |
|                               |         | X: 10   Y: 36         |
+-------------------------------+---------+------------------------+
```

---

### Halaman 5: Pratinjau Mockup 3D

```
+------------------------------------------------------------------+
|  < Kembali ke Editor                    [Print / Export PDF]     |
+------------------------------------------------------------------+
|                                                                  |
|             +================================+                   |
|            /|  RAPOR PESERTA DIDIK           |                   |
|           / |                                |                   |
|          /  |   [Logo Sekolah]               |                   |
|         /   |   SD NEGERI 1 CONTOH           |                   |
|        /    |   Jl. Contoh No. 1             |                   |
|       /     |                                |                   |
|      /      |   +------------------+         |                   |
|     /       |   | [Mika Nama]      |         |                   |
|    /        |   +------------------+         |                   |
|   /         |                                |                   |
|  /          |   Tahun Pelajaran 2024/2025    |                   |
| +===========+================================+                   |
|                                                                  |
|         Gerakkan mouse untuk memutar tampilan 3D                 |
|                                                                  |
+------------------------------------------------------------------+
```
