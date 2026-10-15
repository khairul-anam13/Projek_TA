"use client";

import React, { useState } from "react";
import { DesignProject, ProductType, PRODUCT_CATALOG } from "../lib/types";
import {
  Plus,
  Layers,
  Trash2,
  Edit,
  Clock,
  Search,
  LogOut,
  ChevronRight,
  Eye,
} from "lucide-react";
import { motion } from "motion/react";
import { Card, Badge, Input, IconButton } from "@/components/ui";
import { DesignCanvas } from "./DesignCanvas";
import { getCardRatio } from "@/lib/canvasConstraints";

interface DashboardPageProps {
  userEmail: string;
  userName?: string;
  avatarUrl?: string;
  projects: DesignProject[];
  /** true selama daftar proyek dimuat, supaya tidak berkedip "Belum ada desain". */
  loading?: boolean;
  onCreateProject: (productType: ProductType) => void;
  onEditProject: (project: DesignProject) => void;
  onPreviewProject: (project: DesignProject) => void;
  onDeleteProject: (id: string) => void;
  onViewHistory: () => void;
  onBatch: () => void;
  onLogout: () => void;
}

/** Judul seksi bergaya editorial (garis emas pendek di depan teks). */
function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-ink-soft">
      <span className="h-px w-4 bg-foil" />
      {children}
    </h2>
  );
}

