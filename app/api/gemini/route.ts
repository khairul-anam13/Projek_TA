import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

// Initialize Gemini Client with standard headers
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
    const { name, category, audience, concept, productType } = await req.json();

    if (!name || !category) {
      return NextResponse.json(
        { error: "Nama Usaha and Kategori Usaha are required fields." },
        { status: 400 }
      );
    }

    const prompt = `You are an expert brand designer and design AI assistant.
Generate a personalized visual design recommendation for:
- Business/Brand Name (Nama Usaha): ${name}
- Business Category (Kategori Usaha): ${category}
- Target Audience (Target Konsumen): ${audience || "General Public"}
- Preferred Concept (Konsep Desain): ${concept || "Modern & Professional"}
- Product Type (Jenis Produk): ${productType || "Kartu Nama"}

Suggest a gorgeous brand design profile consisting of:
1. Color palette (primary, secondary, and accent hex codes) matching a professional ${productType} look.
2. Font pairings from these certified fonts:
   - Display/Title Font: Choose from ["Space Grotesk", "Outfit", "Inter", "Playfair Display", "JetBrains Mono"]
   - Body/Subtitle Font: Choose from ["Inter", "JetBrains Mono"]
3. Best-suited Layout choice (must be exactly one of: "Modern Center", "Minimalist", "Corporate", "Creative").
4. A catchy, high-impact slogan (Slogan) for this brand in Indonesian (max 6 words).
5. A comprehensive explanation (Description) in Indonesian explaining how this specific aesthetic fits their brand values, business category, and target audience.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an elite, highly professional graphic designer AI specialized in card printing and book/report covers.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            color_palette: {
              type: Type.OBJECT,
              properties: {
                primary_color: { type: Type.STRING, description: "HEX color code (e.g. #0f4c81)" },
                secondary_color: { type: Type.STRING, description: "HEX color code (e.g. #f5a623)" },
                accent_color: { type: Type.STRING, description: "HEX color code (e.g. #4a90e2)" },
                explanation: { type: Type.STRING, description: "Brief explanation of color choices in Indonesian" },
              },
              required: ["primary_color", "secondary_color", "accent_color", "explanation"],
            },
            typography: {
              type: Type.OBJECT,
              properties: {
                title_font: { type: Type.STRING, description: "Title font family recommendation" },
                body_font: { type: Type.STRING, description: "Body font family recommendation" },
                explanation: { type: Type.STRING, description: "Brief explanation of typography pairing in Indonesian" },
              },
              required: ["title_font", "body_font", "explanation"],
            },
            layout: { type: Type.STRING, description: "Must be exactly: 'Modern Center', 'Minimalist', 'Corporate', or 'Creative'" },
            slogan: { type: Type.STRING, description: "Beautifully relevant business slogan in Indonesian" },
            description: { type: Type.STRING, description: "Detailed concept explanation in Indonesian" },
          },
          required: ["color_palette", "typography", "layout", "slogan", "description"],
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
