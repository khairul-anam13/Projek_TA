"use client";

import React, { useState } from "react";
import { DesignProject } from "../lib/types";
import { Clock, Edit, Trash2, ExternalLink, Library, Search } from "lucide-react";
import { Card, Badge, Input, PageHeader, IconButton } from "@/components/ui";
import { DesignCanvas } from "./DesignCanvas";
import { getCardRatio } from "@/lib/canvasConstraints";

interface HistoryPageProps {
  projects: DesignProject[];
  /** true selama daftar proyek dimuat. */
  loading?: boolean;
  onBack: () => void;
  onEditProject: (project: DesignProject) => void;
  onPreviewProject: (project: DesignProject) => void;
  onDeleteProject: (id: string) => void;
}

export default function HistoryPage({
  projects,
  loading = false,
  onBack,
  onEditProject,
  onPreviewProject,
  onDeleteProject,
}: HistoryPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [productFilter, setProductFilter] = useState<"All" | "Sampul Rapor">("All");

  const filtered = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = productFilter === "All" || p.productType === productFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-canvas flex flex-col" id="history-layout">
      <PageHeader
        onBack={onBack}
        backLabel="Kembali ke Dashboard"
        title="Arsip desain"
      />

      {/* Main archive window */}
      <main className="max-w-6xl mx-auto px-4 py-8 flex-grow w-full">
        <Card className="shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-stone-100 pb-5 mb-5">
            <div>
              <h2 className="text-lg font-bold text-stone-950 flex items-center gap-2">
                <Library className="w-5 h-5 text-brand-600" />
                <span>Riwayat Proyek Percetakan</span>
              </h2>
              <p className="text-xs text-stone-500 mt-1">Semua sampul rapor yang tersimpan, {projects.length} desain</p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row items-stretch gap-3 w-full md:w-auto">
              {/* Search field */}
              <div className="relative flex-grow">
                <Search className="absolute inset-y-0 left-3 my-auto w-4 h-4 text-stone-400 pointer-events-none" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama proyek..."
                  aria-label="Cari nama proyek"
                  className="w-full sm:w-64 pl-9 py-2 font-semibold"
                />
              </div>

              {/* Product selector filter */}
              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value as any)}
                aria-label="Filter jenis produk"
                className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-700 font-semibold focus-visible:outline-2 focus-visible:outline-brand-600"
              >
                <option value="All">Semua produk</option>
                <option value="Sampul Rapor">Sampul Rapor</option>
              </select>
            </div>
          </div>

          {loading && projects.length === 0 ? (
            <div className="space-y-2" role="status" aria-label="Memuat arsip">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-stone-100 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-100" id="history-empty">
              <Library className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-stone-700">
                {projects.length === 0 ? "Belum ada desain tersimpan" : "Tidak ada desain yang cocok"}
              </p>
              <p className="text-xs text-stone-500 max-w-xs mx-auto mt-1">
                {projects.length === 0
                  ? "Desain yang Anda buat dari halaman Buat Desain akan muncul di sini."
                  : "Coba kata kunci lain atau ubah filter produk."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-stone-200" id="history-table-container">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold">
                    <th className="p-4">Nama Proyek / Sekolah</th>
                    <th className="p-4">Jenis Produk</th>
                    <th className="p-4">Kategori</th>
                    <th className="p-4">Tanggal Dibuat</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 bg-white">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-stone-50/50 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-14 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-stone-100">
                            <DesignCanvas
                              project={p}
                              width={Math.round(52 * getCardRatio(p.printSize))}
                              height={52}
                              borderRadius={2}
                              showMika={false}
                            />
                          </div>
                          <span className="font-bold text-stone-900">{p.name}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge status="brand">{p.productType}</Badge>
                      </td>
                      <td className="p-4 font-semibold text-stone-600">{p.category}</td>
                      <td className="p-4 text-stone-500 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-stone-400" />
                          {new Date(p.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </td>
                      <td className="p-4">
                        <Badge status={p.status === "Final" || p.status === "Selesai" ? "success" : "warning"}>
                          {p.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => onEditProject(p)}
                            className="p-1 px-2.5 bg-brand-50 text-brand-600 hover:bg-brand-100 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => onPreviewProject(p)}
                            className="p-1 px-2.5 bg-stone-100 text-stone-600 hover:bg-stone-200 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Pratinjau</span>
                          </button>

                          <IconButton
                            variant="destructive"
                            size="sm"
                            onClick={() => onDeleteProject(p.id)}
                            title={`Hapus ${p.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>

      {/* Footer copyright */}
      <footer className="text-center py-6 text-xs text-stone-500">
        Arsip desain Page Free, 2026
      </footer>
    </div>
  );
}
