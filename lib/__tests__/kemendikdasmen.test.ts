import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchSekolah, searchSekolahSmart, buildAlamat, buildSubInformasi, SekolahCandidate } from "../kemendikdasmen";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => {
  vi.clearAllMocks();
});

function mockResponseFor(handler: (keyword: string) => { total: number; data: any[] }) {
  fetchMock.mockImplementation(async (_url: string, init: any) => {
    const body = JSON.parse(init.body);
    const result = handler(body.keyword);
    return {
      ok: true,
      status: 200,
      json: async () => ({ status_code: 200, message: "success", ...result }),
    };
  });
}

const SEKOLAH: SekolahCandidate = {
  sekolah_id: "id-1",
  npsn: "12345678",
  nama: "SD NEGERI LAWU ASIH",
  bentuk_pendidikan: "SD",
  status_sekolah: "NEGERI",
  akreditasi: "A",
  alamat_jalan: "Jl. Lawu No. 1",
  nama_dusun: null,
  kecamatan: "Kec. Lawu",
  kabupaten: "Kab. Cirebon",
  provinsi: "Jawa Barat",
  kode_pos: "45100",
};

describe("searchSekolah", () => {
  it("mengirim keyword & kabupaten_kota pada body request", async () => {
    mockResponseFor(() => ({ total: 1, data: [SEKOLAH] }));
    await searchSekolah("SD NEGERI LAWU ASIH", 15, "Kab. Cirebon");
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.keyword).toBe("SD NEGERI LAWU ASIH");
    expect(body.kabupaten_kota).toBe("Kab. Cirebon");
  });

  it("kabupaten_kota default ke string kosong kalau tidak diberikan", async () => {
    mockResponseFor(() => ({ total: 0, data: [] }));
    await searchSekolah("SD NEGERI LAWU ASIH");
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body).kabupaten_kota).toBe("");
  });

  it("response bukan ok -> melempar error", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    await expect(searchSekolah("X")).rejects.toThrow();
  });
});

describe("searchSekolahSmart — toleransi typo lewat retry leave-one-out", () => {
  it("keyword satu kata non-generik langsung berhasil -> distinctive == keyword asli, tidak ada retry", async () => {
    // Satu token yang bukan token generik: distinctiveKeyword() tidak membuang apa pun,
    // hasilnya identik dengan keyword asli -> secondary search dilewati.
    mockResponseFor((kw) => (kw === "TELADAN" ? { total: 1, data: [SEKOLAH] } : { total: 0, data: [] }));
    const result = await searchSekolahSmart("TELADAN");
    expect(result.data).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("frasa asli nihil tapi kata kunci distinctive (tanpa token generik) berhasil", async () => {
    mockResponseFor((kw) => (kw === "LAWU ASIH" ? { total: 1, data: [SEKOLAH] } : { total: 0, data: [] }));
    const result = await searchSekolahSmart("SD NEGERI LAWU ASIH");
    expect(result.data).toHaveLength(1);
    expect(result.data[0].nama).toBe("SD NEGERI LAWU ASIH");
  });

  it("typo pada satu kata: frasa asli & distinctive nihil, tapi varian leave-one-out (kata typo dibuang) berhasil", async () => {
    // User mengetik "ASIG" (typo untuk "ASIH"). "SD NEGERI LAWU" (tanpa "ASIG") harus tetap ketemu.
    mockResponseFor((kw) => (kw === "SD NEGERI LAWU" ? { total: 1, data: [SEKOLAH] } : { total: 0, data: [] }));
    const result = await searchSekolahSmart("SD NEGERI LAWU ASIG");
    expect(result.data).toHaveLength(1);
    expect(result.data[0].nama).toBe("SD NEGERI LAWU ASIH");
  });

  it("semua varian (asli, distinctive, leave-one-out) nihil -> hasil tetap kosong, bukan error", async () => {
    mockResponseFor(() => ({ total: 0, data: [] }));
    const result = await searchSekolahSmart("SEKOLAH TIDAK ADA SAMA SEKALI");
    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("satu kata (tanpa spasi) yang nihil TIDAK memicu leave-one-out (tidak ada kata lain untuk dibuang)", async () => {
    mockResponseFor(() => ({ total: 0, data: [] }));
    await searchSekolahSmart("XYZ");
    // Hanya request untuk keyword asli (distinctive sama dgn asli karena 1 token, leave-one-out butuh >=2 token).
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("kegagalan salah satu request leave-one-out tidak menggagalkan keseluruhan pencarian", async () => {
    // Varian leave-one-out dari "SD NEGERI LAWU ASIG" (4 token): salah satu
    // dibuat gagal jaringan, salah satu lain dibuat berhasil — memastikan
    // Promise.all tidak batal total gara-gara satu percobaan gagal.
    let call = 0;
    fetchMock.mockImplementation(async (_url: string, init: any) => {
      call++;
      const body = JSON.parse(init.body);
      if (body.keyword === "SD NEGERI LAWU") {
        throw new Error("network blip");
      }
      if (body.keyword === "SD NEGERI ASIG") {
        return { ok: true, status: 200, json: async () => ({ total: 1, data: [SEKOLAH] }) };
      }
      return { ok: true, status: 200, json: async () => ({ total: 0, data: [] }) };
    });
    const result = await searchSekolahSmart("SD NEGERI LAWU ASIG");
    expect(result.data.length).toBeGreaterThan(0);
    expect(call).toBeGreaterThan(1);
  });

  it("kabupatenKota diteruskan ke semua percobaan pencarian (termasuk retry)", async () => {
    mockResponseFor(() => ({ total: 0, data: [] }));
    await searchSekolahSmart("SD NEGERI LAWU ASIG", 25, "Kab. Cirebon");
    for (const call of fetchMock.mock.calls) {
      const body = JSON.parse(call[1].body);
      expect(body.kabupaten_kota).toBe("Kab. Cirebon");
    }
  });
});

describe("buildAlamat / buildSubInformasi", () => {
  it("buildAlamat menggabungkan bagian alamat yang tersedia, memisah dengan koma", () => {
    expect(buildAlamat(SEKOLAH)).toBe("Jl. Lawu No. 1, Kec. Lawu, Kab. Cirebon, Jawa Barat, 45100");
  });

  it("buildAlamat melewati field yang kosong/null", () => {
    const partial = { ...SEKOLAH, nama_dusun: null, kode_pos: "" };
    expect(buildAlamat(partial)).not.toContain(",,");
  });

  it("buildSubInformasi menyusun NPSN, bentuk pendidikan, status, akreditasi", () => {
    const info = buildSubInformasi(SEKOLAH);
    expect(info).toContain("NPSN: 12345678");
    expect(info).toContain("Akreditasi: A");
  });
});
