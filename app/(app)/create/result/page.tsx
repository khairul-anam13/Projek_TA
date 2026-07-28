"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/lib/appContext";
import { generateId } from "@/lib/utils";
import AiResultPage from "@/components/AiResultPage";
import { DesignProject } from "@/lib/types";

const AI_RESULT_STORAGE_KEY = "pagefree:ai_recommendation";
const FORM_DRAFT_STORAGE_KEY = "pagefree:create_form_draft";

interface StoredAiResult {
  formData: any;
  aiRecommendation: any;
}

export default function CreateResult() {
  const router = useRouter();
  const { setProjects } = useAppContext();

  // Dibaca lewat lazy initializer (bukan useEffect) karena ini murni baca
  // sinkron sekali di awal mount, bukan sinkronisasi dengan sistem eksternal
  // yang berubah. Efek di bawah hanya menangani navigasi redirect-nya.
  const [stored] = useState<StoredAiResult | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = sessionStorage.getItem(AI_RESULT_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!stored) {
      router.replace("/create");
    }
  }, [stored, router]);

  const handleBack = () => {
    // Simpan isian form supaya halaman /create tidak kosong saat kembali.
    if (stored) {
      sessionStorage.setItem(FORM_DRAFT_STORAGE_KEY, JSON.stringify(stored.formData));
    }
    router.push("/create");
  };

  const handleUseDesign = async (modifiedElements?: any[]) => {
    if (!stored) return;
    const { formData, aiRecommendation } = stored;

    const newProjId = generateId("p");
    const newProjectItem: DesignProject = {
      id: newProjId,
      name: formData.dynamicData?.namaSekolah || "Proyek Baru",
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
      layoutType: "AI Layout",
      slogan: "",
      description: aiRecommendation.description || "",
      elements: modifiedElements || aiRecommendation.layout_elements || [],
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
    sessionStorage.removeItem(AI_RESULT_STORAGE_KEY);
    router.push(`/editor/${savedProject.id}`);
  };

  // Sedang redirect ke /create karena sessionStorage kosong/corrupt.
  if (!stored) {
    return null;
  }

  return (
    <AiResultPage
      formData={stored.formData}
      aiRecommendation={stored.aiRecommendation}
      onBack={handleBack}
      onUseDesign={handleUseDesign}
    />
  );
}
