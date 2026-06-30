"use client";

import React, { useState, useEffect } from "react";
import { DesignProject } from "../lib/types";
import { DEFAULT_PROJECTS } from "../lib/templates";

// Import view components
import LoginPage from "../components/LoginPage";
import DashboardPage from "../components/DashboardPage";
import CreateProjectPage from "../components/CreateProjectPage";
import AiResultPage from "../components/AiResultPage";
import EditorPage from "../components/EditorPage";
import PreviewPage from "../components/PreviewPage";
import HistoryPage from "../components/HistoryPage";

// stand-alone pure ID generator outside component
function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}`;
}

export default function Home() {
  const [userEmail, setUserEmail] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("printdesign_user_email");
    }
    return null;
  });
  const [activeView, setActiveView] = useState<
    "dashboard" | "create_project" | "ai_recommendation" | "editor" | "preview" | "history"
  >("dashboard");

  const [projects, setProjects] = useState<DesignProject[]>(() => {
    if (typeof window !== "undefined") {
      const savedProjects = localStorage.getItem("printdesign_projects");
      if (savedProjects) {
        try {
          return JSON.parse(savedProjects);
        } catch (err) {
          return DEFAULT_PROJECTS;
        }
      } else {
        localStorage.setItem("printdesign_projects", JSON.stringify(DEFAULT_PROJECTS));
        return DEFAULT_PROJECTS;
      }
    }
    return DEFAULT_PROJECTS;
  });
  const [editingProject, setEditingProject] = useState<DesignProject | null>(null);

  // Form creation fields
  const [formParams, setFormParams] = useState({
    name: "",
    category: "",
    audience: "",
    concept: "",
    productType: "Kartu Nama" as "Kartu Nama" | "Sampul Rapor",
  });

  // Active AI Recommendation
  const [aiRecommendation, setAiRecommendation] = useState<any>(null);

  // Synchronize projects to local storage when state changes
  const updatePersistence = (updatedProjectsList: DesignProject[]) => {
    setProjects(updatedProjectsList);
    localStorage.setItem("printdesign_projects", JSON.stringify(updatedProjectsList));
  };

  const handleLogin = (email: string) => {
    setUserEmail(email);
    localStorage.setItem("printdesign_user_email", email);
    setActiveView("dashboard");
  };

  const handleLogout = () => {
    setUserEmail(null);
    localStorage.removeItem("printdesign_user_email");
    setActiveView("dashboard");
  };

  const handleCreateNewProjectTrigger = (productType: "Kartu Nama" | "Sampul Rapor") => {
    setFormParams({
      name: "",
      category: "",
      audience: "",
      concept: "Minimalist & Clean",
      productType,
    });
    setActiveView("create_project");
  };

  const handleGenerateAiRecommendation = async (formPayload: any) => {
    setFormParams(formPayload);
    try {
      // Call our server-side API proxy
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formPayload.name,
          category: formPayload.category,
          audience: formPayload.audience,
          concept: formPayload.concept,
          productType: formPayload.productType,
        }),
      });

      const data = await response.json();
      if (data.success && data.result) {
        setAiRecommendation(data.result);
      } else {
        // Fallback robust matching recommendation if server returns failure
        setAiRecommendation(getFallbackRecommendation(formPayload));
      }
    } catch (e) {
      // Offline fallback
      setAiRecommendation(getFallbackRecommendation(formPayload));
    }
    setActiveView("ai_recommendation");
  };

  // Convert AI recommendations into active editor canvas default parameters
  const handleUseDesignAndLaunchEditor = () => {
    if (!aiRecommendation) return;

    const newProjId = generateId("p");
    const newProjectItem: DesignProject = {
      id: newProjId,
      name: formParams.name,
      productType: formParams.productType,
      category: formParams.category,
      concept: formParams.concept,
      audience: formParams.audience,
      backgroundColor: aiRecommendation.color_palette.primary_color || "#0F172A",
      slogan: aiRecommendation.slogan,
      description: aiRecommendation.description,
      createdAt: new Date().toISOString(),
      status: "Draft",
      palette: {
        primary: aiRecommendation.color_palette.primary_color,
        secondary: aiRecommendation.color_palette.secondary_color,
        accent: aiRecommendation.color_palette.accent_color,
        explanation: aiRecommendation.color_palette.explanation,
      },
      typography: {
        title: aiRecommendation.typography.title_font,
        body: aiRecommendation.typography.body_font,
        explanation: aiRecommendation.typography.explanation,
      },
      layoutType: aiRecommendation.layout,
      elements: buildDefaultCanvasElements(formParams.name, aiRecommendation, formParams.productType),
    };

    const updated = [newProjectItem, ...projects];
    updatePersistence(updated);
    setEditingProject(newProjectItem);
    setActiveView("editor");
  };

  const handleSaveProjectFromEditor = (updatedProject: DesignProject) => {
    const list = projects.map((p) => (p.id === updatedProject.id ? updatedProject : p));
    updatePersistence(list);
    setEditingProject(updatedProject);
    showStatusBarNotification("Proyek tersimpan");
  };

  const handleExportTrigger = (projectToExport: DesignProject) => {
    setEditingProject(projectToExport);
    setActiveView("preview");
  };

  const handleDeleteProject = (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus proyek desain ini?")) {
      const list = projects.filter((p) => p.id !== id);
      updatePersistence(list);
    }
  };

  const handleEditProjectDirectly = (project: DesignProject) => {
    setEditingProject(project);
    setActiveView("editor");
  };

  const handlePreviewDirectly = (project: DesignProject) => {
    setEditingProject(project);
    setActiveView("preview");
  };

  // Toast status bar notifications helper
  const showStatusBarNotification = (msg: string) => {
    console.log(`[Page Free System] Status: ${msg}`);
  };

  // Pre-compiled design element generator
  const buildDefaultCanvasElements = (
    name: string,
    reco: any,
    productType: "Kartu Nama" | "Sampul Rapor"
  ) => {
    const pm = reco.color_palette.primary_color;
    const sc = reco.color_palette.secondary_color;
    const ac = reco.color_palette.accent_color;
    const titleFont = reco.typography.title_font;
    const bodyFont = reco.typography.body_font;

    if (productType === "Kartu Nama") {
      return [
        {
          id: "deco_strip",
          type: "shape" as const,
          shapeType: "rectangle" as const,
          x: 0,
          y: 86,
          width: 100,
          height: 14,
          color: sc,
          zIndex: 1,
        },
        {
          id: "logo_stamp",
          type: "logo" as const,
          logoIcon: "shield",
          x: 7,
          y: 18,
          width: 8,
          height: 12,
          color: ac,
          zIndex: 2,
        },
        {
          id: "comp_title",
          type: "text" as const,
          text: name.toUpperCase(),
          x: 18,
          y: 18,
          width: 70,
          height: 12,
          fontSize: 22,
          fontFamily: titleFont,
          fontWeight: "bold" as const,
          color: "#FFFFFF",
          align: "left" as const,
          zIndex: 3,
        },
        {
          id: "slogan_sub",
          type: "text" as const,
          text: reco.slogan,
          x: 18,
          y: 31,
          width: 70,
          height: 6,
          fontSize: 11,
          fontFamily: bodyFont,
          fontWeight: "normal" as const,
          color: "#94A3B8",
          align: "left" as const,
          zIndex: 4,
        },
        {
          id: "person_name",
          type: "text" as const,
          text: "Anam Jumantono",
          x: 7,
          y: 52,
          width: 80,
          height: 8,
          fontSize: 18,
          fontFamily: titleFont,
          fontWeight: "bold" as const,
          color: "#FFFFFF",
          align: "left" as const,
          zIndex: 5,
        },
        {
          id: "person_role",
          type: "text" as const,
          text: "Direct Manager of Percetakan",
          x: 7,
          y: 61,
          width: 80,
          height: 5,
          fontSize: 11,
          fontFamily: bodyFont,
          fontWeight: "normal" as const,
          color: ac,
          align: "left" as const,
          zIndex: 6,
        },
        {
          id: "footer_contact",
          type: "text" as const,
          text: "✉ anamjumantono4@gmail.com  |  ☏ +62 811-9213  |  🌐 printai.id",
          x: 7,
          y: 74,
          width: 86,
          height: 5,
          fontSize: 9,
          fontFamily: bodyFont,
          fontWeight: "normal" as const,
          color: "#CBD5E1",
          align: "left" as const,
          zIndex: 7,
        },
      ];
    } else {
      // Sampul Rapor A4 structure
      return [
        {
          id: "border_frame_1",
          type: "shape" as const,
          shapeType: "rectangle" as const,
          x: 5,
          y: 4,
          width: 90,
          height: 92,
          color: ac,
          zIndex: 1,
        },
        {
          id: "border_frame_2",
          type: "shape" as const,
          shapeType: "rectangle" as const,
          x: 6,
          y: 5,
          width: 88,
          height: 90,
          color: pm,
          zIndex: 2,
        },
        {
          id: "logo_crest",
          type: "logo" as const,
          logoIcon: "mortarboard",
          x: 45,
          y: 12,
          width: 10,
          height: 10,
          color: ac,
          zIndex: 3,
        },
        {
          id: "main_rapor_header",
          type: "text" as const,
          text: "DOKUMEN HASIL BELAJAR",
          x: 10,
          y: 25,
          width: 80,
          height: 6,
          fontSize: 22,
          fontFamily: titleFont,
          fontWeight: "bold" as const,
          color: ac,
          align: "center" as const,
          zIndex: 4,
        },
        {
          id: "school_name_desc",
          type: "text" as const,
          text: name.toUpperCase(),
          x: 10,
          y: 31,
          width: 80,
          height: 6,
          fontSize: 18,
          fontFamily: titleFont,
          fontWeight: "bold" as const,
          color: "#FFFFFF",
          align: "center" as const,
          zIndex: 5,
        },
        {
          id: "divider_line",
          type: "shape" as const,
          shapeType: "line" as const,
          x: 35,
          y: 37,
          width: 30,
          height: 2,
          color: ac,
          zIndex: 6,
        },
        {
          id: "student_outer_box",
          type: "shape" as const,
          shapeType: "rectangle" as const,
          x: 15,
          y: 47,
          width: 70,
          height: 33,
          color: sc,
          zIndex: 7,
        },
        {
          id: "box_label",
          type: "text" as const,
          text: "IDENTITAS PESERTA DIDIK",
          x: 20,
          y: 51,
          width: 60,
          height: 4,
          fontSize: 13,
          fontFamily: bodyFont,
          fontWeight: "bold" as const,
          color: ac,
          align: "center" as const,
          zIndex: 8,
        },
        {
          id: "student_n",
          type: "text" as const,
          text: "NAMA : AMELIA REGINA CHANDRA",
          x: 22,
          y: 59,
          width: 56,
          height: 4,
          fontSize: 12,
          fontFamily: bodyFont,
          fontWeight: "bold" as const,
          color: "#FFFFFF",
          align: "left" as const,
          zIndex: 9,
        },
        {
          id: "student_id",
          type: "text" as const,
          text: "NISN : 009212003",
          x: 22,
          y: 65,
          width: 56,
          height: 4,
          fontSize: 12,
          fontFamily: bodyFont,
          fontWeight: "bold" as const,
          color: "#FFFFFF",
          align: "left" as const,
          zIndex: 10,
        },
        {
          id: "student_grade",
          type: "text" as const,
          text: "KELAS : XI REKAYASA PERANGKAT LUNAK",
          x: 22,
          y: 71,
          width: 56,
          height: 4,
          fontSize: 12,
          fontFamily: bodyFont,
          fontWeight: "bold" as const,
          color: "#FFFFFF",
          align: "left" as const,
          zIndex: 11,
        },
        {
          id: "year_tag",
          type: "text" as const,
          text: reco.slogan.toUpperCase(),
          x: 10,
          y: 86,
          width: 80,
          height: 4,
          fontSize: 12,
          fontFamily: bodyFont,
          fontWeight: "normal" as const,
          color: "#94A3B8",
          align: "center" as const,
          zIndex: 12,
        },
      ];
    }
  };

  // Fast aesthetic fallback builder if API keys are missing
  const getFallbackRecommendation = (formPayload: any) => {
    const isCardProduct = formPayload.productType === "Kartu Nama";
    return {
      color_palette: {
        primary_color: isCardProduct ? "#0F172A" : "#1E3A8A",
        secondary_color: isCardProduct ? "#1E293B" : "#1E3B8B",
        accent_color: "#F59E0B",
        explanation: "Konsep perpaduan modern premium biru malam dengan percikan aksen emas memancarkan kemantapan wewenang.",
      },
      typography: {
        title_font: "Space Grotesk",
        body_font: "Inter",
        explanation: "Display sans moderen berpadu seimbang dengan body text yang nyaman dibaca.",
      },
      layout: "Corporate",
      slogan: isCardProduct
        ? "Terbaik, Terpercaya, Selamanya."
        : "Cerdas, Berprestasi, Berkarakter Unggul.",
      description: "Desain solid yang fokus pada kerapian margin, visibilitas tinggi, dan proporsi seimbang yang pas untuk kepentingan pencetakan massal.",
    };
  };

  // Login page fallback gate
  if (!userEmail) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <>
      {activeView === "dashboard" && (
        <DashboardPage
          userEmail={userEmail}
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
          onGenerateAi={handleGenerateAiRecommendation}
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
