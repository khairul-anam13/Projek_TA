/**
 * Pencocokan nama sekolah yang toleran terhadap typo/perbedaan ejaan, mirip
 * perilaku search engine ("did you mean..."). Dipakai untuk me-ranking
 * kandidat sekolah dari database resmi Kemendikdasmen terhadap ketikan user,
 * BUKAN untuk mencari/mengarang data — sumber data tetap selalu dari
 * lib/kemendikdasmen.ts.
 */

export const MAX_SUGGESTIONS = 5;

/** Skor kemiripan (0-1) minimum agar kandidat teratas langsung dipakai
 * tanpa perlu konfirmasi user. */
export const AUTO_SELECT_THRESHOLD = 0.9;

// Singkatan umum penamaan sekolah Indonesia -> bentuk panjang kanonis, supaya
// "SDN 1" dan "SD NEGERI 1" dianggap identik saat dibandingkan kemiripannya.
const ABBREVIATION_PATTERNS: [RegExp, string][] = [
  [/\bSDN\b/g, "SD NEGERI"],
  [/\bSD N\b/g, "SD NEGERI"],
  [/\bSMPN\b/g, "SMP NEGERI"],
  [/\bSMP N\b/g, "SMP NEGERI"],
  [/\bSMAN\b/g, "SMA NEGERI"],
  [/\bSMA N\b/g, "SMA NEGERI"],
  [/\bSMKN\b/g, "SMK NEGERI"],
  [/\bSMK N\b/g, "SMK NEGERI"],
  [/\bMIN\b/g, "MI NEGERI"],
  [/\bMTSN\b/g, "MTS NEGERI"],
  [/\bMAN\b/g, "MA NEGERI"],
];

/**
 * Menormalkan nama sekolah agar bisa dibandingkan secara adil: kapital,
 * spasi rapi, tanpa tanda baca umum, dan singkatan diseragamkan ke bentuk
 * panjang. Dipakai baik untuk input user maupun nama kandidat dari API.
 */
export function normalizeSchoolName(input: string | null | undefined): string {
  if (!input) return "";
  let s = input.toUpperCase().trim();
  s = s.replace(/[.,]/g, "");
  s = s.replace(/\s+/g, " ");
  for (const [pattern, replacement] of ABBREVIATION_PATTERNS) {
    s = s.replace(pattern, replacement);
  }
  return s.replace(/\s+/g, " ").trim();
}

/** Jumlah edit (insert/delete/substitute) minimum dari string `a` ke `b`. */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prevRow = new Array<number>(n + 1);
  let currRow = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prevRow[j] = j;

  for (let i = 1; i <= m; i++) {
    currRow[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j] + 1, // hapus
        currRow[j - 1] + 1, // sisip
        prevRow[j - 1] + cost // ganti
      );
    }
    [prevRow, currRow] = [currRow, prevRow];
  }
  return prevRow[n];
}

/** Skor kemiripan 0-1 (1 = identik) berbasis Levenshtein distance relatif
 * terhadap panjang string terpanjang. */
export function similarityScore(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return Math.max(0, 1 - levenshteinDistance(a, b) / maxLen);
}

export interface ScoredCandidate<T> {
  candidate: T;
  /** 0-1, 1 = kecocokan sempurna setelah normalisasi. */
  score: number;
}

/**
 * Meranking `candidates` berdasarkan kemiripan nama terhadap `query` (typo-
 * tolerant), mengembalikan maksimal `limit` hasil teratas — mirip daftar
 * saran "mungkin maksud Anda" pada search engine.
 */
export function rankCandidates<T>(
  query: string,
  candidates: T[],
  getName: (candidate: T) => string,
  limit: number = MAX_SUGGESTIONS
): ScoredCandidate<T>[] {
  const normalizedQuery = normalizeSchoolName(query);
  return candidates
    .map((candidate) => ({
      candidate,
      score: similarityScore(normalizedQuery, normalizeSchoolName(getName(candidate))),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Menentukan apakah kandidat teratas cukup meyakinkan untuk langsung dipakai
 * tanpa konfirmasi user: skornya harus di atas AUTO_SELECT_THRESHOLD, DAN
 * tidak ada kandidat lain yang skornya juga setinggi itu (kalau ada beberapa
 * kandidat yang sama-sama sangat mirip, tetap harus tampil sebagai pilihan
 * supaya user yang menentukan — bukan ditebak sistem).
 */
export function shouldAutoSelect<T>(
  ranked: ScoredCandidate<T>[],
  threshold: number = AUTO_SELECT_THRESHOLD
): boolean {
  if (ranked.length === 0) return false;
  if (ranked[0].score < threshold) return false;
  if (ranked.length > 1 && ranked[1].score >= threshold) return false;
  return true;
}
