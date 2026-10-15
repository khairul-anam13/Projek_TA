"use client";

import { useRouter } from "next/navigation";
import { useAppContext } from "@/lib/appContext";
import { useDeleteProject } from "@/lib/useDeleteProject";
import HistoryPage from "@/components/HistoryPage";
import { DesignProject } from "@/lib/types";

export default function History() {
  const router = useRouter();
  const { projects, projectsLoading } = useAppContext();
  const { requestDelete, dialog } = useDeleteProject();

  return (
    <>
      <HistoryPage
        projects={projects}
        loading={projectsLoading}
        onBack={() => router.push("/dashboard")}
        onEditProject={(project: DesignProject) => router.push(`/editor/${project.id}`)}
        onPreviewProject={(project: DesignProject) => router.push(`/preview/${project.id}`)}
        onDeleteProject={requestDelete}
      />
      {dialog}
    </>
  );
}
