"use client";

import React, { useState, useRef, useMemo } from "react";
import { DesignProject } from "../lib/types";
import { Download, FileText, FileCode2, RotateCcw, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { Button, PageHeader } from "@/components/ui";
import jsPDF from "jspdf";
import { drawTextInBox, scaledInitialFontSize } from "../lib/textLayout";
import { materialTextureSvgString, MATERIAL_TEXTURE_OPACITY, MATERIAL_TEXTURE_BLEND_MODE } from "../lib/materialTexture";
import { getMikaRect, getPrintSizeCm } from "../lib/canvasConstraints";
import { logoIconMarkup } from "../lib/logoIcons";
import { customSvgMarkup } from "../lib/svgUtils";
import { runPreflight, preflightSummary } from "../lib/preflight";
import { buildScene, sceneToPdf, sceneToSvg } from "../lib/vectorExport";
import { DesignCanvas } from "./DesignCanvas";

interface PreviewPageProps {
  project: DesignProject;
  onBackToEditor: () => void;
}

/** 3D card yang bisa digerakkan dengan mouse / sentuhan */
function ThreeDMockup({ project }: { project: DesignProject }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth springs
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [18, -18]), { stiffness: 120, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-22, 22]), { stiffness: 120, damping: 20 });

  // Parallax shadow offset
  const shadowX = useTransform(rotateY, [-22, 22], [-30, 30]);
  const shadowY = useTransform(rotateX, [-18, 18], [30, -15]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  // Aspect ratio based on size
  const isSizeB = project.printSize === "Size B (17x23cm)";
  const ratio = isSizeB ? (17 / 23) : (23 / 34);
  const cardW = 300;
  const cardH = Math.round(cardW / ratio);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="flex items-center justify-center w-full h-full select-none"
      style={{ perspective: "1000px" }}
    >
      {/* Ambient glow that tracks mouse */}
      <motion.div
        className="absolute rounded-full blur-3xl opacity-25 pointer-events-none"
        style={{
          width: cardW * 1.4,
          height: cardH * 0.8,
          background: project.palette?.accent || "#5eead4",
          x: useTransform(mouseX, [-0.5, 0.5], [-40, 40]),
          y: useTransform(mouseY, [-0.5, 0.5], [-20, 20]),
        }}
      />

      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className="relative"
      >
        {/* Drop shadow that follows 3D tilt */}
        <motion.div
          className="absolute inset-0 rounded-lg opacity-40 blur-2xl pointer-events-none -z-10"
          style={{
            backgroundColor: "#000",
            x: shadowX,
            y: shadowY,
            scale: 0.95,
          }}
        />

        {/* The card itself */}
        <div
          className="relative"
          style={{
            width: cardW,
            height: cardH,
            borderRadius: 10,
            overflow: "hidden",
            boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
          }}
        >
          <DesignCanvas project={project} width={cardW} height={cardH} borderRadius={10} />
        </div>

        {/* 3D edge effect — left side face */}
        <div
          className="absolute top-0 left-0 h-full opacity-20 pointer-events-none"
          style={{
            width: 12,
            background: "linear-gradient(to right, rgba(0,0,0,0.6), transparent)",
            borderRadius: "10px 0 0 10px",
            transform: "translateZ(-1px)",
          }}
        />

        {/* 3D edge effect — bottom face */}
        <div
          className="absolute bottom-0 left-0 w-full opacity-20 pointer-events-none"
          style={{
            height: 14,
            background: "linear-gradient(to top, rgba(0,0,0,0.5), transparent)",
            borderRadius: "0 0 10px 10px",
            transform: "translateZ(-1px)",
          }}
        />

        {/* Sheen highlight that follows tilt */}
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-lg"
          style={{
            background: useTransform(
              [mouseX, mouseY],
              ([mx, my]) =>
                `radial-gradient(ellipse at ${50 + (mx as number) * 80}% ${50 + (my as number) * 80}%, rgba(255,255,255,0.13) 0%, transparent 65%)`
            ),
          }}
        />
      </motion.div>
    </div>
  );
}

