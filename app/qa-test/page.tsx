"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PreviewPage from "@/components/PreviewPage";
import EditorPage from "@/components/EditorPage";
import CreateProjectPage from "@/components/CreateProjectPage";
import BatchPage from "@/components/BatchPage";
import DashboardPage from "@/components/DashboardPage";
import HistoryPage from "@/components/HistoryPage";
import { ConfirmDialog } from "@/components/ui";
import { getMockupTemplate } from "@/lib/mockupTemplates";
import { drawTextInBox } from "@/lib/textLayout";
import { DesignProject, PrintSize } from "@/lib/types";
import { COVER_TEMPLATES, buildTemplatePreviewProject } from "@/lib/templates";
import { buildScene, sceneToSvg } from "@/lib/vectorExport";
import { DesignCanvas } from "@/components/DesignCanvas";
import { getCardRatio } from "@/lib/canvasConstraints";

const QA_SIZES: PrintSize[] = ["Size A (23x34cm)", "Size B (17x23cm)"];
const QA_DATA = {
  judulRapor: "Rapor Peserta Didik",
  namaSekolah: "SMKN 2 Karanganyar",
  alamatSekolah:
    "Jl. Yos Sudarso, Kayangan, Bejen, Kec. Karanganyar, Kabupaten Karanganyar, Jawa Tengah, 57716",
  subInformasi: "NPSN: 20312071 | Bentuk Pendidikan: SMK | Status: Negeri",
};

