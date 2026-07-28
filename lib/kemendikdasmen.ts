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

/** Mencari sekolah berdasarkan kata kunci nama pada database resmi Kemendikdasmen. */
export async function searchSekolah(keyword: string, size = 15): Promise<SekolahSearchResult> {
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
      kabupaten_kota: "",
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

/**
 * Pencarian sekolah yang lebih tangguh terhadap keterbatasan API resmi: query multi-kata
 * seperti "SD NEGERI 1 CIBODAS" sering kalah bersaing dengan token generik ("SD NEGERI 1")
 * sehingga sekolah yang benar tidak muncul di hasil. Di sini kita gabungkan hasil pencarian
 * dari frasa asli dengan hasil pencarian kata-kata unik saja (mis. "CIBODAS"), lalu
 * digabung & dihilangkan duplikatnya. Semua kandidat tetap data asli dari Kemendikdasmen.
 */
export async function searchSekolahSmart(keyword: string, size = 25): Promise<SekolahSearchResult> {
  const primary = await searchSekolah(keyword, size);

  const distinctive = distinctiveKeyword(keyword);
  if (!distinctive || distinctive === keyword.trim().toUpperCase()) {
    return primary;
  }

  const secondary = await searchSekolah(distinctive, size);

  const merged = new Map<string, SekolahCandidate>();
  for (const c of [...secondary.data, ...primary.data]) {
    merged.set(c.sekolah_id, c);
  }

  return {
    total: Math.max(primary.total, secondary.total),
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
