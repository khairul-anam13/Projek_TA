"use client";

import { useState } from "react";
import { useAppContext } from "@/lib/appContext";
import { ConfirmDialog } from "@/components/ui";
import type { DesignProject } from "@/lib/types";

/**
 * Hapus proyek dengan dialog konfirmasi (dipakai Dashboard & Riwayat).
 * Optimistik: baris langsung hilang; bila server gagal, daftar dimuat ulang.
 */
export function useDeleteProject() {
  const { projects, setProjects, refetchProjects } = useAppContext();
  const [pending, setPending] = useState<DesignProject | null>(null);

  const requestDelete = (id: string) => setPending(projects.find((p) => p.id === id) ?? null);

  const confirmDelete = async () => {
    if (!pending) return;
    const id = pending.id;
    setPending(null);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Hapus gagal: ${res.status}`);
    } catch (e) {
      console.error("[useDeleteProject] Gagal menghapus:", e);
      refetchProjects();
    }
  };

  const dialog = (
    <ConfirmDialog
      open={pending !== null}
      destructive
      title="Hapus desain ini?"
      message={pending ? `"${pending.name}" akan dihapus permanen dan tidak bisa dikembalikan.` : undefined}
      confirmLabel="Hapus"
      onConfirm={confirmDelete}
      onCancel={() => setPending(null)}
    />
  );

  return { requestDelete, dialog };
}
