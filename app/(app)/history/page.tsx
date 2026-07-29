"use client";

import { useRouter } from "next/navigation";
import { useAppContext } from "@/lib/appContext";
import HistoryPage from "@/components/HistoryPage";
import { DesignProject } from "@/lib/types";

export default function History() {
  const router = useRouter();
  const { projects, deleteProject } = useAppContext();

  return (
    <HistoryPage
      projects={projects}
      onBack={() => router.push("/dashboard")}
      onEditProject={(project: DesignProject) => router.push(`/editor/${project.id}`)}
      onPreviewProject={(project: DesignProject) => router.push(`/preview/${project.id}`)}
      onDeleteProject={deleteProject}
    />
  );
}
