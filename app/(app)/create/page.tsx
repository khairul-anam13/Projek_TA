"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/lib/appContext";
import { generateId } from "@/lib/utils";
import { getMockupTemplate } from "@/lib/mockupTemplates";
import CreateProjectPage from "@/components/CreateProjectPage";
import { DesignProject } from "@/lib/types";

const AI_RESULT_STORAGE_KEY = "pagefree:ai_recommendation";
const FORM_DRAFT_STORAGE_KEY = "pagefree:create_form_draft";

/** Rekomendasi cadangan (dipakai murni jika Groq API gagal/error jaringan). */
function getFallbackRecommendation(_formPayload: any) {
  return {
    color_palette: {
      primary_color: "#1E3A8A",
      secondary_color: "#1E3B8B",
      accent_color: "#F59E0B",
      explanation: "Konsep warna biru institusional dengan aksen emas yang hangat.",
    },
    typography: {
      title_font: "Space Grotesk",
      body_font: "Inter",
      explanation: "Display sans modern berpadu seimbang dengan body text yang nyaman dibaca.",
    },
    layout: "Corporate",
    slogan: "Cerdas, Berprestasi, Berkarakter Unggul.",
    description: "Desain solid yang fokus pada kerapian margin, visibilitas tinggi, dan proporsi seimbang yang pas untuk kepentingan pencetakan massal.",
  };
}

export default function Create() {
  const router = useRouter();
  const { setProjects } = useAppContext();

  // Jika kembali dari halaman hasil AI, isi ulang form dengan draft yang ditinggalkan.
  // Dibaca lewat lazy initializer (bukan useEffect) karena ini murni baca sinkron
  // sekali di awal mount, bukan sinkronisasi dengan sistem eksternal yang berubah.
  const [initialFormData] = useState<any>(() => {
    if (typeof window === "undefined") return undefined;
    try {
      const raw = sessionStorage.getItem(FORM_DRAFT_STORAGE_KEY);
      if (raw) {
        sessionStorage.removeItem(FORM_DRAFT_STORAGE_KEY);
        return JSON.parse(raw);
      }
    } catch {
      sessionStorage.removeItem(FORM_DRAFT_STORAGE_KEY);
    }
    return undefined;
  });

  const handleSkipAi = async (formData: any) => {
    const newProjId = generateId("p");
    const elements = getMockupTemplate(formData.mockupType, formData.dynamicData);

    const newProjectItem: DesignProject = {
      id: newProjId,
      name: formData.dynamicData.namaSekolah,
      productType: "Sampul Rapor",
      category: "Sekolah",
      concept: "Formal",
      audience: "Siswa",
      backgroundColor: "#111111",
      printMethod: "Embos Foil",
      printSize: "Size A (23x34cm)",
      mockupType: formData.mockupType,
      dynamicData: formData.dynamicData,
      createdAt: new Date().toISOString(),
      status: "Draft",
      layoutType: "Modern Center",
      slogan: "",
      description: "",
      elements,
    };

    let savedProject = newProjectItem;
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProjectItem),
      });

      if (res.ok) {
        const { project } = await res.json();
        savedProject = project;
      }
    } catch {
      // Fallback ke item lokal di bawah
    }
    setProjects((prev) => [savedProject, ...prev]);
    router.push(`/editor/${savedProject.id}`);
  };

  const handleGenerateAi = async (formData: any) => {
    let aiRecommendation: any;
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (data.success) {
        aiRecommendation = data.result;
      } else {
        console.warn("AI generation error, using fallback.", data.error);
        aiRecommendation = getFallbackRecommendation(formData);
      }
    } catch (err) {
      console.warn("AI network error, using fallback.", err);
      aiRecommendation = getFallbackRecommendation(formData);
    }

    sessionStorage.setItem(AI_RESULT_STORAGE_KEY, JSON.stringify({ formData, aiRecommendation }));
    router.push("/create/result");
  };

  return (
    <CreateProjectPage
      initialProductType="Sampul Rapor"
      initialFormData={initialFormData}
      onBack={() => router.push("/dashboard")}
      onSkipAi={handleSkipAi}
      onGenerateAi={handleGenerateAi}
    />
  );
}
