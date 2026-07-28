import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
}));

vi.mock("groq-sdk", () => ({
  default: vi.fn().mockImplementation(function (this: any) {
    this.chat = { completions: { create: mockCreate } };
  }),
}));

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

function mockSearchResponse(total: number, data: any[]) {
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ status_code: 200, message: "success", total, data }),
  });
}

function mockMatchResponse(matchedIndex: number) {
  mockCreate.mockResolvedValue({
    choices: [{ message: { content: JSON.stringify({ matched_index: matchedIndex }) } }],
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

describe("POST /api/gemini/sekolah — autofill data sekolah dari sumber resmi", () => {
  it("namaSekolah kosong -> 400, tidak memanggil sumber data atau Groq", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("kegagalan menghubungi sumber resmi -> 502, bukan fallback ke Groq", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    const res = await POST(makeRequest({ namaSekolah: "SD NEGERI 1 CONTOH" }));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("sekolah tidak ditemukan (total 0) -> 404 dengan pesan jelas", async () => {
    mockSearchResponse(0, []);
    const res = await POST(makeRequest({ namaSekolah: "SEKOLAH TIDAK ADA XYZ" }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/tidak ditemukan/i);
  });

  it("hasil tunggal -> langsung dipakai tanpa memanggil Groq, alamat & sub_informasi dari data asli", async () => {
    mockSearchResponse(1, [SD_1]);
    const res = await POST(makeRequest({ namaSekolah: "SD NEGERI 1 CONTOH" }));
    expect(res.status).toBe(200);
    expect(mockCreate).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.result.alamat).toBe(
      "Jl. Pendidikan No. 1, Kec. Contoh, Kab. Contoh, Prov. Contoh, 12345"
    );
    expect(body.result.sub_informasi).toContain("NPSN: 12345678");
    expect(body.result.sub_informasi).toContain("Akreditasi: A");
  });

  it("banyak kandidat -> Groq memilih indeks yang cocok, data yang dikembalikan tetap data asli", async () => {
    mockSearchResponse(2, [SD_1, SD_2]);
    mockMatchResponse(1);
    const res = await POST(makeRequest({ namaSekolah: "SD NEGERI 1 LAIN" }));
    expect(res.status).toBe(200);
    expect(mockCreate).toHaveBeenCalledTimes(1);
    const body = await res.json();
    expect(body.result.npsn).toBe("87654321");
    expect(body.result.alamat).toContain("Jl. Lain No. 2");
  });

  it("Groq tidak yakin (matched_index -1) -> 404 dengan daftar saran kandidat, bukan data karangan", async () => {
    mockSearchResponse(2, [SD_1, SD_2]);
    mockMatchResponse(-1);
    const res = await POST(makeRequest({ namaSekolah: "SEKOLAH AMBIGU" }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.candidates).toHaveLength(2);
  });

  it("Groq mengembalikan indeks di luar jangkauan -> diperlakukan sebagai tidak ada kecocokan (404)", async () => {
    mockSearchResponse(2, [SD_1, SD_2]);
    mockMatchResponse(99);
    const res = await POST(makeRequest({ namaSekolah: "SEKOLAH AMBIGU" }));
    expect(res.status).toBe(404);
  });
});
