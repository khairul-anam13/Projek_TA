import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../sekolah/route";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => {
  vi.clearAllMocks();
});

function makeRequest(body: any) {
  return new NextRequest("http://localhost/api/gemini/sekolah", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Setiap panggilan fetch (primary/distinctive/leave-one-out) mendapat respons yang sama. */
function mockSearchResponse(total: number, data: any[]) {
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ status_code: 200, message: "success", total, data }),
  });
}

/** Respons berbeda tergantung keyword yang dikirim — untuk mensimulasikan
 * bagaimana API resmi hanya menemukan hasil untuk keyword yang benar-benar cocok. */
function mockSearchResponseByKeyword(handler: (keyword: string) => { total: number; data: any[] }) {
  fetchMock.mockImplementation(async (_url: string, init: any) => {
    const body = JSON.parse(init.body);
    const result = handler(body.keyword);
    return { ok: true, status: 200, json: async () => ({ status_code: 200, message: "success", ...result }) };
  });
}

const SD_1 = {
  sekolah_id: "id-1",
  npsn: "12345678",
  nama: "SD NEGERI 1 CONTOH",
  bentuk_pendidikan: "SD",
  status_sekolah: "NEGERI",
  akreditasi: "A",
  alamat_jalan: "Jl. Pendidikan No. 1",
  nama_dusun: null,
  kecamatan: "Kec. Contoh",
  kabupaten: "Kab. Contoh",
  provinsi: "Prov. Contoh",
  kode_pos: "12345",
};

const SD_2 = {
  sekolah_id: "id-2",
  npsn: "87654321",
  nama: "SD NEGERI 1 LAIN",
  bentuk_pendidikan: "SD",
  status_sekolah: "NEGERI",
  akreditasi: "B",
  alamat_jalan: "Jl. Lain No. 2",
  nama_dusun: null,
  kecamatan: "Kec. Lain",
  kabupaten: "Kab. Lain",
  provinsi: "Prov. Lain",
  kode_pos: "54321",
};

const LAWU_ASIH = {
  sekolah_id: "id-3",
  npsn: "11223344",
  nama: "SD NEGERI LAWU ASIH",
  bentuk_pendidikan: "SD",
  status_sekolah: "NEGERI",
  akreditasi: "B",
  alamat_jalan: "Jl. Lawu No. 1",
  nama_dusun: null,
  kecamatan: "Kec. Lawu",
  kabupaten: "Kab. Cirebon",
  provinsi: "Jawa Barat",
  kode_pos: "45100",
};

describe("POST /api/gemini/sekolah — autofill data sekolah dari sumber resmi (fuzzy, tanpa LLM)", () => {
  it("namaSekolah kosong -> 400, tidak memanggil sumber data", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("kegagalan menghubungi sumber resmi -> 502", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    const res = await POST(makeRequest({ namaSekolah: "SD NEGERI 1 CONTOH" }));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("sekolah benar-benar tidak ditemukan -> 404 dengan pesan jelas untuk memeriksa ejaan, tanpa daftar kandidat", async () => {
    mockSearchResponse(0, []);
    const res = await POST(makeRequest({ namaSekolah: "SEKOLAH TIDAK ADA XYZ" }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/tidak ditemukan/i);
    expect(body.error).toMatch(/periksa/i);
    expect(body.candidates ?? []).toHaveLength(0);
  });

  it("hasil tunggal & identik dengan input -> langsung dipakai (auto-select), alamat & sub_informasi dari data asli", async () => {
    mockSearchResponse(1, [SD_1]);
    const res = await POST(makeRequest({ namaSekolah: "SD NEGERI 1 CONTOH" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.result.alamat).toBe(
      "Jl. Pendidikan No. 1, Kec. Contoh, Kab. Contoh, Prov. Contoh, 12345"
    );
    expect(body.result.sub_informasi).toContain("NPSN: 12345678");
    expect(body.result.sub_informasi).toContain("Akreditasi: A");
  });

  it("input dengan typo 1-2 karakter tetap menemukan & auto-select sekolah yang dimaksud (bug utama yang diperbaiki)", async () => {
    mockSearchResponseByKeyword((kw) =>
      kw === "SD NEGERI LAWU" ? { total: 1, data: [LAWU_ASIH] } : { total: 0, data: [] }
    );
    // "ASIG" adalah typo untuk "ASIH"
    const res = await POST(makeRequest({ namaSekolah: "SD NEGERI LAWU ASIG" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.result.nama_sekolah).toBe("SD NEGERI LAWU ASIH");
    expect(body.result.npsn).toBe("11223344");
  });

  it("beda singkatan (SDN vs SD Negeri) tetap auto-select lewat fuzzy matching, tanpa exact match", async () => {
    mockSearchResponse(1, [LAWU_ASIH]);
    const res = await POST(makeRequest({ namaSekolah: "SDN Lawu Asih" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result.nama_sekolah).toBe("SD NEGERI LAWU ASIH");
  });

  it("satu kandidat tapi kemiripannya rendah -> TIDAK auto-select, dikembalikan sebagai pilihan (bukan ditebak)", async () => {
    mockSearchResponse(1, [SD_2]); // "SD NEGERI 1 LAIN" jauh berbeda dari query di bawah
    const res = await POST(makeRequest({ namaSekolah: "SMA TARUNA NUSANTARA" }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.needsChoice).toBe(true);
    expect(body.candidates).toHaveLength(1);
  });

  it("banyak kandidat, salah satu jelas paling mirip -> auto-select kandidat itu, bukan LLM yang memilih", async () => {
    mockSearchResponse(2, [SD_1, SD_2]);
    const res = await POST(makeRequest({ namaSekolah: "SD NEGERI 1 LAIN" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result.npsn).toBe("87654321");
    expect(body.result.alamat).toContain("Jl. Lain No. 2");
  });

  it("banyak kandidat dengan skor kemiripan sama-sama tinggi (ambigu) -> 404 dengan daftar pilihan berskor, bukan data karangan", async () => {
    const TWIN_A = { ...SD_1, sekolah_id: "twin-a", nama: "SD NEGERI 1 MERDEKA" };
    const TWIN_B = { ...SD_2, sekolah_id: "twin-b", nama: "SD NEGERI 1 MERDEKA" };
    mockSearchResponse(2, [TWIN_A, TWIN_B]);
    const res = await POST(makeRequest({ namaSekolah: "SD NEGERI 1 MERDEKA" }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.needsChoice).toBe(true);
    expect(body.candidates).toHaveLength(2);
    expect(body.candidates[0]).toHaveProperty("score");
  });

  it("kandidat yang sama sekali tidak mirip tidak diikutsertakan sebagai top pilihan yang auto-select", async () => {
    mockSearchResponse(1, [SD_1]);
    const res = await POST(makeRequest({ namaSekolah: "UNIVERSITAS GADJAH MADA" }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.needsChoice).toBe(true);
  });

  it("field kabupaten opsional diteruskan sebagai filter pencarian", async () => {
    mockSearchResponse(1, [LAWU_ASIH]);
    await POST(makeRequest({ namaSekolah: "SD NEGERI LAWU ASIH", kabupaten: "Kab. Cirebon" }));
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body).kabupaten_kota).toBe("Kab. Cirebon");
  });
});
