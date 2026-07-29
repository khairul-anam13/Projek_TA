import { NextRequest, NextResponse } from "next/server";
import {
  buildAlamat,
  buildSubInformasi,
  searchSekolahSmart,
  SekolahCandidate,
} from "@/lib/kemendikdasmen";
import { rankCandidates, shouldAutoSelect, ScoredCandidate } from "@/lib/fuzzyMatch";
import { getErrorMessage } from "@/lib/utils";

function candidateSuggestions(ranked: ScoredCandidate<SekolahCandidate>[]) {
  return ranked.map(({ candidate: c, score }) => ({
    nama: c.nama,
    npsn: c.npsn,
    kabupaten: c.kabupaten,
    provinsi: c.provinsi,
    score: Math.round(score * 100) / 100,
  }));
}

export async function POST(req: NextRequest) {
  try {
    const { namaSekolah, kabupaten } = await req.json();

    if (!namaSekolah || !String(namaSekolah).trim()) {
      return NextResponse.json(
        { success: false, error: "Nama sekolah wajib diisi." },
        { status: 400 }
      );
    }

    const query = String(namaSekolah).trim();

    let searchResult;
    try {
      searchResult = await searchSekolahSmart(query, 25, kabupaten ? String(kabupaten) : "");
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
          error: `Sekolah "${query}" tidak ditemukan di database resmi Kemendikdasmen. Coba periksa kembali penulisan nama sekolah, atau isi data secara manual.`,
        },
        { status: 404 }
      );
    }

    // Typo-tolerant fuzzy ranking (Levenshtein similarity, lib/fuzzyMatch.ts) —
    // BUKAN exact match dan BUKAN LLM: skor kemiripan dihitung secara
    // deterministik terhadap data asli yang sudah ditemukan di atas, supaya
    // hasilnya konsisten & tidak berisiko "mengarang" pilihan seperti model
    // bahasa. Kandidat teratas hanya dipakai otomatis kalau sangat meyakinkan
    // (lihat shouldAutoSelect) — kalau ambigu, user yang memilih.
    const ranked = rankCandidates(query, searchResult.data, (c) => c.nama);

    if (!shouldAutoSelect(ranked)) {
      return NextResponse.json(
        {
          success: false,
          needsChoice: true,
          error: `Ditemukan ${ranked.length > 1 ? "beberapa sekolah yang mirip" : "satu sekolah yang mirip, namun belum pasti"} dengan "${query}". Pilih salah satu:`,
          candidates: candidateSuggestions(ranked),
        },
        { status: 404 }
      );
    }

    const matched = ranked[0].candidate;

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
  } catch (error: unknown) {
    console.error("Pencarian data sekolah gagal:", error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error, "Gagal memproses pencarian data sekolah."),
      },
      { status: 500 }
    );
  }
}
