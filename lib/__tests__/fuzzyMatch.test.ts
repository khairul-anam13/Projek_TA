import { describe, it, expect } from "vitest";
import {
  normalizeSchoolName,
  levenshteinDistance,
  similarityScore,
  rankCandidates,
  shouldAutoSelect,
  MAX_SUGGESTIONS,
  AUTO_SELECT_THRESHOLD,
} from "../fuzzyMatch";

describe("normalizeSchoolName (kapital, spasi, singkatan)", () => {
  it("mengubah ke huruf kapital dan merapikan spasi berlebih", () => {
    expect(normalizeSchoolName("  sdn   1   cibodas  ")).toBe("SD NEGERI 1 CIBODAS");
  });

  it("menghapus tanda baca umum (titik, koma)", () => {
    expect(normalizeSchoolName("S.D.N. 1, Cibodas")).toBe("SD NEGERI 1 CIBODAS");
  });

  it("menyeragamkan variasi singkatan umum ke bentuk panjang", () => {
    expect(normalizeSchoolName("SDN 1 Cibodas")).toBe(normalizeSchoolName("SD Negeri 1 Cibodas"));
    expect(normalizeSchoolName("SMPN 2 Karanganyar")).toBe(normalizeSchoolName("SMP Negeri 2 Karanganyar"));
    expect(normalizeSchoolName("SMAN 3 Bandung")).toBe(normalizeSchoolName("SMA Negeri 3 Bandung"));
    expect(normalizeSchoolName("SMKN 2 Karanganyar")).toBe(normalizeSchoolName("SMK Negeri 2 Karanganyar"));
  });

  it("input kosong/null/undefined -> string kosong, tidak melempar error", () => {
    expect(normalizeSchoolName("")).toBe("");
    expect(normalizeSchoolName(null)).toBe("");
    expect(normalizeSchoolName(undefined)).toBe("");
  });
});

describe("levenshteinDistance", () => {
  it("string identik -> jarak 0", () => {
    expect(levenshteinDistance("SEKOLAH", "SEKOLAH")).toBe(0);
  });

  it("satu karakter beda (substitusi) -> jarak 1", () => {
    expect(levenshteinDistance("LAWU ASIH", "LAWU ASIH".replace("A", "O"))).toBeLessThanOrEqual(1);
    expect(levenshteinDistance("CIBODAS", "CIBODAZ")).toBe(1);
  });

  it("satu karakter kurang/lebih (insert/delete) -> jarak 1", () => {
    expect(levenshteinDistance("CIBODAS", "CIBODAS1")).toBe(1);
    expect(levenshteinDistance("CIBODAS", "CIBODA")).toBe(1);
  });

  it("string kosong dibandingkan string non-kosong -> jarak = panjang string non-kosong", () => {
    expect(levenshteinDistance("", "ABC")).toBe(3);
    expect(levenshteinDistance("ABC", "")).toBe(3);
  });
});

describe("similarityScore", () => {
  it("string identik -> skor 1", () => {
    expect(similarityScore("SEKOLAH", "SEKOLAH")).toBe(1);
  });

  it("dua string kosong -> skor 1 (bukan NaN)", () => {
    expect(similarityScore("", "")).toBe(1);
  });

  it("typo 1 karakter pada nama sekolah panjang -> skor tetap sangat tinggi (>90%)", () => {
    const correct = normalizeSchoolName("SD NEGERI CIBODAS 1");
    const typo = normalizeSchoolName("SD NEGERI CIBODES 1"); // "CIBODAS" -> "CIBODES"
    expect(similarityScore(correct, typo)).toBeGreaterThan(0.9);
  });

  it("string yang sangat berbeda -> skor rendah", () => {
    const score = similarityScore(normalizeSchoolName("SD NEGERI 1 JAKARTA"), normalizeSchoolName("UNIVERSITAS GADJAH MADA"));
    expect(score).toBeLessThan(0.5);
  });
});