export default function PreviewPage({ project, onBackToEditor }: PreviewPageProps) {
  const [mode, setMode] = useState<"3d" | "flat">("3d");

  const generateHighResFile = async (format: "png" | "pdf") => {
    const scaleFactor = 2;
    const isSizeB = project.printSize === "Size B (17x23cm)";
    const ratio = isSizeB ? (17 / 23) : (23 / 34);
    const baseW = 800;
    const baseH = Math.round(baseW / ratio);
    const canvasW = baseW * scaleFactor;
    const canvasH = baseH * scaleFactor;

    const canvas = document.createElement("canvas");
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = project.materialColor || project.backgroundColor || "#ffffff";
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Lapisan tekstur bahan — sebelumnya TIDAK pernah digambar di sini sama
    // sekali, sehingga hasil ekspor selalu terlihat polos (hanya elemen teks/
    // bentuk di atas warna solid) dibanding tampilan bertekstur di editor &
    // preview. Dirender dari SVG filter yang sama persis (lib/materialTexture.ts)
    // supaya hasilnya identik, bukan tekstur "mirip-mirip" yang diimplementasi ulang.
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        ctx.save();
        ctx.globalAlpha = MATERIAL_TEXTURE_OPACITY;
        ctx.globalCompositeOperation = MATERIAL_TEXTURE_BLEND_MODE;
        ctx.drawImage(img, 0, 0, canvasW, canvasH);
        ctx.restore();
        resolve();
      };
      img.onerror = () => resolve();
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(materialTextureSvgString(canvasW, canvasH))}`;
    });

    const sorted = [...project.elements].sort((a, b) => a.zIndex - b.zIndex);

    for (const el of sorted) {
      ctx.save();
      const drawX = (el.x / 100) * canvasW;
      const drawY = (el.y / 100) * canvasH;
      const drawW = (el.width / 100) * canvasW;
      const drawH = (el.height / 100) * canvasH;

      if (el.type === "shape") {
        ctx.fillStyle = el.color || "#cccccc";
        if (el.shapeType === "circle") {
          ctx.beginPath();
          ctx.ellipse(drawX + drawW / 2, drawY + drawH / 2, drawW / 2, drawH / 2, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (el.shapeType === "line") {
          ctx.strokeStyle = el.color || "#000";
          ctx.lineWidth = (el.height || 3) * scaleFactor;
          ctx.beginPath();
          ctx.moveTo(drawX, drawY);
          ctx.lineTo(drawX + drawW, drawY);
          ctx.stroke();
        } else {
          ctx.fillRect(drawX, drawY, drawW, drawH);
        }
      } else if (el.type === "text" && el.text) {
        const sz = scaledInitialFontSize(el.fontSize, canvasW);
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
      } else if (el.type === "image" && el.imageUrl) {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, drawX, drawY, drawW, drawH);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = el.imageUrl!;
        });
      } else if ((el.type === "custom_svg" && el.customSvg) || el.type === "logo") {
        const svgStr =
          el.type === "logo"
            ? `<svg xmlns="http://www.w3.org/2000/svg" width="${drawW}" height="${drawH}" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">${logoIconMarkup(el.logoIcon, el.color || "#000")}</svg>`
            : customSvgMarkup(
                el.customSvg!,
                el.color || "#000000",
                `xmlns="http://www.w3.org/2000/svg" width="${drawW}" height="${drawH}"`
              );

        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, drawX, drawY, drawW, drawH);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`;
        });
      }
      ctx.restore();
    }

    // Gambar overlay mika nama di atas semua elemen
    await new Promise<void>((resolve) => {
      const mikaImg = new Image();
      mikaImg.onload = () => {
        const mika = getMikaRect(project.printSize);
        ctx.drawImage(
          mikaImg,
          (mika.x / 100) * canvasW,
          (mika.y / 100) * canvasH,
          (mika.width / 100) * canvasW,
          (mika.height / 100) * canvasH
        );
        resolve();
      };
      mikaImg.onerror = () => resolve();
      mikaImg.src = "/mika-nama.png";
    });

    const fileBaseName = `PageFree-${project.name.replace(/\s+/g, "_")}-SampulRapor`;

    if (format === "png") {
      const a = document.createElement("a");
      a.download = `${fileBaseName}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    } else {
      // Ukuran fisik cetak sebenarnya (mm), bukan ukuran layar — supaya PDF
      // yang dihasilkan benar-benar ready-to-print sesuai spesifikasi, bukan
      // hasil "print" halaman web.
      const widthMm = isSizeB ? 170 : 230;
      const heightMm = isSizeB ? 230 : 340;

      const pdf = new jsPDF({
        orientation: heightMm >= widthMm ? "portrait" : "landscape",
        unit: "mm",
        format: [widthMm, heightMm],
      });
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, widthMm, heightMm);
      pdf.save(`${fileBaseName}.pdf`);
    }
  };

  /** Ekspor artwork vektor (tanpa bahan & mika) dalam ukuran fisik asli untuk klise. */
  const exportVector = (format: "svg" | "pdf") => {
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return;
    const scene = buildScene(project, ctx);
    const fileBase = `PageFree-${project.name.replace(/\s+/g, "_")}-Artwork`;

    if (format === "pdf") {
      sceneToPdf(scene, project.name).save(`${fileBase}.pdf`);
      return;
    }
    const url = URL.createObjectURL(new Blob([sceneToSvg(scene)], { type: "image/svg+xml" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileBase}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const issues = useMemo(() => runPreflight(project), [project]);
  const summary = preflightSummary(issues);
  const { width: sizeWCm, height: sizeHCm } = getPrintSizeCm(project.printSize);

  const isSizeB = project.printSize === "Size B (17x23cm)";
  const ratio = isSizeB ? (17 / 23) : (23 / 34);
  const flatW = 280;
  const flatH = Math.round(flatW / ratio);

  return (
    <div className="min-h-screen bg-canvas flex flex-col" id="preview-page-wrapper">

      {/* Navbar */}
      <PageHeader
        onBack={onBackToEditor}
        backLabel="Kembali ke Editor"
        title={project.name}
        subtitle={project.productType}
        className="h-14"
        containerClassName="max-w-none"
        right={
          <div className="flex items-center gap-0.5 bg-stone-100 rounded-md p-0.5" id="mode-toggle">
            {(["3d", "flat"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1 rounded-sm text-xs font-medium transition cursor-pointer ${
                  mode === m
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-500 hover:text-stone-700"
                }`}
              >
                {m === "3d" ? "Tampilan 3D" : "Tampilan Rata"}
              </button>
            ))}
          </div>
        }
      />

      {/* Main split layout */}
      <main className="flex-grow flex flex-col lg:flex-row gap-0" id="preview-main">

        {/* LEFT — Mockup Stage */}
        <div
          className="flex-grow flex items-center justify-center relative overflow-hidden"
          style={{
            background: "radial-gradient(ellipse at 50% 50%, #1c1917 0%, #0c0a09 100%)",
            minHeight: "460px",
          }}
          id="mockup-stage"
        >
          {/* Subtle grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />

          {mode === "3d" ? (
            <ThreeDMockup project={project} />
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.55)" }}
              className="rounded-lg"
            >
              <DesignCanvas project={project} width={flatW} height={flatH} borderRadius={8} />
            </motion.div>
          )}

          {mode === "3d" && (
            <p className="absolute bottom-4 left-0 right-0 text-center text-[10px] text-stone-600">
              Gerakkan kursor di atas desain untuk interaksi 3D
            </p>
          )}
        </div>

        {/* RIGHT — Sidebar */}
        <div className="w-full lg:w-80 bg-white border-l border-stone-200 flex flex-col" id="preview-sidebar">
          <div className="p-5 flex-grow overflow-y-auto space-y-5">

            {/* Project info */}
            <div>
              <h2 className="text-sm font-bold text-stone-900 mb-0.5">{project.name}</h2>
              <p className="text-xs text-stone-400">{project.category} · {project.concept}</p>
            </div>

            {/* Print specs */}
            <div className="p-4 bg-stone-50 rounded-lg border border-stone-200 space-y-2.5">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                Spesifikasi Cetak
              </h3>
              {[
                ["Ukuran", `${project.printSize || "Size A (23x34cm)"} · ${sizeWCm * 10}×${sizeHCm * 10} mm`],
                ["Jenis Kertas", "Bahan Sintetis (ASE)"],
                ["Metode Cetak", project.printMethod || "Embos Foil"],
                ["Layout", project.layoutType || "-"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-center text-xs">
                  <span className="text-stone-400">{label}</span>
                  <span className="text-stone-700 font-semibold text-right max-w-[55%]">{value}</span>
                </div>
              ))}
            </div>

            {/* Cek siap cetak */}
            <div
              id="preflight-card"
              className={`p-4 rounded-lg border space-y-2 ${
                summary.errors > 0
                  ? "bg-rose-50 border-rose-200"
                  : summary.warnings > 0
                    ? "bg-amber-50 border-amber-200"
                    : "bg-emerald-50 border-emerald-200"
              }`}
            >
              <p className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
                {summary.errors > 0 ? (
                  <XCircle className="w-4 h-4 text-rose-600" />
                ) : summary.warnings > 0 ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                )}
                {summary.errors > 0
                  ? `${summary.errors} masalah harus diperbaiki`
                  : summary.warnings > 0
                    ? `${summary.warnings} hal perlu dicek`
                    : "Siap cetak"}
              </p>
              {issues.length > 0 && (
                <ul className="space-y-1.5">
                  {issues.slice(0, 6).map((issue, i) => (
                    <li key={i} className="flex gap-1.5 text-[11px] leading-snug text-stone-700">
                      <span
                        className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${
                          issue.severity === "error" ? "bg-rose-500" : "bg-amber-500"
                        }`}
                      />
                      <span>{issue.message}</span>
                    </li>
                  ))}
                  {issues.length > 6 && (
                    <li className="text-[11px] text-stone-500">dan {issues.length - 6} temuan lain.</li>
                  )}
                </ul>
              )}
              {issues.length === 0 && (
                <p className="text-[11px] text-stone-600">
                  Tidak ada teks di jendela mika, warna sesuai metode cetak, dan semua elemen di dalam margin aman.
                </p>
              )}
            </div>

            {/* AI Slogan */}
            {project.slogan && (
              <div className="p-4 bg-teal-50 border border-teal-100 rounded-xl">
                <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest mb-1.5">
                  Slogan Rekomendasi AI
                </p>
                <p className="text-sm text-stone-700 italic leading-relaxed">
                  &ldquo;{project.slogan}&rdquo;
                </p>
              </div>
            )}

            {/* Material Colors */}
            {project.materialColor && (
              <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Bahan & Tinta</p>
                <div className="flex gap-2">
                  <div className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full h-8 rounded-lg border border-stone-200 shadow-inner"
                      style={{ backgroundColor: project.materialColor }}
                    />
                    <span className="text-[9px] text-stone-400">Dasar</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full h-8 rounded-lg border border-stone-200 shadow-inner"
                      style={{ backgroundColor: project.printMethod === "Embos Foil" ? "#D4AF37" : "#FFFFFF" }}
                    />
                    <span className="text-[9px] text-stone-400">Tinta 1</span>
                  </div>
                  {project.printMethod === "Sablon" && (
                    <div className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full h-8 rounded-lg border border-stone-200 shadow-inner"
                        style={{ backgroundColor: "#111111" }}
                      />
                      <span className="text-[9px] text-stone-400">Tinta 2</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Download Actions */}
          <div className="p-5 border-t border-stone-100 space-y-2.5">
            <Button
              variant="primary"
              size="lg"
              className="w-full rounded-lg shadow-none bg-foil-bright text-ink hover:bg-foil active:bg-foil"
              onClick={() => exportVector("pdf")}
              title="Artwork vektor ukuran asli, tanpa bahan & mika — untuk pembuatan klise"
            >
              <FileText className="w-4 h-4" />
              <span>Unduh PDF Vektor</span>
            </Button>
            <Button variant="secondary" size="lg" className="w-full" onClick={() => exportVector("svg")}>
              <FileCode2 className="w-4 h-4 text-stone-500" />
              <span>Unduh SVG Vektor</span>
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" size="sm" onClick={() => generateHighResFile("png")}>
                <Download className="w-3.5 h-3.5" />
                <span>PNG pratinjau</span>
              </Button>
              <Button variant="secondary" size="sm" onClick={() => generateHighResFile("pdf")}>
                <FileText className="w-3.5 h-3.5 text-rose-400" />
                <span>PDF pratinjau</span>
              </Button>
            </div>
            <p className="text-[10px] leading-snug text-stone-400">
              File vektor berisi artwork saja (teks masih berupa teks Times/Arial; ubah ke kurva di CorelDRAW sebelum
              membuat klise). File pratinjau berupa gambar raster berisi bahan dan mika.
            </p>
            <Button variant="ghost" size="md" className="w-full" onClick={onBackToEditor}>
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Kembali Edit Desain</span>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
