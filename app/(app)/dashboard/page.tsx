"use client";

import { useRouter } from "next/navigation";
import { useAppContext } from "@/lib/appContext";
import { createClient } from "@/lib/supabase/client";
import DashboardPage from "@/components/DashboardPage";
import { DesignProject } from "@/lib/types";

export default function Dashboard() {
  const router = useRouter();
  const supabase = createClient();
  const { user, projects, setProjects, refetchProjects } = useAppContext();

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const userEmail = user?.email ?? "";
  const userName = user?.user_metadata?.full_name as string | undefined;
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  return (
    <DashboardPage
      userEmail={userEmail}
      userName={userName}
      avatarUrl={avatarUrl}
      projects={projects}
      onCreateProject={() => router.push("/create")}
      onEditProject={(project: DesignProject) => router.push(`/editor/${project.id}`)}
      onPreviewProject={(project: DesignProject) => router.push(`/preview/${project.id}`)}
      onDeleteProject={handleDeleteProject}
      onViewHistory={() => router.push("/history")}
      onLogout={handleLogout}
    />
  );
}
