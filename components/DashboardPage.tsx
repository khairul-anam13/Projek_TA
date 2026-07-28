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
import { Card, Badge, Input, PageHeader, IconButton } from "@/components/ui";

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

  return (
    <div className="min-h-screen bg-canvas flex flex-col" id="dashboard-wrapper">
      <PageHeader
        right={
          <>
            <div className="hidden sm:flex items-center gap-2.5">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-8 h-8 rounded-full border border-stone-200 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm border border-brand-200">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm text-stone-700 font-medium">{displayName}</span>
            </div>
            <IconButton onClick={onLogout} title="Keluar" className="flex items-center gap-1.5 w-auto px-3 h-8 text-xs font-medium">
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </IconButton>
          </>
        }
      />

      <main className="max-w-5xl w-full mx-auto px-5 py-8 flex-grow space-y-8">

        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-stone-900 font-display-space">
            Halo, {displayName} 👋
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Apa yang ingin Anda buat hari ini?
          </p>
        </div>

        {/* ── PRODUCT CATALOG SECTION ─────────────────────────────────── */}
        <section id="product-catalog-section">
          <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-4">
            Pilih Jenis Desain
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PRODUCT_CATALOG.map((product) => (
              <motion.button
                key={product.type}
                id={`product-card-${product.type.replace(/\s+/g, "-").toLowerCase()}`}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => product.available && onCreateProject(product.type)}
                disabled={!product.available}
                className={`text-left p-5 rounded-2xl border-2 transition-all cursor-pointer group
                  ${product.available
                    ? "border-stone-200 bg-white hover:border-brand-400 hover:shadow-md hover:shadow-brand-50"
                    : "border-stone-100 bg-stone-50 opacity-50 cursor-not-allowed"
                  }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="text-3xl" role="img" aria-label={product.label}>
                    {product.icon}
                  </span>
                  {product.available ? (
                    <Badge status="brand" className="gap-1.5">
                      <span className="w-1.5 h-1.5 bg-brand-500 rounded-full" />
                      Tersedia
                    </Badge>
                  ) : (
                    <span className="text-[10px] text-stone-400 font-medium">Segera Hadir</span>
                  )}
                </div>
                <h3 className="font-bold text-stone-900 text-sm mb-1 group-hover:text-brand-700 transition-colors">
                  {product.label}
                </h3>
                <p className="text-xs text-stone-500 leading-relaxed mb-3">
                  {product.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-stone-400 font-mono bg-stone-100 px-2 py-0.5 rounded-full">
                    {product.dimension}
                  </span>
                  {product.available && (
                    <div className="flex items-center gap-1 text-xs text-brand-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Buat Baru</span>
                    </div>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </section>

        {/* ── PROJECTS LIST ───────────────────────────────────────────── */}
        <section id="projects-section">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400">
              Desain Tersimpan ({projects.length})
            </h2>
            <div className="relative max-w-xs w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari desain..."
                className="pl-9 py-2 text-xs sm:w-64"
              />
            </div>
          </div>

          {filteredProjects.length === 0 ? (
            <Card className="text-center py-16 border-dashed border-2" id="empty-state">
              <Layers className="w-10 h-10 text-stone-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-stone-600">
                {projects.length === 0 ? "Belum ada desain" : "Tidak ditemukan"}
              </p>
              <p className="text-xs text-stone-400 mt-1">
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
                  <Card hover className="group flex flex-col overflow-hidden" id={`project-card-${project.id}`}>
                    {/* Mini canvas preview */}
                    <div
                      className="h-28 rounded-t-2xl relative overflow-hidden flex items-center justify-center"
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
                      <div className="absolute inset-0 bg-stone-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={() => onEditProject(project)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-stone-900 rounded-lg text-[11px] font-bold cursor-pointer hover:bg-stone-100 transition"
                          title="Edit"
                        >
                          <Edit className="w-3 h-3" /> Edit
                        </button>
                        <button
                          onClick={() => onPreviewProject(project)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-[11px] font-bold cursor-pointer hover:bg-brand-700 transition"
                          title="Pratinjau"
                        >
                          <Eye className="w-3 h-3" /> Lihat
                        </button>
                      </div>
                    </div>

                    {/* Card info */}
                    <div className="p-4 flex flex-col gap-2 flex-grow">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-bold text-stone-900 line-clamp-1 flex-1">
                          {project.name}
                        </h4>
                        <Badge status={project.status === "Final" || project.status === "Selesai" ? "success" : "warning"}>
                          {project.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-stone-400">{project.category}</p>

                      <div className="mt-auto pt-3 border-t border-stone-100 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[10px] text-stone-400 font-mono">
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
                className="inline-flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-semibold cursor-pointer"
              >
                <span>Lihat semua riwayat</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-stone-200 py-5 text-center">
        <p className="text-[11px] text-stone-400 font-mono">
          PageFree — Alat Desain Percetakan Berbasis AI · 2026
        </p>
      </footer>
    </div>
  );
}