/** QA visual: semua template x ukuran; kiri = pratinjau SVG di app, kanan = hasil ekspor vektor (SVG). */
function TemplateQa() {
  // Dirender hanya setelah QaPage ter-mount di browser (gate `mounted`), jadi aman memakai canvas.
  const svgs = useMemo(() => {
    const ctx = document.createElement("canvas").getContext("2d");
    const out: Record<string, string> = {};
    if (!ctx) return out;
    for (const t of COVER_TEMPLATES) {
      for (const size of QA_SIZES) {
        const project = buildTemplatePreviewProject(t.id, { data: QA_DATA, mockupType: "Rapor SMA/SMK", printSize: size });
        out[`${t.id}|${size}`] = sceneToSvg(buildScene(project, ctx));
      }
    }
    return out;
  }, []);

  const W = 150;
  return (
    <div id="template-qa" style={{ padding: 24, borderBottom: "1px solid #ccc" }}>
      <h2 style={{ margin: "0 0 12px" }}>Template x ukuran (kiri: pratinjau app, kanan: ekspor vektor)</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
        {COVER_TEMPLATES.map((t) =>
          QA_SIZES.map((size) => {
            const project = buildTemplatePreviewProject(t.id, { data: QA_DATA, mockupType: "Rapor SMA/SMK", printSize: size });
            const h = Math.round(W / getCardRatio(size));
            const svg = svgs[`${t.id}|${size}`];
            return (
              <div key={`${t.id}|${size}`} data-qa={`${t.id}|${size}`}>
                <p style={{ margin: "0 0 4px", fontSize: 12 }}>
                  {t.nama} · {size.split(" ")[1]}
                </p>
                <div style={{ display: "flex", gap: 6 }}>
                  <DesignCanvas project={project} width={W} height={h} borderRadius={2} />
                  <div style={{ width: W, height: h, background: "#111111" }}>
                    {svg && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt={`ekspor ${t.nama}`}
                        width={W}
                        height={h}
                        src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const longProject: DesignProject = {
  id: "qa-long",
  name: "SMKN 2 KARANGANYAR",
  productType: "Sampul Rapor",
  category: "Sekolah",
  concept: "Formal",
  audience: "Siswa",
  backgroundColor: "#111111",
  materialColor: "#111111",
  printMethod: "Embos Foil",
  printSize: "Size A (23x34cm)",
  mockupType: "Rapor SMA/SMK",
  createdAt: new Date().toISOString(),
  status: "Draft",
  slogan: "",
  description: "",
  // id per elemen di-override jadi deterministik (bukan id dari
  // getMockupTemplate yang memakai Date.now()) — nilai objek module-level ini
  // dievaluasi terpisah di server & di client, jadi Date.now() menghasilkan id
  // berbeda antara HTML hasil SSR dan render client -> React hydration mismatch.
  elements: getMockupTemplate("Rapor SMA/SMK", {
    judulRapor: "Rapor Peserta Didik",
    namaSekolah: "SMKN 2 Karanganyar",
    alamatSekolah:
      "Jl. Yos Sudarso, Kayangan, Bejen, Kec. Karanganyar, Kabupaten Karanganyar, Jawa Tengah, 57716",
    subInformasi: "NPSN: 20312071 | Bentuk Pendidikan: SMK | Status: Negeri",
  }).map((el, i) => ({ ...el, id: `qa_el_${i}` })),
};

function ExportCanvasPreview({ project }: { project: DesignProject }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scaleFactor = 2;
    const ratio = 23 / 34;
    const baseW = 800;
    const baseH = Math.round(baseW / ratio);
    const canvasW = baseW * scaleFactor;
    const canvasH = baseH * scaleFactor;
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = project.materialColor || project.backgroundColor || "#ffffff";
    ctx.fillRect(0, 0, canvasW, canvasH);

    const sorted = [...project.elements].sort((a, b) => a.zIndex - b.zIndex);
    for (const el of sorted) {
      const drawX = (el.x / 100) * canvasW;
      const drawY = (el.y / 100) * canvasH;
      const drawW = (el.width / 100) * canvasW;
      const drawH = (el.height / 100) * canvasH;
      if (el.type === "text" && el.text) {
        const sz = (el.fontSize || 14) * 1.5 * scaleFactor;
        drawTextInBox(
          ctx,
          el.text,
          { x: drawX, y: drawY, width: drawW, height: drawH },
          sz,
          el.fontFamily || "Times New Roman",
          el.fontWeight || "normal",
          el.align || "left",
          el.color || "#000"
        );
      } else if (el.type === "logo") {
        ctx.strokeStyle = el.color || "#000";
        ctx.strokeRect(drawX, drawY, drawW, drawH);
      }
    }
  }, [project]);

  return <canvas ref={canvasRef} style={{ width: 400, border: "1px solid #ccc" }} />;
}

const QA_SCHOOLS = ["SMKN 2 Karanganyar", "SDN Harapan Bangsa 3", "MAN 1 Surakarta", "SMPN 4 Sragen", "SMAN 1 Boyolali", "SD Islam Al-Hikmah"];

/** Contoh daftar proyek untuk Dashboard/Riwayat (pratinjau kartu memakai desain asli). */
function sampleProjects(): DesignProject[] {
  return QA_SCHOOLS.map((nama, i) => {
    const tpl = COVER_TEMPLATES[i % COVER_TEMPLATES.length];
    const base = buildTemplatePreviewProject(tpl.id, {
      data: { ...QA_DATA, namaSekolah: nama },
      mockupType: "Rapor SMA/SMK",
      printSize: i % 3 === 2 ? "Size B (17x23cm)" : "Size A (23x34cm)",
    });
    return {
      ...base,
      id: `qa_p${i}`,
      name: nama.toUpperCase(),
      mockupType: "Rapor SMA/SMK",
      category: "Sekolah",
      status: i % 2 === 0 ? "Final" : "Draft",
      createdAt: new Date(2026, 9, 14 - i * 3).toISOString(),
    };
  });
}

export default function QaPage() {
  const [project] = useState(longProject);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  // Halaman editor/preview asli selalu menunggu fetch data client-side dulu
  // (lihat app/(app)/editor/[id]/page.tsx: layar "Memuat proyek...") sebelum
  // me-mount EditorPage/PreviewPage, jadi elemen teksnya tidak pernah ikut
  // ter-SSR. Harness QA ini memakai data statis yang tersedia sejak awal,
  // jadi perlu gate manual yang sama supaya tidak keliru mem-SSR CanvasFitText
  // (yang sengaja no-op saat SSR — lihat computeFitLayout) lalu mismatch saat
  // hydrate.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div>
      <TemplateQa />
      <div id="create-qa" style={{ borderBottom: "1px solid #ccc" }}>
        <CreateProjectPage
          initialProductType="Sampul Rapor"
          initialFormData={{
            mockupType: "Rapor SMA/SMK",
            dynamicData: QA_DATA,
          }}
          onBack={() => {}}
          onSkipAi={async () => {}}
          onGenerateAi={async () => {}}
        />
      </div>
      <div style={{ height: 700, borderBottom: "1px solid #ccc" }}>
        <h2 style={{ padding: "8px 12px", margin: 0, background: "#fff" }}>EditorPage (Figma-style chrome reskin)</h2>
        <div style={{ height: "calc(100% - 37px)" }}>
          <EditorPage
            project={project}
            onBackToDashboard={() => {}}
            onSaveProject={async (p) => ({ project: p, persisted: false })}
            onExport={async () => {}}
          />
        </div>
      </div>
      <div id="batch-qa" style={{ borderBottom: "1px solid #ccc" }}>
        <BatchPage onBack={() => {}} />
      </div>
      <div id="dashboard-qa" style={{ borderBottom: "1px solid #ccc" }}>
        <DashboardPage
          userEmail="operator@percetakan.id"
          userName="Dewi Lestari"
          projects={sampleProjects()}
          onCreateProject={() => {}}
          onEditProject={() => {}}
          onPreviewProject={() => {}}
          onDeleteProject={setDeleteId}
          onViewHistory={() => {}}
          onBatch={() => {}}
          onLogout={() => {}}
        />
      </div>
      <ConfirmDialog
        open={deleteId !== null}
        destructive
        title="Hapus desain ini?"
        message="Contoh dialog konfirmasi hapus (data contoh, tidak ada yang dihapus)."
        confirmLabel="Hapus"
        onConfirm={() => setDeleteId(null)}
        onCancel={() => setDeleteId(null)}
      />
      <div id="history-qa" style={{ borderBottom: "1px solid #ccc" }}>
        <HistoryPage
          projects={sampleProjects()}
          onBack={() => {}}
          onEditProject={() => {}}
          onPreviewProject={() => {}}
          onDeleteProject={() => {}}
        />
      </div>
      <div style={{ padding: 24, display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <h2>Export canvas render (drawTextInBox pipeline) — long real data</h2>
          <ExportCanvasPreview project={longProject} />
        </div>
        <div style={{ width: 500 }}>
          <h2>PreviewPage (on-screen SVG) — long real data</h2>
          <PreviewPage project={longProject} onBackToEditor={() => {}} />
        </div>
      </div>
    </div>
  );
}