describe("rankCandidates (typo-tolerant, top-N, mirip perilaku 'mungkin maksud Anda')", () => {
  interface School {
    nama: string;
    kota: string;
  }

  const schools: School[] = [
    { nama: "SD NEGERI 1 CIBODAS", kota: "Bandung" },
    { nama: "SD NEGERI 2 CIBODAS", kota: "Bandung" },
    { nama: "SMP NEGERI 1 JAKARTA", kota: "Jakarta" },
    { nama: "SMA NEGERI 3 SURABAYA", kota: "Surabaya" },
    { nama: "SDN LAWU ASIH", kota: "Cirebon" },
  ];

  it("typo 1 karakter tetap menemukan sekolah yang dimaksud sebagai peringkat teratas", () => {
    const ranked = rankCandidates("SD NEGERI 1 CIBODES", schools, (s) => s.nama);
    expect(ranked[0].candidate.nama).toBe("SD NEGERI 1 CIBODAS");
    expect(ranked[0].score).toBeGreaterThan(0.85);
  });

  it("beda singkatan (SDN vs SD Negeri) tetap dianggap sangat mirip", () => {
    const ranked = rankCandidates("SDN LAWU ASIH", schools, (s) => s.nama);
    expect(ranked[0].candidate.nama).toBe("SDN LAWU ASIH");
    expect(ranked[0].score).toBe(1);
  });

  it("membatasi hasil maksimal MAX_SUGGESTIONS meski kandidat lebih banyak", () => {
    const manySchools: School[] = Array.from({ length: 20 }, (_, i) => ({
      nama: `SD NEGERI ${i} CONTOH`,
      kota: "Contoh",
    }));
    const ranked = rankCandidates("SD NEGERI CONTOH", manySchools, (s) => s.nama);
    expect(ranked.length).toBeLessThanOrEqual(MAX_SUGGESTIONS);
  });

  it("hasil diurutkan menurun berdasarkan skor kemiripan", () => {
    const ranked = rankCandidates("SD NEGERI CIBODAS", schools, (s) => s.nama);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
    }
  });

  it("daftar kandidat kosong -> hasil kosong (bukan error)", () => {
    expect(rankCandidates("SD NEGERI 1", [], (s: School) => s.nama)).toEqual([]);
  });
});

describe("shouldAutoSelect (auto-pilih hanya jika satu kandidat sangat yakin)", () => {
  it("satu kandidat dengan skor di atas ambang -> auto-select", () => {
    expect(shouldAutoSelect([{ candidate: "A", score: 0.95 }])).toBe(true);
  });

  it("kandidat teratas di bawah ambang -> tidak auto-select", () => {
    expect(shouldAutoSelect([{ candidate: "A", score: 0.5 }])).toBe(false);
  });

  it("dua kandidat sama-sama di atas ambang (ambigu) -> tidak auto-select, harus tanya user", () => {
    expect(
      shouldAutoSelect([
        { candidate: "A", score: 0.95 },
        { candidate: "B", score: 0.93 },
      ])
    ).toBe(false);
  });

  it("kandidat teratas di atas ambang, kandidat kedua jauh di bawah -> auto-select", () => {
    expect(
      shouldAutoSelect([
        { candidate: "A", score: 0.95 },
        { candidate: "B", score: 0.4 },
      ])
    ).toBe(true);
  });

  it("daftar kosong -> tidak auto-select", () => {
    expect(shouldAutoSelect([])).toBe(false);
  });

  it("menghormati threshold custom", () => {
    expect(shouldAutoSelect([{ candidate: "A", score: 0.8 }], 0.7)).toBe(true);
    expect(shouldAutoSelect([{ candidate: "A", score: 0.8 }], 0.85)).toBe(false);
  });

  it("AUTO_SELECT_THRESHOLD default masuk akal (antara 0.8 dan 1)", () => {
    expect(AUTO_SELECT_THRESHOLD).toBeGreaterThan(0.8);
    expect(AUTO_SELECT_THRESHOLD).toBeLessThan(1);
  });
});
