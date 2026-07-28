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

import { POST } from "../route";

beforeEach(() => {
  vi.clearAllMocks();
});

function makeRequest(body: any) {
  return new NextRequest("http://localhost/api/gemini", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/gemini — Black-Box: validasi input (Equivalence Partitioning)", () => {
  it("body kosong (tanpa mockupType/dynamicData) -> 400, Groq TIDAK dipanggil", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/required/i);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("hanya mockupType tanpa dynamicData -> 400", async () => {
    const res = await POST(makeRequest({ mockupType: "Rapor SD" }));
    expect(res.status).toBe(400);
  });

  it("body valid & Groq sukses -> 200 dengan hasil JSON terparsing", async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              description: "ok",
              sub_information_options: ["A", "B", "C"],
              layout_elements: [],
            }),
          },
        },
      ],
    });
    const res = await POST(
      makeRequest({
        mockupType: "Rapor SD",
        dynamicData: {
          judulRapor: "Rapor",
          namaSekolah: "SD 1",
          alamatSekolah: "Jl. A",
          subInformasi: "NISN",
        },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.result.sub_information_options).toHaveLength(3);
  });

  it("Groq API melempar error (mis. quota habis) -> 500 dengan pesan error diteruskan", async () => {
    mockCreate.mockRejectedValue(new Error("quota exceeded"));
    const res = await POST(
      makeRequest({
        mockupType: "Rapor SD",
        dynamicData: { judulRapor: "R", namaSekolah: "S", alamatSekolah: "A", subInformasi: "I" },
      })
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("quota exceeded");
  });

  it("respons Groq bukan JSON valid -> ditangani sebagai 500, bukan crash tak tertangani", async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: "not-json{{{" } }] });
    const res = await POST(
      makeRequest({
        mockupType: "Rapor SD",
        dynamicData: { judulRapor: "R", namaSekolah: "S", alamatSekolah: "A", subInformasi: "I" },
      })
    );
    expect(res.status).toBe(500);
  });

  it("REGRESI: prompt/schema TIDAK meminta AI mengarang atau mengoreksi alamat sekolah dari 'pengetahuan umum'", async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              description: "ok",
              sub_information_options: ["A", "B", "C"],
              layout_elements: [],
            }),
          },
        },
      ],
    });
    await POST(
      makeRequest({
        mockupType: "Rapor SD",
        dynamicData: {
          judulRapor: "Rapor",
          namaSekolah: "SDN LAWU ASIH",
          alamatSekolah: "Alamat asli dari database resmi",
          subInformasi: "NISN",
        },
      })
    );

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const callArgs = mockCreate.mock.calls[0][0];

    // Schema tidak boleh punya field "corrected_address" — itu pintu masuk halusinasi
    // AI "mengoreksi" alamat asli yang sudah benar dengan data karangan.
    const schema = callArgs.response_format.json_schema.schema;
    expect(schema.properties).not.toHaveProperty("corrected_address");
    expect(schema.required).not.toContain("corrected_address");

    // Prompt tidak boleh menyuruh AI memverifikasi/mengoreksi alamat dari pengetahuan umum.
    const userPrompt = callArgs.messages.find((m: any) => m.role === "user").content;
    expect(userPrompt.toLowerCase()).not.toMatch(/verify.*(real )?address|correct.*address/);
    expect(userPrompt).toContain("Alamat asli dari database resmi");
  });
});