export default function DashboardPage({
  userEmail,
  userName,
  avatarUrl,
  projects,
  loading = false,
  onCreateProject,
  onEditProject,
  onPreviewProject,
  onDeleteProject,
  onViewHistory,
  onBatch,
  onLogout,
}: DashboardPageProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayName = userName ? userName.split(" ")[0] : userEmail.split("@")[0];
  const dateline = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-paper flex flex-col relative" id="dashboard-wrapper">
      {/* Butiran kertas tipis — murni dekoratif untuk kesan "kertas", TIDAK
          terkait dengan lib/materialTexture.ts (itu khusus akurasi render
          tekstur bahan cetak produk, bukan hiasan chrome aplikasi). */}
      <svg className="fixed inset-0 w-full h-full pointer-events-none opacity-[0.05] mix-blend-multiply" aria-hidden="true">
        <filter id="dashboard-paper-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#dashboard-paper-grain)" />
      </svg>

      {/* ── MASTHEAD ─────────────────────────────────────────────────── */}
      <header className="relative border-b-2 border-ink px-5 sm:px-8">
        <div className="max-w-5xl w-full mx-auto py-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-2xl font-bold tracking-tight leading-none text-ink">
              Page<span className="text-foil">Free</span>
            </p>
            <p className="mt-1.5 text-[11px] tracking-wide text-ink-soft">Studio desain cetak</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2.5">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-9 h-9 rounded-full border-2 border-ink object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-foil-tint border-2 border-ink flex items-center justify-center text-foil font-bold text-sm">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm text-ink font-medium">{displayName}</span>
            </div>
            <IconButton
              onClick={onBatch}
              title="Batch dari CSV"
              className="flex items-center gap-1.5 w-auto px-3 h-8 text-xs font-medium text-ink-soft hover:text-ink hover:bg-paper-deep"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Batch CSV</span>
            </IconButton>
            <IconButton
              onClick={onLogout}
              title="Keluar"
              className="flex items-center gap-1.5 w-auto px-3 h-8 text-xs font-medium text-ink-soft hover:text-ink hover:bg-paper-deep"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </IconButton>
          </div>
        </div>
      </header>

      <main className="relative max-w-5xl w-full mx-auto px-5 sm:px-8 py-10 flex-grow space-y-12">

        {/* Welcome */}
        <div>
          <p className="text-xs font-medium tracking-wide text-foil mb-2">{dateline}</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink leading-tight">
            Selamat datang, {displayName}.
          </h1>
          <p className="text-ink-soft text-sm mt-2">
            Apa yang ingin dicetak hari ini?
          </p>
        </div>

        {/* ── PRODUCT CATALOG SECTION ─────────────────────────────────── */}
        <section id="product-catalog-section">
          <SectionEyebrow>Pilih Jenis Desain</SectionEyebrow>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {PRODUCT_CATALOG.map((product) => (
              <motion.button
                key={product.type}
                id={`product-card-${product.type.replace(/\s+/g, "-").toLowerCase()}`}
                whileHover={product.available ? { y: -3 } : undefined}
                whileTap={product.available ? { scale: 0.98 } : undefined}
                onClick={() => product.available && onCreateProject(product.type)}
                disabled={!product.available}
                className={`group relative text-left overflow-hidden bg-white border border-paper-deep rounded-lg transition-all
                  ${product.available
                    ? "cursor-pointer hover:border-foil hover:shadow-[0_10px_28px_-12px_rgba(34,29,21,0.35)]"
                    : "opacity-50 cursor-not-allowed"
                  }`}
              >
                <div className="h-1.5 w-full bg-foil-bright" />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-5">
                    <span
                      className="w-11 h-11 rounded-full bg-foil-tint flex items-center justify-center text-xl"
                      role="img"
                      aria-label={product.label}
                    >
                      {product.icon}
                    </span>
                    {product.available ? (
                      <span className="text-[11px] font-semibold text-foil border border-foil/40 rounded-full px-2 py-0.5">
                        Tersedia
                      </span>
                    ) : (
                      <span className="text-[11px] text-ink-soft">Segera hadir</span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-ink mb-1.5">
                    {product.label}
                  </h3>
                  <p className="text-xs text-ink-soft leading-relaxed mb-4">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between pt-3 border-t border-paper-deep">
                    <span className="text-xs text-ink-soft">
                      {product.dimension}
                    </span>
                    {product.available && (
                      <div className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs text-foil font-semibold">
                        <Plus className="w-3.5 h-3.5" />
                        <span>Buat baru</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </section>

        {/* ── PROJECTS LIST ───────────────────────────────────────────── */}
        <section id="projects-section">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
            <SectionEyebrow>Arsip Desain ({projects.length})</SectionEyebrow>
            <div className="relative max-w-xs w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-soft pointer-events-none" />
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari desain..."
                aria-label="Cari desain"
                className="pl-9 py-2 text-xs sm:w-64 border-paper-deep focus:border-foil focus:ring-foil-tint"
              />
            </div>
          </div>

          {loading && projects.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" role="status" aria-label="Memuat desain">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-72 rounded-lg border border-paper-deep bg-white animate-pulse" />
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <Card className="text-center py-16 border-dashed border-2 border-paper-deep bg-transparent" id="empty-state">
              <Layers className="w-9 h-9 text-ink-soft/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-ink">
                {projects.length === 0 ? "Belum ada desain" : "Tidak ditemukan"}
              </p>
              <p className="text-xs text-ink-soft mt-1">
                {projects.length === 0
                  ? "Pilih jenis desain di atas untuk memulai."
                  : "Coba kata pencarian lain."}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="projects-grid">
              {filteredProjects.map((project, i) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 8) * 0.04 }}
                >
                  <Card hover className="group flex h-full flex-col overflow-hidden border-paper-deep rounded-lg" id={`project-card-${project.id}`}>
                    {/* Pratinjau desain asli; klik membuka editor */}
                    <button
                      type="button"
                      onClick={() => onEditProject(project)}
                      aria-label={`Buka editor: ${project.name}`}
                      className="flex h-44 w-full cursor-pointer items-center justify-center bg-paper-deep/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foil"
                    >
                      <DesignCanvas
                        project={project}
                        width={Math.round(148 * getCardRatio(project.printSize))}
                        height={148}
                        borderRadius={3}
                      />
                    </button>

                    <div className="p-4 flex flex-col gap-2 flex-grow border-t border-paper-deep">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-semibold text-ink line-clamp-1 flex-1" title={project.name}>
                          {project.name}
                        </h3>
                        <Badge status={project.status === "Final" || project.status === "Selesai" ? "success" : "warning"}>
                          {project.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-ink-soft">
                        {[project.mockupType, project.printSize?.replace("Size ", "Ukuran ")].filter(Boolean).join(", ") ||
                          project.category}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-ink-soft">
                        <Clock className="w-3 h-3" />
                        {new Date(project.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>

                      <div className="mt-auto pt-3 border-t border-paper-deep flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onEditProject(project)}
                          className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-paper-deep px-3 py-2 text-xs font-semibold text-ink transition hover:bg-paper-deep"
                        >
                          <Edit className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onPreviewProject(project)}
                          className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-foil/40 px-3 py-2 text-xs font-semibold text-foil transition hover:bg-foil-tint"
                        >
                          <Eye className="w-3.5 h-3.5" /> Pratinjau
                        </button>
                        <IconButton
                          variant="destructive"
                          size="md"
                          onClick={() => onDeleteProject(project.id)}
                          title={`Hapus ${project.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </IconButton>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {projects.length > 6 && (
            <div className="mt-5 text-center">
              <button
                onClick={onViewHistory}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-foil hover:text-ink transition cursor-pointer"
              >
                <span>Lihat semua riwayat</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </section>
      </main>

      <footer className="relative border-t border-paper-deep py-5 text-center">
        <p className="text-xs text-ink-soft">PageFree, studio desain sampul rapor siap cetak. 2026</p>
      </footer>
    </div>
  );
}
