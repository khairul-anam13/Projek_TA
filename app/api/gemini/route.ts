import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

export async function POST(req: NextRequest) {
  try {
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
Here is the data provided by the user:
- Judul Rapor: ${judulRapor}
- Nama Sekolah: ${namaSekolah}
- Alamat Sekolah: ${alamatSekolah}
- Sub Informasi: ${subInformasi}

The printing size is roughly an A4/F4 aspect ratio. The coordinate system uses 0-100 for X and Y axes (0,0 is top left, 100,100 is bottom right).
Generate an array of layout elements that best positions this information on the page. 

RULES & CONSTRAINTS:
1. The title (Judul Rapor) should be near the top (Y: 10-25). Font size must be 43.
2. The school name (Nama Sekolah) should be highly prominent and centered (Y: 35-45). Font size must be 33.
3. The logo should be placed symmetrically, typically between Title and School Name (Y: 25-33). Logo icon should be "shield" (for Garuda) or "building" (for Kemenag). Type must be "logo".
4. Alamat and Sub Informasi should be near the bottom (Y: 82-90). Font size must be 23 for Alamat and 13 for Sub Informasi.
5. CRITICAL CONSTRAINT: DO NOT place any text elements where Y is between 50 and 80. This area is strictly reserved for the physical name window (Mika).
6. Use font families: "Times New Roman" or "Arial" ONLY.
7. Default color: "#D4AF37" (Emas) for all elements since this is prepared for Embos Foil printing.
8. Align must be "center" for most formal documents.

Also, provide a short "description" (in Indonesian) explaining why this layout and hierarchy works best for ${mockupType}.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an elite graphic designer AI specialized in generating precise coordinate-based JSON layouts for book/report covers.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING, description: "Detailed concept explanation in Indonesian" },
            layout_elements: {
              type: Type.ARRAY,
              description: "Array of canvas elements",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "Unique ID, e.g. el_title" },
                  type: { type: Type.STRING, description: "Either 'text' or 'logo'" },
                  text: { type: Type.STRING, description: "The text content (if type is text)" },
                  logoIcon: { type: Type.STRING, description: "The icon name (if type is logo), e.g. 'shield' or 'building'" },
                  x: { type: Type.NUMBER, description: "X coordinate (0-100)" },
                  y: { type: Type.NUMBER, description: "Y coordinate (0-100)" },
                  width: { type: Type.NUMBER, description: "Width percentage (10-100)" },
                  height: { type: Type.NUMBER, description: "Height percentage (5-20)" },
                  fontSize: { type: Type.NUMBER, description: "Font size for text (10-40)" },
                  fontWeight: { type: Type.STRING, description: "'normal' or 'bold'" },
                  align: { type: Type.STRING, description: "'left', 'center', or 'right'" },
                  fontFamily: { type: Type.STRING, description: "'Times New Roman' or 'Arial'" },
                  color: { type: Type.STRING, description: "Always '#D4AF37'" },
                  zIndex: { type: Type.NUMBER, description: "Stacking order" },
                },
                required: ["id", "type", "x", "y", "width", "height", "color", "zIndex"]
              }
            }
          },
          required: ["description", "layout_elements"],
        },
      },
    });

    const resultText = response.text?.trim() || "{}";
    const parsedResult = JSON.parse(resultText);

    return NextResponse.json({ success: true, result: parsedResult });
  } catch (error: any) {
    console.error("Gemini AI API generation failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Gagal menghubungi AI Server.",
      },
      { status: 500 }
    );
  }
}
