"use client";

import { useEffect, useRef } from "react";
import PreviewPage from "@/components/PreviewPage";
import { getMockupTemplate } from "@/lib/mockupTemplates";
import { drawTextInBox } from "@/lib/textLayout";
import { DesignProject } from "@/lib/types";

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
  elements: getMockupTemplate("Rapor SMA/SMK", {
    judulRapor: "Rapor Peserta Didik",
    namaSekolah: "SMKN 2 Karanganyar",
    alamatSekolah:
      "Jl. Yos Sudarso, Kayangan, Bejen, Kec. Karanganyar, Kabupaten Karanganyar, Jawa Tengah, 57716",
    subInformasi: "NPSN: 20312071 | Bentuk Pendidikan: SMK | Status: Negeri",
  }),
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

export default function QaPage() {
  return (
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
  );
}
