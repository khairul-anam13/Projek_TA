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

interface DashboardPageProps {
  userEmail: string;
  userName?: string;
  avatarUrl?: string;
  projects: DesignProject[];
  onCreateProject: (productType: ProductType) => void;
  onEditProject: (project: DesignProject) => void;
  onPreviewProject: (project: DesignProject) => void;
  onDeleteProject: (id: string) => void;
  onViewHistory: () => void;
  onLogout: () => void;
}

/** Label eyebrow bergaya editorial (garis pendek + huruf kecil renggang) —
 * dipakai berulang di beranda ini sebagai pengganti label abu-abu generik. */
function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-soft">
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
  onCreateProject,
  onEditProject,
  onPreviewProject,
  onDeleteProject,
  onViewHistory,
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
            <p className="font-layout-serif text-2xl leading-none text-ink">
              Page<span className="text-foil">Free</span>
            </p>
            <p className="mt-1.5 text-[9px] font-mono uppercase tracking-[0.25em] text-ink-soft">
              Studio Desain Cetak &middot; AI Assisted
            </p>
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
                <div className="w-9 h-9 rounded-full bg-foil-tint border-2 border-ink flex items-center justify-center text-foil font-layout-serif font-bold text-sm">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm text-ink font-medium">{displayName}</span>
            </div>
            <IconButton
              onClick={onLogout}
              title="Keluar"
              className="flex items-center gap-1.5 w-auto px-3 h-8 text-xs font-mono uppercase tracking-wide text-ink-soft hover:text-ink hover:bg-paper-deep"
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
          <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-foil mb-2">{dateline}</p>
          <h1 className="font-layout-serif text-3xl sm:text-4xl text-ink leading-tight">
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
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-foil border border-foil/40 rounded-full px-2 py-0.5">
                        Tersedia
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono uppercase tracking-wider text-ink-soft">Segera Hadir</span>
                    )}
                  </div>
                  <h3 className="font-layout-serif text-lg text-ink mb-1.5">
                    {product.label}
                  </h3>
                  <p className="text-xs text-ink-soft leading-relaxed mb-4">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between pt-3 border-t border-paper-deep">
                    <span className="text-[10px] font-mono text-ink-soft">
                      {product.dimension}
                    </span>
                    {product.available && (
                      <div className="flex items-center gap-1 text-xs text-foil font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus className="w-3.5 h-3.5" />
                        <span>Buat Baru</span>
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
                className="pl-9 py-2 text-xs sm:w-64 border-paper-deep focus:border-foil focus:ring-foil-tint"
              />
            </div>
          </div>

          {filteredProjects.length === 0 ? (
            <Card className="text-center py-16 border-dashed border-2 border-paper-deep bg-transparent" id="empty-state">
              <Layers className="w-9 h-9 text-ink-soft/40 mx-auto mb-3" />
              <p className="text-sm font-layout-serif text-ink">
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
                  transition={{ delay: i * 0.05 }}
                >
                  <Card hover className="group flex flex-col overflow-hidden border-paper-deep rounded-lg" id={`project-card-${project.id}`}>
                    {/* Contoh mini dari desain asli (warna & tipografi proyek) */}
                    <div
                      className="h-28 relative overflow-hidden flex items-center justify-center"
                      style={{ backgroundColor: project.backgroundColor || "#f8f7f4" }}
                    >
                      <div className="text-center px-3">
                        <p
                          className="text-[10px] font-extrabold uppercase tracking-wide line-clamp-1"
                          style={{
                            color:
                              project.backgroundColor === "#FFFFFF" ||
                              project.backgroundColor === "#FDFCFA"
                                ? "#1C1917"
                                : "#FFFFFF",
                            fontFamily: project.typography?.title || "sans-serif",
                          }}
                        >
                          {project.name}
                        </p>
                        <p
                          className="text-[7px] mt-0.5 line-clamp-1 italic"
                          style={{
                            color:
                              project.backgroundColor === "#FFFFFF" ||
                              project.backgroundColor === "#FDFCFA"
                                ? "#78716C"
                                : "#D6D3D1",
                            fontFamily: project.typography?.body || "sans-serif",
                          }}
                        >
                          {project.slogan || "Desain Sampul Rapor"}
                        </p>
                      </div>

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-ink/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={() => onEditProject(project)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-ink rounded-md text-[11px] font-bold cursor-pointer hover:bg-paper transition"
                          title="Edit"
                        >
                          <Edit className="w-3 h-3" /> Edit
                        </button>
                        <button
                          onClick={() => onPreviewProject(project)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-foil text-white rounded-md text-[11px] font-bold cursor-pointer hover:bg-foil/90 transition"
                          title="Pratinjau"
                        >
                          <Eye className="w-3 h-3" /> Lihat
                        </button>
                      </div>
                    </div>

                    {/* Card info */}
                    <div className="p-4 flex flex-col gap-2 flex-grow border-t border-paper-deep">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-layout-serif text-base text-ink line-clamp-1 flex-1">
                          {project.name}
                        </h4>
                        <Badge status={project.status === "Final" || project.status === "Selesai" ? "success" : "warning"}>
                          {project.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-ink-soft">{project.category}</p>

                      <div className="mt-auto pt-3 border-t border-paper-deep flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[10px] text-ink-soft font-mono">
                          <Clock className="w-3 h-3" />
                          {new Date(project.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        <IconButton
                          variant="destructive"
                          size="sm"
                          onClick={() => onDeleteProject(project.id)}
                          title="Hapus"
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
                className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wide text-foil hover:text-ink transition cursor-pointer"
              >
                <span>Lihat semua riwayat</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </section>
      </main>

      <footer className="relative border-t border-paper-deep py-5 text-center">
        <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-ink-soft">
          PageFree &mdash; Studio Desain Percetakan Berbasis AI &middot; 2026
        </p>
      </footer>
    </div>
  );
}
