"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppContext } from "@/lib/appContext";
import EditorPage from "@/components/EditorPage";
import { DesignProject } from "@/lib/types";

export default function Editor() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { projects, projectsLoading, setProjects } = useAppContext();

  const [fetchedProject, setFetchedProject] = useState<DesignProject | null>(null);
  const [notFound, setNotFound] = useState(false);
  const hasFetchedRef = useRef(false);

  const projectFromContext = projects.find((p) => p.id === params.id) ?? null;
  const project = projectFromContext ?? fetchedProject;
  const isLoading = projectsLoading || (!project && !notFound);

  useEffect(() => {
    if (projectsLoading) return; // daftar project di context masih dimuat, tunggu
    if (projectFromContext) return; // sudah ketemu di context, tidak perlu fetch
    if (hasFetchedRef.current) return; // sudah pernah dicoba
    hasFetchedRef.current = true;

    fetch(`/api/projects/${params.id}`)
      .then(async (res) => {
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const { project } = await res.json();
        setFetchedProject(project);
      })
      .catch(() => setNotFound(true));
  }, [projectsLoading, projectFromContext, params.id]);

  const saveProject = async (
    updatedProject: DesignProject
  ): Promise<{ project: DesignProject; persisted: boolean }> => {
    try {
      const res = await fetch(`/api/projects/${updatedProject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedProject),
      });

      if (res.ok) {
        const { project: saved } = await res.json();
        setProjects((prev) =>
          prev.some((p) => p.id === saved.id) ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev]
        );
        setFetchedProject(saved);
        return { project: saved, persisted: true };
      }
    } catch {
      // Fallback ke optimistic update di bawah
    }
    setProjects((prev) =>
      prev.some((p) => p.id === updatedProject.id)
        ? prev.map((p) => (p.id === updatedProject.id ? updatedProject : p))
        : [updatedProject, ...prev]
    );
    setFetchedProject(updatedProject);
    return { project: updatedProject, persisted: false };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-400 font-mono">Memuat proyek...</p>
      </div>
    );
  }

  if (!project || notFound) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-stone-500 mb-4">Proyek tidak ditemukan.</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <EditorPage
      project={project}
      onBackToDashboard={() => router.push("/dashboard")}
      onSaveProject={saveProject}
      onExport={async (exportProject) => {
        // Simpan dulu perubahan terbaru sebelum ke halaman preview, supaya
        // preview tidak menampilkan versi lama yang belum di-save.
        const { project: saved } = await saveProject(exportProject);
        router.push(`/preview/${saved.id}`);
      }}
    />
  );
}
