"use client";

import { useRouter } from "next/navigation";
import { useAppContext } from "@/lib/appContext";
import HistoryPage from "@/components/HistoryPage";
import { DesignProject } from "@/lib/types";

export default function History() {
  const router = useRouter();
  const { projects, setProjects, refetchProjects } = useAppContext();

  const handleDeleteProject = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus proyek desain ini?")) return;

    setProjects((prev) => prev.filter((p) => p.id !== id));

    try {
      await fetch(`/api/projects/${id}`, { method: "DELETE" });
    } catch (e) {
      console.error("[handleDeleteProject] Gagal menghapus:", e);
      refetchProjects();
    }
  };

  return (
    <HistoryPage
      projects={projects}
      onBack={() => router.push("/dashboard")}
      onEditProject={(project: DesignProject) => router.push(`/editor/${project.id}`)}
      onPreviewProject={(project: DesignProject) => router.push(`/preview/${project.id}`)}
      onDeleteProject={handleDeleteProject}
    />
  );
}
