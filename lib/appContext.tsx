"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { DesignProject } from "@/lib/types";

interface AppContextValue {
  user: User | null;
  authLoading: boolean;
  projects: DesignProject[];
  projectsLoading: boolean;
  setProjects: React.Dispatch<React.SetStateAction<DesignProject[]>>;
  refetchProjects: () => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

/**
 * Provider bersama untuk semua halaman terautentikasi (dashboard, history,
 * create, editor, preview). Route group layout ini tidak remount saat
 * berpindah antar halaman turunan, jadi state auth + daftar project tetap
 * hidup sepanjang sesi browser (dipindah verbatim dari app/page.tsx lama).
 */
export function AppProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [projects, setProjects] = useState<DesignProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setProjects([]);
        router.replace("/login");
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      // Fetch-on-mount/user-change yang wajar; fetchProjects() men-set
      // projectsLoading segera saat dipanggil (sebelum await pertama), yang
      // secara teknis kena kaidah "no setState sinkron di effect" — tapi
      // menunda-tunda ini lewat pola lain akan mengubah kapan spinner
      // loading proyek muncul, jadi sengaja tidak diubah tanpa uji end-to-end.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchProjects();
    }
  }, [user, fetchProjects]);

  // Dipakai bersama oleh Dashboard & History — dulu di-duplikasi identik di
  // kedua halaman, termasuk bug yang sama: response non-2xx dari DELETE
  // (mis. RLS/auth error) tidak pernah dicek, jadi proyek yang GAGAL dihapus
  // di server tetap hilang dari daftar di layar karena sudah dihapus secara
  // optimistic duluan.
  const deleteProject = useCallback(async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus proyek desain ini?")) return;

    setProjects((prev) => prev.filter((p) => p.id !== id));

    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error(`Hapus proyek gagal dengan status ${res.status}`);
      }
    } catch (e) {
      console.error("[deleteProject] Gagal menghapus:", e);
      alert("Gagal menghapus proyek. Coba lagi.");
      await fetchProjects();
    }
  }, [fetchProjects]);

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

  // Redirect ke /login sudah dipicu di atas; jangan render konten terproteksi
  // selagi navigasi itu berlangsung.
  if (!user) {
    return null;
  }

  return (
    <AppContext.Provider
      value={{ user, authLoading, projects, projectsLoading, setProjects, refetchProjects: fetchProjects, deleteProject }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useAppContext must be used within <AppProvider>");
  }
  return ctx;
}
