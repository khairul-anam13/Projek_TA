"use client";

import { useRouter } from "next/navigation";
import { useAppContext } from "@/lib/appContext";
import { createClient } from "@/lib/supabase/client";
import { useDeleteProject } from "@/lib/useDeleteProject";
import DashboardPage from "@/components/DashboardPage";
import { DesignProject } from "@/lib/types";

export default function Dashboard() {
  const router = useRouter();
  const supabase = createClient();
  const { user, projects, projectsLoading } = useAppContext();
  const { requestDelete, dialog } = useDeleteProject();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const userEmail = user?.email ?? "";
  const userName = user?.user_metadata?.full_name as string | undefined;
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  return (
    <>
      <DashboardPage
        userEmail={userEmail}
        userName={userName}
        avatarUrl={avatarUrl}
        projects={projects}
        loading={projectsLoading}
        onCreateProject={() => router.push("/create")}
        onEditProject={(project: DesignProject) => router.push(`/editor/${project.id}`)}
        onPreviewProject={(project: DesignProject) => router.push(`/preview/${project.id}`)}
        onDeleteProject={requestDelete}
        onViewHistory={() => router.push("/history")}
        onBatch={() => router.push("/batch")}
        onLogout={handleLogout}
      />
      {dialog}
    </>
  );
}
