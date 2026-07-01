"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DesignProject, ProductType } from "../lib/types";
import { DEFAULT_PROJECTS } from "../lib/templates";
import { getMockupTemplate } from "../lib/mockupTemplates";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

// Import view components
import LoginPage from "../components/LoginPage";
import DashboardPage from "../components/DashboardPage";
import CreateProjectPage from "../components/CreateProjectPage";
import AiResultPage from "../components/AiResultPage";
import EditorPage from "../components/EditorPage";
import PreviewPage from "../components/PreviewPage";
import HistoryPage from "../components/HistoryPage";

// Stand-alone pure ID generator outside component
function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}`;
}

export default function Home() {
  const supabase = createClient();

  // ── Auth State ────────────────────────────────────────────────────────────
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ── View & Navigation State ───────────────────────────────────────────────
  const [activeView, setActiveView] = useState<
    "dashboard" | "create_project" | "ai_recommendation" | "editor" | "preview" | "history"
  >("dashboard");

  // ── Project State ─────────────────────────────────────────────────────────
  const [projects, setProjects] = useState<DesignProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [editingProject, setEditingProject] = useState<DesignProject | null>(null);

  // ── Form & AI State ───────────────────────────────────────────────────────
  const [formParams, setFormParams] = useState<any>({
    mockupType: "Rapor SD",
    dynamicData: {
      judulRapor: "RAPOR PESERTA DIDIK",
      namaSekolah: "",
      alamatSekolah: "",
      subInformasi: ""
    }
  });
  const [aiRecommendation, setAiRecommendation] = useState<any>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // AUTH: Listen to session changes
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Get the initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setAuthLoading(false);
    });

    // Subscribe to auth state changes (login, logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setProjects([]);
        setActiveView("dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // DATA: Fetch projects from Supabase when user logs in
  // ─────────────────────────────────────────────────────────────────────────
  const fetchProjects = useCallback(async () => {
    if (!user) return;
    setProjectsLoading(true);
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects ?? []);
      }
    } catch (e) {
      console.error("[fetchProjects] Gagal mengambil proyek:", e);
    } finally {
      setProjectsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user, fetchProjects]);

  // ─────────────────────────────────────────────────────────────────────────
  // AUTH HANDLERS
  // ─────────────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProjects([]);
    setActiveView("dashboard");
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PROJECT HANDLERS (CRUD via API)
  // ─────────────────────────────────────────────────────────────────────────
  const handleCreateNewProjectTrigger = (productType: ProductType) => {
    setFormParams({
      name: "",
      category: "",
      audience: "",
      concept: "Minimalist & Clean",
      productType,
    });
    setActiveView("create_project");
  };

  const handleGenerateAiRecommendation = async (formData: any) => {
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (data.success) {
        setAiRecommendation(data.result);
      } else {
        console.warn("AI generation error, using fallback.", data.error);
        setAiRecommendation(getFallbackRecommendation(formData));
      }
    } catch (err) {
      console.warn("AI network error, using fallback.", err);
      setAiRecommendation(getFallbackRecommendation(formData));
    }
    setActiveView("ai_recommendation");
  };

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
      backgroundColor: "#111111", // Default color 
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

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProjectItem),
      });

      if (res.ok) {
        const { project } = await res.json();
        setProjects((prev) => [project, ...prev]);
        setEditingProject(project);
      } else {
        setProjects((prev) => [newProjectItem, ...prev]);
        setEditingProject(newProjectItem);
      }
    } catch {
      setProjects((prev) => [newProjectItem, ...prev]);
      setEditingProject(newProjectItem);
    }
    setActiveView("editor");
  };

  const handleUseDesignAndLaunchEditor = async () => {
    if (!aiRecommendation) return;

    const newProjId = generateId("p");
    const newProjectItem: DesignProject = {
      id: newProjId,
      name: formParams.dynamicData?.namaSekolah || "Proyek Baru",
      productType: "Sampul Rapor",
      category: "Sekolah",
      concept: "Formal",
      audience: "Siswa",
      backgroundColor: "#111111", // Default color
      printMethod: "Embos Foil",
      printSize: "Size A (23x34cm)",
      mockupType: formParams.mockupType,
      dynamicData: formParams.dynamicData,
      createdAt: new Date().toISOString(),
      status: "Draft",
      layoutType: "AI Layout",
      slogan: "",
      description: aiRecommendation.description || "",
      elements: aiRecommendation.layout_elements || [],
    };

    // Save to database
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProjectItem),
      });

      if (res.ok) {
        const { project } = await res.json();
        setProjects((prev) => [project, ...prev]);
        setEditingProject(project);
      } else {
        // Optimistic update fallback
        setProjects((prev) => [newProjectItem, ...prev]);
        setEditingProject(newProjectItem);
      }
    } catch {
      setProjects((prev) => [newProjectItem, ...prev]);
      setEditingProject(newProjectItem);
    }

    setActiveView("editor");
  };

  const handleSaveProjectFromEditor = async (updatedProject: DesignProject) => {
    try {
      const res = await fetch(`/api/projects/${updatedProject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedProject),
      });

      if (res.ok) {
        const { project } = await res.json();
        setProjects((prev) => prev.map((p) => (p.id === project.id ? project : p)));
        setEditingProject(project);
      } else {
        // Optimistic update
        setProjects((prev) => prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
        setEditingProject(updatedProject);
      }
    } catch {
      setProjects((prev) => prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
      setEditingProject(updatedProject);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus proyek desain ini?")) return;

    // Optimistic update: langsung hapus dari state
    setProjects((prev) => prev.filter((p) => p.id !== id));

    try {
      await fetch(`/api/projects/${id}`, { method: "DELETE" });
    } catch (e) {
      // Jika gagal, re-fetch untuk restore state
      console.error("[handleDeleteProject] Gagal menghapus:", e);
      fetchProjects();
    }
  };

  const handleExportTrigger = (projectToExport: DesignProject) => {
    setEditingProject(projectToExport);
    setActiveView("preview");
  };

  const handleEditProjectDirectly = (project: DesignProject) => {
    setEditingProject(project);
    setActiveView("editor");
  };

  const handlePreviewDirectly = (project: DesignProject) => {
    setEditingProject(project);
    setActiveView("preview");
  };

  // ─────────────────────────────────────────────────────────────────────────
  // CANVAS BUILDERS
  // ─────────────────────────────────────────────────────────────────────────
  const buildDefaultCanvasElements = (
    name: string,
    reco: any,
    productType: ProductType
  ) => {
    const pm = reco.color_palette.primary_color;
    const sc = reco.color_palette.secondary_color;
    const ac = reco.color_palette.accent_color;
    const titleFont = reco.typography.title_font;
    const bodyFont = reco.typography.body_font;

    // Hanya Sampul Rapor yang tersedia saat ini
    return [
      { id: "border_frame_1", type: "shape" as const, shapeType: "rectangle" as const, x: 5, y: 4, width: 90, height: 92, color: ac, zIndex: 1 },
      { id: "border_frame_2", type: "shape" as const, shapeType: "rectangle" as const, x: 6, y: 5, width: 88, height: 90, color: pm, zIndex: 2 },
      { id: "logo_crest", type: "logo" as const, logoIcon: "mortarboard", x: 45, y: 12, width: 10, height: 10, color: ac, zIndex: 3 },
      { id: "main_rapor_header", type: "text" as const, text: "DOKUMEN HASIL BELAJAR", x: 10, y: 25, width: 80, height: 6, fontSize: 22, fontFamily: titleFont, fontWeight: "bold" as const, color: ac, align: "center" as const, zIndex: 4 },
      { id: "school_name_desc", type: "text" as const, text: name.toUpperCase(), x: 10, y: 31, width: 80, height: 6, fontSize: 18, fontFamily: titleFont, fontWeight: "bold" as const, color: "#FFFFFF", align: "center" as const, zIndex: 5 },
      { id: "divider_line", type: "shape" as const, shapeType: "line" as const, x: 35, y: 37, width: 30, height: 2, color: ac, zIndex: 6 },
      { id: "student_outer_box", type: "shape" as const, shapeType: "rectangle" as const, x: 15, y: 47, width: 70, height: 33, color: sc, zIndex: 7 },
      { id: "box_label", type: "text" as const, text: "IDENTITAS PESERTA DIDIK", x: 20, y: 51, width: 60, height: 4, fontSize: 13, fontFamily: bodyFont, fontWeight: "bold" as const, color: ac, align: "center" as const, zIndex: 8 },
      { id: "student_n", type: "text" as const, text: "NAMA : ___________________", x: 22, y: 59, width: 56, height: 4, fontSize: 12, fontFamily: bodyFont, fontWeight: "bold" as const, color: "#FFFFFF", align: "left" as const, zIndex: 9 },
      { id: "student_id", type: "text" as const, text: "NISN : ___________________", x: 22, y: 65, width: 56, height: 4, fontSize: 12, fontFamily: bodyFont, fontWeight: "bold" as const, color: "#FFFFFF", align: "left" as const, zIndex: 10 },
      { id: "student_grade", type: "text" as const, text: "KELAS : ___________________", x: 22, y: 71, width: 56, height: 4, fontSize: 12, fontFamily: bodyFont, fontWeight: "bold" as const, color: "#FFFFFF", align: "left" as const, zIndex: 11 },
      { id: "year_tag", type: "text" as const, text: reco.slogan.toUpperCase(), x: 10, y: 86, width: 80, height: 4, fontSize: 12, fontFamily: bodyFont, fontWeight: "normal" as const, color: "#94A3B8", align: "center" as const, zIndex: 12 },
    ];
  };

  const getFallbackRecommendation = (_formPayload: any) => {
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
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  // Loading screen saat cek sesi awal
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm text-slate-400 font-mono">Memverifikasi sesi...</p>
        </div>
      </div>
    );
  }

  // Tampilkan halaman login jika belum terautentikasi
  if (!user) {
    return <LoginPage />;
  }

  const userEmail = user.email ?? "";
  const userName = user.user_metadata?.full_name as string | undefined;
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;

  return (
    <>
      {activeView === "dashboard" && (
        <DashboardPage
          userEmail={userEmail}
          userName={userName}
          avatarUrl={avatarUrl}
          projects={projects}
          onCreateProject={handleCreateNewProjectTrigger}
          onEditProject={handleEditProjectDirectly}
          onPreviewProject={handlePreviewDirectly}
          onDeleteProject={handleDeleteProject}
          onViewHistory={() => setActiveView("history")}
          onLogout={handleLogout}
        />
      )}

      {activeView === "create_project" && (
        <CreateProjectPage
          initialProductType={formParams.productType}
          onBack={() => setActiveView("dashboard")}
          onSkipAi={(data) => {
            setFormParams(data);
            handleSkipAi(data);
          }}
          onGenerateAi={(data) => {
            setFormParams(data);
            handleGenerateAiRecommendation(data);
          }}
        />
      )}

      {activeView === "ai_recommendation" && aiRecommendation && (
        <AiResultPage
          formData={formParams}
          aiRecommendation={aiRecommendation}
          onBack={() => setActiveView("create_project")}
          onUseDesign={handleUseDesignAndLaunchEditor}
        />
      )}

      {activeView === "editor" && editingProject && (
        <EditorPage
          project={editingProject}
          onBackToDashboard={() => setActiveView("dashboard")}
          onSaveProject={handleSaveProjectFromEditor}
          onExport={handleExportTrigger}
        />
      )}

      {activeView === "preview" && editingProject && (
        <PreviewPage project={editingProject} onBackToEditor={() => setActiveView("editor")} />
      )}

      {activeView === "history" && (
        <HistoryPage
          projects={projects}
          onBack={() => setActiveView("dashboard")}
          onEditProject={handleEditProjectDirectly}
          onPreviewProject={handlePreviewDirectly}
          onDeleteProject={handleDeleteProject}
        />
      )}
    </>
  );
}
