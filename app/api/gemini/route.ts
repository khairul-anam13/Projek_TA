import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import { sanitizeLayoutElements } from "@/lib/canvasConstraints";
import { getErrorMessage } from "@/lib/utils";

const LAYOUT_SCHEMA = {
  type: "object",
  properties: {
    description: { type: "string", description: "Detailed concept explanation in Indonesian" },
    sub_information_options: {
      type: "array",
      description: "Array of exactly 3 different string options for Sub Informasi",
      items: { type: "string" },
    },
    layout_elements: {
      type: "array",
      description: "Array of canvas elements",
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "Unique ID, e.g. el_title, el_sub_info" },
          type: { type: "string", description: "Either 'text' or 'logo'" },
          text: { type: "string", description: "The text content (empty string if type is 'logo')" },
          logoIcon: { type: "string", description: "The icon name (empty string if type is 'text'), e.g. 'shield' or 'building'" },
          x: { type: "number", description: "X coordinate (0-100)" },
          y: { type: "number", description: "Y coordinate (0-100)" },
          width: { type: "number", description: "Width percentage (10-100)" },
          height: { type: "number", description: "Height percentage (5-20)" },
          fontSize: { type: "number", description: "Font size for text (0 if type is 'logo')" },
          fontWeight: { type: "string", description: "'normal' or 'bold'" },
          align: { type: "string", description: "'left', 'center', or 'right'" },
          fontFamily: { type: "string", description: "'Times New Roman' or 'Arial'" },
          color: { type: "string", description: "Always '#D4AF37'" },
          zIndex: { type: "number", description: "Stacking order" },
        },
        required: [
          "id", "type", "text", "logoIcon", "x", "y", "width", "height",
          "fontSize", "fontWeight", "align", "fontFamily", "color", "zIndex",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["description", "sub_information_options", "layout_elements"],
  additionalProperties: false,
} as const;

export async function POST(req: NextRequest) {
  try {
    // Dibuat per-request, bukan di module scope: konstruktor Groq melempar
    // error secara sinkron kalau GROQ_API_KEY kosong, yang sebelumnya
    // membuat langkah "collecting page data" saat next build gagal total di
    // lingkungan mana pun tanpa secret tersebut ter-set (termasuk saat build
    // lokal/CI sebelum secret di-deploy) — bukan hanya saat rute ini benar-benar dipanggil.
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const { mockupType, dynamicData } = await req.json();

    if (!mockupType || !dynamicData) {
      return NextResponse.json(
        { error: "mockupType and dynamicData are required." },
        { status: 400 }
      );
    }

    const { judulRapor, namaSekolah, alamatSekolah, subInformasi } = dynamicData;

    const prompt = `You are an expert brand designer and AI layout assistant for physical printing templates.
Generate a personalized visual design layout for a ${mockupType} printing mockup.
Here is the data provided by the user — treat it as authoritative and do NOT invent, "correct", or replace it with information from your own general knowledge:
- Judul Rapor: ${judulRapor}
- Nama Sekolah: ${namaSekolah}
- Alamat Sekolah: ${alamatSekolah}
- Sub Informasi: ${subInformasi}

Your tasks:
1. Based on formal report (rapor) standards, recommend 3 options for "Sub Informasi & Keterangan Tambahan" phrasing/formatting (e.g. how to present NPSN, Akreditasi, Tahun Pelajaran, etc.) in "sub_information_options". Base these ONLY on reformatting/summarizing the "Sub Informasi" text the user provided above — do not add facts (like NPSN numbers or accreditation) that are not present in it.
2. The printing size is roughly an A4/F4 aspect ratio. The coordinate system uses 0-100 for X and Y axes (0,0 is top left, 100,100 is bottom right).
3. Generate an array of layout elements in "layout_elements" that best positions this information on the page. Use the "Alamat Sekolah" exactly as given above, and use the FIRST option from your "sub_information_options" for the sub information text.

RULES & CONSTRAINTS for layout_elements:
Each element gets its own non-overlapping vertical slot, top to bottom. Y + height must never exceed the NEXT element's Y (leave a small gap), and every element must stay within its slot's Y range — do not let height push an element past its slot boundary into the next one:
1. Title (Judul Rapor): slot Y 5-16 (i.e. Y between 5 and 16, height <= 10). Font size must be 43.
2. Logo: slot Y 17-29 (height <= 11), horizontally centered, symmetrically between Title and School Name. Logo icon should be "shield" (for Garuda) or "building" (for Kemenag). Type must be "logo".
3. School name (Nama Sekolah): slot Y 30-40 (height <= 9), highly prominent and centered. Font size must be 33.
4. Alamat: slot Y 41-49 (height <= 7). Font size must be 23.
5. Sub Informasi: slot Y 82-93 (height <= 9). Font size must be 13. Give this element the exact id "el_sub_info".
6. CRITICAL CONSTRAINT: DO NOT place any text elements where Y is between 50 and 80. This area is strictly reserved for the physical name window (Mika) — this is why slots 1-4 are all above it and slot 5 is below it.
7. Use font families: "Times New Roman" or "Arial" ONLY.
8. Default color: "#D4AF37" (Emas) for all elements since this is prepared for Embos Foil printing.
9. Align must be "center" for most formal documents.
10. Every field in each layout element is required by the schema — for fields that don't apply (e.g. "text" on a "logo" element, or "logoIcon" on a "text" element), use an empty string "" or 0 instead of omitting them.

Provide a short "description" (in Indonesian) explaining why this layout and hierarchy works best for ${mockupType}.
`;

    const response = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      max_completion_tokens: 4096,
      messages: [
        {
          role: "system",
          content: "You are an elite graphic designer AI specialized in generating precise coordinate-based JSON layouts from data the user provides. You never invent or alter factual data such as addresses or school information — you only lay it out.",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "layout_result", strict: true, schema: LAYOUT_SCHEMA },
      },
    });

    const resultText = response.choices[0]?.message?.content?.trim() || "{}";
    const parsedResult = JSON.parse(resultText);

    if (Array.isArray(parsedResult.layout_elements)) {
      parsedResult.layout_elements = sanitizeLayoutElements(parsedResult.layout_elements);
    }

    return NextResponse.json({ success: true, result: parsedResult });
  } catch (error: unknown) {
    console.error("Groq AI API generation failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error, "Gagal menghubungi AI Server."),
      },
      { status: 500 }
    );
  }
}
