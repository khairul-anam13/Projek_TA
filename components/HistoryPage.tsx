"use client";

import React, { useState } from "react";
import { DesignProject } from "../lib/types";
import { ArrowLeft, Clock, Edit, Trash2, ExternalLink, Library, Search, Filter } from "lucide-react";

interface HistoryPageProps {
  projects: DesignProject[];
  onBack: () => void;
  onEditProject: (project: DesignProject) => void;
  onPreviewProject: (project: DesignProject) => void;
  onDeleteProject: (id: string) => void;
}

export default function HistoryPage({
  projects,
  onBack,
  onEditProject,
  onPreviewProject,
  onDeleteProject,
}: HistoryPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [productFilter, setProductFilter] = useState<"All" | "Kartu Nama" | "Sampul Rapor">("All");

  const filtered = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = productFilter === "All" || p.productType === productFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" id="history-layout">
      {/* Navbar header */}
      <header className="bg-white border-b border-slate-200 h-16 flex items-center shrink-0" id="history-navbar">
        <div className="max-w-6xl mx-auto px-4 w-full flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Dashboard</span>
          </button>

          <span className="text-sm font-extrabold text-slate-800">Arsip Desain Page Free</span>
        </div>
      </header>

      {/* Main archive window */}
      <main className="max-w-6xl mx-auto px-4 py-8 flex-grow w-full">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
            <div>
              <h2 className="text-lg font-bold text-slate-950 font-display-space flex items-center gap-2">
                <Library className="w-5 h-5 text-blue-600" />
                <span>Riwayat Proyek Percetakan</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">Daftar semua layout, kartu nama, & sampul rapor terenkripsi lokal</p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row items-stretch gap-3 w-full md:w-auto">
              {/* Search field */}
              <div className="relative flex-grow">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama proyek..."
                  className="w-full sm:w-64 pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 font-semibold"
                />
              </div>

              {/* Product selector filter */}
              <div className="relative">
                <select
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none font-bold"
                >
                  <option value="All">Semua Produk</option>
                  <option value="Kartu Nama">Kartu Nama</option>
                  <option value="Sampul Rapor">Sampul Rapor</option>
                </select>
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100" id="history-empty">
              <Library className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">Daftar Arsip Kosong</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                Tidak ditemukan kecocokan proyek dalam mesin arsip Anda. Ketikkan kata kunci lain.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200" id="history-table-container">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="p-4">Nama Proyek / Toko</th>
                    <th className="p-4">Jenis Produk</th>
                    <th className="p-4">Kategori Industri</th>
                    <th className="p-4">Tanggal Dibuat</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-4 font-bold text-slate-900">{p.name}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                          p.productType === "Kartu Nama"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-teal-50 text-teal-700"
                        }`}>
                          {p.productType}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-slate-600">{p.category}</td>
                      <td className="p-4 text-slate-500 font-mono flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-300" />
                        {new Date(p.createdAt).toLocaleDateString("id-ID")}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                          p.status === "Final" || p.status === "Selesai"
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            : "bg-amber-50 text-amber-600 border border-amber-100"
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => onEditProject(p)}
                            className="p-1 px-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          
                          <button
                            onClick={() => onPreviewProject(p)}
                            className="p-1 px-2.5 bg-slate-100 text-slate-650 hover:bg-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Mockup</span>
                          </button>
                          
                          <button
                            onClick={() => onDeleteProject(p.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer transition-colors"
                            title="Hapus Proyek"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Footer copyright */}
      <footer className="text-center py-6 text-[10px] text-slate-400 font-mono">
        Arsip Cetak Cloud-Local Sistem Percetakan Indonesia &bull; 2026
      </footer>
    </div>
  );
}
