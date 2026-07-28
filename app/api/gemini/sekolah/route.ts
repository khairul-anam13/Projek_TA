import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import {
  buildAlamat,
  buildSubInformasi,
  searchSekolahSmart,
  SekolahCandidate,
} from "@/lib/kemendikdasmen";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MATCH_SCHEMA = {
  type: "object",
  properties: {
    matched_index: {
      type: "number",
      description: "Indeks kandidat paling cocok (0-based), atau -1 jika tidak ada yang cocok",
    },
  },
  required: ["matched_index"],
  additionalProperties: false,
} as const;

function candidateSuggestions(candidates: SekolahCandidate[], limit = 5) {
  return candidates.slice(0, limit).map((c) => ({
    nama: c.nama,
    npsn: c.npsn,
    kabupaten: c.kabupaten,
    provinsi: c.provinsi,
  }));
}

/** Meminta LLM (Groq) memilih kandidat MANA (indeks) yang paling cocok dengan ketikan user.
 * Model hanya memilih dari daftar data asli yang sudah diambil dari Kemendikdasmen —
 * tidak diminta dan tidak diizinkan untuk mengarang data sekolah baru. */
async function pickBestMatch(
  namaSekolahInput: string,
  candidates: SekolahCandidate[]
): Promise<number> {
  const prompt = `Seorang pengguna mengetik nama sekolah: "${namaSekolahInput}"

Berikut daftar kandidat sekolah nyata dari database resmi Kemendikdasmen (indeks dimulai dari 0):
${candidates
  .map(
    (c, i) =>
      `${i}. ${c.nama} | NPSN: ${c.npsn} | ${c.bentuk_pendidikan ?? "-"} | ${c.status_sekolah ?? "-"} | Kec. ${c.kecamatan ?? "-"}, ${c.kabupaten ?? "-"}, ${c.provinsi ?? "-"}`
  )
  .join("\n")}

Tugas: pilih indeks kandidat yang PALING sesuai dengan yang dimaksud user. Pertimbangkan kemiripan nama, jenjang, dan lokasi jika disebutkan.
JANGAN mengarang sekolah baru. Jika tidak ada kandidat yang cukup meyakinkan cocok, kembalikan matched_index: -1.`;

  const response = await groq.chat.completions.create({
    model: "openai/gpt-oss-20b",
    max_completion_tokens: 1024,
    reasoning_effort: "low",
    messages: [
      {
        role: "system",
        content:
          "Anda adalah asisten pencocokan data yang HANYA memilih dari daftar yang diberikan, tidak pernah mengarang data baru.",
      },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "match_result", strict: true, schema: MATCH_SCHEMA },
    },
  });

  const parsed = JSON.parse(
    response.choices[0]?.message?.content?.trim() || '{"matched_index": -1}'
  );
  return Number(parsed.matched_index);
}

export async function POST(req: NextRequest) {
  try {
    const { namaSekolah } = await req.json();

    if (!namaSekolah || !String(namaSekolah).trim()) {
      return NextResponse.json(
        { success: false, error: "Nama sekolah wajib diisi." },
        { status: 400 }
      );
    }

    let searchResult;
    try {
      searchResult = await searchSekolahSmart(String(namaSekolah).trim());
    } catch (fetchError) {
      console.error("Kemendikdasmen search failed:", fetchError);
      return NextResponse.json(
        {
          success: false,
          error: "Gagal menghubungi sumber data resmi Kemendikdasmen. Coba lagi beberapa saat lagi.",
        },
        { status: 502 }
      );
    }

    if (searchResult.data.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Sekolah "${namaSekolah}" tidak ditemukan di database resmi Kemendikdasmen. Periksa kembali ejaan nama sekolah, atau isi data secara manual.`,
        },
        { status: 404 }
      );
    }

    let matched: SekolahCandidate;

    if (searchResult.data.length === 1) {
      matched = searchResult.data[0];
    } else {
      const matchedIndex = await pickBestMatch(namaSekolah, searchResult.data);
      if (
        !Number.isInteger(matchedIndex) ||
        matchedIndex < 0 ||
        matchedIndex >= searchResult.data.length
      ) {
        return NextResponse.json(
          {
            success: false,
            error: `Tidak ditemukan sekolah yang cocok persis dengan "${namaSekolah}". Berikut beberapa sekolah mirip yang ditemukan:`,
            candidates: candidateSuggestions(searchResult.data),
          },
          { status: 404 }
        );
      }
      matched = searchResult.data[matchedIndex];
    }

    return NextResponse.json({
      success: true,
      result: {
        nama_sekolah: matched.nama,
        npsn: matched.npsn,
        alamat: buildAlamat(matched),
        sub_informasi: buildSubInformasi(matched),
        sumber: "sekolah.data.kemendikdasmen.go.id",
      },
    });
  } catch (error: any) {
    console.error("Pencarian data sekolah gagal:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Gagal memproses pencarian data sekolah.",
      },
      { status: 500 }
    );
  }
}
