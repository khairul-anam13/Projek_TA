"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppContext } from "@/lib/appContext";
import PreviewPage from "@/components/PreviewPage";
import { DesignProject } from "@/lib/types";

export default function Preview() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { projects, projectsLoading } = useAppContext();

  const [fetchedProject, setFetchedProject] = useState<DesignProject | null>(null);
  const [notFound, setNotFound] = useState(false);
  const hasFetchedRef = useRef(false);

  const projectFromContext = projects.find((p) => p.id === params.id) ?? null;
  const project = projectFromContext ?? fetchedProject;
  const isLoading = projectsLoading || (!project && !notFound);

  useEffect(() => {
    if (projectsLoading) return;
    if (projectFromContext) return;
    if (hasFetchedRef.current) return;
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

  return <PreviewPage project={project} onBackToEditor={() => router.push(`/editor/${project.id}`)} />;
}
