"use client";

import React, { useState } from "react";
import { DesignProject } from "../lib/types";
import {
  Plus,
  Sparkles,
  Layers,
  Download,
  FolderOpen,
  Trash2,
  Edit,
  Clock,
  Printer,
  FileCheck,
  Search,
  BookOpen,
  CreditCard,
  ExternalLink,
  ChevronRight
} from "lucide-react";

interface DashboardPageProps {
  userEmail: string;
  projects: DesignProject[];
  onCreateProject: (productType: "Kartu Nama" | "Sampul Rapor") => void;
  onEditProject: (project: DesignProject) => void;
  onPreviewProject: (project: DesignProject) => void;
  onDeleteProject: (id: string) => void;
  onViewHistory: () => void;
  onLogout: () => void;
}

export default function DashboardPage({
  userEmail,
  projects,
  onCreateProject,
  onEditProject,
  onPreviewProject,
  onDeleteProject,
  onViewHistory,
  onLogout,
}: DashboardPageProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats Counters
  const totalDesigns = projects.length;
  const totalDraft = projects.filter((p) => p.status === "Draft").length;
  const totalFinal = projects.filter((p) => p.status === "Final" || p.status === "Selesai").length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" id="dashboard-wrapper">
      {/* SaaS Dashboard Navigation bar */}
      <header className="bg-white border-b border-slate-200/85 sticky top-0 z-40" id="dash-navbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl text-white">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-slate-900">
                Page <span className="text-blue-600">Free</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-mono font-bold uppercase">
                Enterprise Demo
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-xs text-slate-400 font-mono">Logged in as</p>
              <p className="text-sm font-semibold text-slate-800">{userEmail}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border border-blue-200">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={onLogout}
              className="text-xs bg-slate-100 hover:bg-slate-200 font-semibold px-3 py-1.5 rounded-lg text-slate-600 cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main SaaS Dashboard stage */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        {/* Top welcome banner */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4" id="welcome-banner">
          <div>
            <h1 className="text-2xl font-bold text-slate-950 font-display-space tracking-tight">
              Selamat Datang, {userEmail.split("@")[0]}!
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Ide Anda siap dicetak. Mulai proyek baru dengan AI atau kembangkan karya yang sudah disimpan.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onCreateProject("Kartu Nama")}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-100 flex items-center gap-1.5 cursor-pointer transform transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Kartu Nama Baru</span>
            </button>
            <button
              onClick={() => onCreateProject("Sampul Rapor")}
              className="px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-sm font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer transform transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Sampul Rapor Baru</span>
            </button>
          </div>
        </div>

        {/* 3 Grid Statistics Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8" id="stats-grid">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Desain Saya</span>
              <span className="text-3xl font-extrabold text-slate-900 mt-1 block">{totalDesigns}</span>
              <span className="text-slate-400 text-xs mt-1 block">Tersimpan di enkripsi local</span>
            </div>
            <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl">
              <Layers className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Desain Final/Export</span>
              <span className="text-3xl font-extrabold text-emerald-600 mt-1 block">{totalFinal}</span>
              <span className="text-slate-400 text-xs mt-1 block">Siap kirim ke mesin cetak</span>
            </div>
            <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl">
              <FileCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Template Percetakan</span>
              <span className="text-3xl font-extrabold text-amber-500 mt-1 block">3 Pilihan</span>
              <span className="text-slate-400 text-xs mt-1 block">Pra-desain profesional aktif</span>
            </div>
            <div className="p-3.5 bg-amber-50 text-amber-500 rounded-2xl">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Quick Launchpad Buttons */}
        <div className="bg-gradient-to-tr from-blue-700 to-indigo-800 rounded-2xl p-6 text-white mb-8 shadow-lg shadow-blue-100" id="quick-action-strip">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-semibold inline-block mb-2">Panduan AI Kreatif</span>
              <h2 className="text-xl font-bold tracking-tight">Butuh inspirasi desain kilat untuk usaha atau sekolah?</h2>
              <p className="text-blue-100 text-xs mt-1 max-w-xl">
                Isi form dan serahkan ke rekomendasi visual Gemini AI. Dapatkan konsep warna terpadu, logo yang elegan, tagline promosi, dan font yang serasi.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 w-full md:w-auto shrink-0 justify-end">
              <button
                onClick={() => onCreateProject("Kartu Nama")}
                className="w-full md:w-auto px-5 py-3 bg-white text-blue-700 hover:bg-slate-50 active:bg-slate-100 font-bold rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span>Buat Kartu Nama Pintar</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
              <button
                onClick={() => onCreateProject("Sampul Rapor")}
                className="w-full md:w-auto px-5 py-3 bg-blue-600 border border-blue-400/50 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <BookOpen className="w-4 h-4 text-blue-100" />
                <span>Buat Sampul Rapor</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        </div>

        {/* Recent project search & card section */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6" id="projects-section">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-slate-500" />
                <span>Riwayat Proyek Terbaru</span>
              </h3>
              <p className="text-slate-400 text-xs font-medium">Buka kembali desain tersimpan untuk diedit atau diexport</p>
            </div>

            <div className="relative max-w-xs w-full" id="search-container">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama desain / bidang..."
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-2xl" id="empty-state">
              <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">Belum ada desain tersimpan</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                Ketikkan kata pencarian lain atau mulai proyek baru Anda dengan mengeklik tombol di atas.
              </p>
              <div className="mt-4 flex justify-center gap-2.5">
                <button
                  onClick={() => onCreateProject("Kartu Nama")}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-blue-600 rounded-xl cursor-pointer"
                >
                  Buat Kartu Nama Pertama
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" id="projects-history-grid">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="group relative bg-white border border-slate-200/80 rounded-2xl hover:border-blue-300 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  id={`project-card-${project.id}`}
                >
                  <div>
                    {/* Badge product type */}
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                        project.productType === "Kartu Nama"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-teal-50 text-teal-700"
                      }`}>
                        {project.productType}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                        project.status === "Final" || project.status === "Selesai"
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                          : "bg-amber-50 text-amber-600 border border-amber-100"
                      }`}>
                        {project.status}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 block line-clamp-1">
                      {project.name}
                    </h4>

                    {/* Metadata tags */}
                    <div className="mt-2 text-[11px] text-slate-400 space-y-1">
                      <p>Kategori: <strong className="text-slate-600">{project.category}</strong></p>
                      <p>Konsep: <strong className="text-slate-600">{project.concept}</strong></p>
                    </div>

                    {/* Mini Visual Preview Block box with background */}
                    <div
                      className="mt-4 h-24 rounded-xl relative overflow-hidden flex items-center justify-center shadow-inner border border-slate-100"
                      style={{ backgroundColor: project.backgroundColor || "#ffffff" }}
                    >
                      <div className="text-center p-2 opacity-80 scale-90">
                        <p
                          className="text-[10px] font-extrabold uppercase tracking-wide line-clamp-1"
                          style={{
                            color: project.backgroundColor === "#FFFFFF" || project.backgroundColor === "#FDFCFA" ? "#1E293B" : "#FFFFFF",
                            fontFamily: project.typography?.title || "sans-serif"
                          }}
                        >
                          {project.name}
                        </p>
                        <p
                          className="text-[7px] block italic line-clamp-1 mt-0.5"
                          style={{
                            color: project.backgroundColor === "#FFFFFF" || project.backgroundColor === "#FDFCFA" ? "#64748B" : "#CBD5E1",
                            fontFamily: project.typography?.body || "sans-serif"
                          }}
                        >
                          &ldquo;{project.slogan || "Terdepan & Terpercaya"}&rdquo;
                        </p>
                      </div>
                      
                      {/* Hover action overlay */}
                      <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={() => onEditProject(project)}
                          className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
                          title="Buka Editor"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onPreviewProject(project)}
                          className="p-1.5 bg-white hover:bg-slate-100 text-slate-800 rounded-lg cursor-pointer"
                          title="Lihat Mockup"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Date and Delete Action Row */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-slate-300" />
                      {new Date(project.createdAt).toLocaleDateString("id-ID")}
                    </span>

                    <button
                      onClick={() => onDeleteProject(project.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-md cursor-pointer transition-colors"
                      title="Hapus Proyek"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {projects.length > 0 && (
            <div className="mt-6 text-center">
              <button
                onClick={onViewHistory}
                className="text-xs text-blue-600 hover:text-blue-700 font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Lihat Semua Daftar Riwayat Lengkap</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer copyright */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-400 font-mono">
          PT Kreatif Percetakan Indonesia — Dashboard Hub Platform v1.4.0
        </div>
      </footer>
    </div>
  );
}
