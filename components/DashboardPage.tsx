"use client";

import React, { useState } from "react";
import { DesignProject, ProductType, PRODUCT_CATALOG } from "../lib/types";
import {
  Plus,
  Sparkles,
  Layers,
  Trash2,
  Edit,
  Clock,
  BookOpen,
  FileCheck,
  Search,
  LogOut,
  ChevronRight,
  Eye,
} from "lucide-react";
import { motion } from "motion/react";

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
  const totalFinal = projects.filter((p) => p.status === "Final" || p.status === "Selesai").length;

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col" id="dashboard-wrapper">

      {/* Navbar */}
      <header className="bg-white border-b border-stone-200/80 sticky top-0 z-40" id="dash-navbar">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden shadow-sm">
              <img src="/pagefree.png" alt="Page Free Logo" className="w-full h-full object-cover bg-white" />
            </div>
            <span className="font-bold text-base text-stone-900 tracking-tight">
              Page<span className="text-teal-600">Free</span>
            </span>
          </div>

          {/* User Controls */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2.5">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-8 h-8 rounded-full border border-stone-200 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm border border-teal-200">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm text-stone-700 font-medium">{displayName}</span>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-800 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition cursor-pointer"
              title="Keluar"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl w-full mx-auto px-5 py-8 flex-grow space-y-8">

        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-stone-900">
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
                    ? "border-stone-200 bg-white hover:border-teal-400 hover:shadow-md hover:shadow-teal-50"
                    : "border-stone-100 bg-stone-50 opacity-50 cursor-not-allowed"
                  }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="text-3xl" role="img" aria-label={product.label}>
                    {product.icon}
                  </span>
                  {product.available ? (
                    <div className="flex items-center gap-1 bg-teal-50 text-teal-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-teal-100">
                      <span className="w-1.5 h-1.5 bg-teal-500 rounded-full" />
                      Tersedia
                    </div>
                  ) : (
                    <span className="text-[10px] text-stone-400 font-medium">Segera Hadir</span>
                  )}
                </div>
                <h3 className="font-bold text-stone-900 text-sm mb-1 group-hover:text-teal-700 transition-colors">
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
                    <div className="flex items-center gap-1 text-xs text-teal-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari desain..."
                className="w-full pl-8 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-700 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
              />
            </div>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-stone-200" id="empty-state">
              <Layers className="w-10 h-10 text-stone-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-stone-600">
                {projects.length === 0 ? "Belum ada desain" : "Tidak ditemukan"}
              </p>
              <p className="text-xs text-stone-400 mt-1">
                {projects.length === 0
                  ? "Pilih jenis desain di atas untuk memulai."
                  : "Coba kata pencarian lain."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="projects-grid">
              {filteredProjects.map((project, i) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="group bg-white border border-stone-200 rounded-2xl hover:border-stone-300 hover:shadow-md transition-all flex flex-col"
                  id={`project-card-${project.id}`}
                >
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
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white rounded-lg text-[11px] font-bold cursor-pointer hover:bg-teal-700 transition"
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
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          project.status === "Final" || project.status === "Selesai"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-amber-50 text-amber-600 border border-amber-100"
                        }`}
                      >
                        {project.status}
                      </span>
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
                      <button
                        onClick={() => onDeleteProject(project.id)}
                        className="p-1.5 text-stone-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {projects.length > 6 && (
            <div className="mt-5 text-center">
              <button
                onClick={onViewHistory}
                className="inline-flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-semibold cursor-pointer"
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
