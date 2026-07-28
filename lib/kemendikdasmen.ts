/**
 * Klien untuk sumber data resmi Kemendikdasmen (sekolah.data.kemendikdasmen.go.id).
 * Endpoint internal situs ini tidak didokumentasikan secara publik; ditemukan dengan
 * membaca bundle JS resmi (Angular app "Sekolah Kita") dan diverifikasi manual.
 * Semua data sekolah yang dikembalikan berasal dari sini, bukan dari Gemini.
 */

const SEKOLAH_API_BASE = "https://sekolah.data.kemendikdasmen.go.id/v1/sekolah-service";

export interface SekolahCandidate {
  sekolah_id: string;
  npsn: string;
  nama: string;
  bentuk_pendidikan: string | null;
  status_sekolah: string | null;
  akreditasi: string | null;
  alamat_jalan: string | null;
  nama_dusun: string | null;
  kecamatan: string | null;
  kabupaten: string | null;
  provinsi: string | null;
  kode_pos: string | null;
}

export interface SekolahSearchResult {
  total: number;
  data: SekolahCandidate[];
}

/** Mencari sekolah berdasarkan kata kunci nama pada database resmi Kemendikdasmen.
 * `kabupatenKota` opsional dipakai untuk mempersempit hasil saat user memilih
 * satu kandidat spesifik dari daftar saran (dua sekolah berbeda kadang punya
 * nama yang persis sama di kabupaten berbeda). */
export async function searchSekolah(keyword: string, size = 15, kabupatenKota = ""): Promise<SekolahSearchResult> {
  const res = await fetch(`${SEKOLAH_API_BASE}/sekolah/cari-sekolah`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      page: 0,
      size,
      keyword,
      kabupaten_kota: kabupatenKota,
      bentuk_pendidikan: "",
      status_sekolah: "",
    }),
  });

  if (!res.ok) {
    throw new Error(`Kemendikdasmen search API returned ${res.status}`);
  }

  const json = await res.json();
  return {
    total: Number(json?.total ?? 0),
    data: Array.isArray(json?.data) ? json.data : [],
  };
}

const GENERIC_TOKENS = new Set([
  "SD", "SMP", "SMA", "SMK", "MA", "MI", "MTS", "MAN", "MIN", "SLB",
  "NEGERI", "SWASTA", "SEKOLAH",
]);

/** Membuang kata generik (SD, NEGERI, angka, dst) agar tersisa kata yang benar-benar unik. */
function distinctiveKeyword(input: string): string {
  return input
    .toUpperCase()
    .split(/\s+/)
    .filter((t) => t && !GENERIC_TOKENS.has(t) && !/^\d+$/.test(t))
    .join(" ")
    .trim();
}

/** Menghasilkan varian "leave-one-out": query dengan tepat satu kata dibuang,
 * bergiliran untuk tiap kata. Dipakai sebagai upaya terakhir ketika pencarian
 * frasa penuh maupun kata kunci "distinctive" sama-sama nihil — kemungkinan
 * besar karena typo ada di salah satu kata, dan API resmi Kemendikdasmen
 * tidak melakukan fuzzy matching sendiri (hanya cocok persis/substring), jadi
 * satu kata yang salah eja bisa membuat SELURUH pencarian gagal walau
 * kata-kata lainnya benar. */
function leaveOneOutVariants(keyword: string): string[] {
  const tokens = keyword.trim().split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return [];
  return tokens
    .map((_, i) => tokens.filter((_, j) => j !== i).join(" "))
    .filter((variant) => variant.length > 0);
}

/**
 * Pencarian sekolah yang lebih tangguh terhadap keterbatasan API resmi & typo pengguna:
 * 1. Coba frasa asli apa adanya.
 * 2. Kalau kalah bersaing dengan token generik ("SD NEGERI 1 CIBODAS" -> "SD NEGERI 1"),
 *    coba lagi dengan kata-kata unik saja (mis. "CIBODAS").
 * 3. Kalau KEDUANYA nihil (kemungkinan typo di salah satu kata), coba lagi dengan
 *    satu kata dibuang bergiliran — kata-kata yang benar tetap bisa menemukan sekolahnya
 *    walau satu kata lain salah eja.
 * Semua hasil digabung & dihilangkan duplikatnya. Semua kandidat tetap data asli dari
 * Kemendikdasmen — pemilihan/penilaian kemiripan akhir dilakukan di lib/fuzzyMatch.ts,
 * bukan di sini.
 */
export async function searchSekolahSmart(
  keyword: string,
  size = 25,
  kabupatenKota = ""
): Promise<SekolahSearchResult> {
  const primary = await searchSekolah(keyword, size, kabupatenKota);

  const merged = new Map<string, SekolahCandidate>();
  for (const c of primary.data) merged.set(c.sekolah_id, c);
  let bestTotal = primary.total;

  const distinctive = distinctiveKeyword(keyword);
  if (distinctive && distinctive !== keyword.trim().toUpperCase()) {
    const secondary = await searchSekolah(distinctive, size, kabupatenKota);
    for (const c of secondary.data) merged.set(c.sekolah_id, c);
    bestTotal = Math.max(bestTotal, secondary.total);
  }

  if (merged.size === 0) {
    const variants = leaveOneOutVariants(keyword.trim().toUpperCase());
    const attempts = await Promise.all(
      variants.map((variant) =>
        searchSekolah(variant, size, kabupatenKota).catch(
          () => ({ total: 0, data: [] as SekolahCandidate[] })
        )
      )
    );
    for (const attempt of attempts) {
      for (const c of attempt.data) merged.set(c.sekolah_id, c);
      bestTotal = Math.max(bestTotal, attempt.total);
    }
  }

  return {
    total: bestTotal,
    data: Array.from(merged.values()).slice(0, size),
  };
}

/** Menyusun alamat sekolah dari data resmi (tanpa data hasil karangan AI). */
export function buildAlamat(c: SekolahCandidate): string {
  const parts = [
    c.alamat_jalan,
    c.nama_dusun,
    c.kecamatan,
    c.kabupaten,
    c.provinsi,
    c.kode_pos,
  ].filter((v) => v && String(v).trim().length > 0);
  return parts.join(", ");
}

/** Menyusun teks Sub Informasi & Keterangan Tambahan dari data resmi. */
export function buildSubInformasi(c: SekolahCandidate): string {
  const lines: string[] = [];
  if (c.npsn) lines.push(`NPSN: ${c.npsn}`);
  if (c.bentuk_pendidikan) lines.push(`Bentuk Pendidikan: ${c.bentuk_pendidikan}`);
  if (c.status_sekolah) lines.push(`Status: ${c.status_sekolah}`);
  if (c.akreditasi) lines.push(`Akreditasi: ${c.akreditasi}`);
  return lines.join("\n");
}
