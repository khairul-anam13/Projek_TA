"use client";

import React, { useState, useRef, useEffect } from "react";
import { DesignProject } from "../lib/types";
import { ArrowLeft, Download, FileText, ChevronLeft, RotateCcw } from "lucide-react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";

interface PreviewPageProps {
  project: DesignProject;
  onBackToEditor: () => void;
}

/** Render satu elemen SVG dari data CanvasElement */
function SvgElement({ el }: { el: DesignProject["elements"][number] }) {
  const ex = `${el.x}%`;
  const ey = `${el.y}%`;
  const ew = `${el.width}%`;
  const eh = `${el.height}%`;

  if (el.type === "shape") {
    if (el.shapeType === "rectangle") {
      return <rect x={ex} y={ey} width={ew} height={eh} fill={el.color || "#cccccc"} />;
    }
    if (el.shapeType === "circle") {
      return (
        <circle
          cx={`${el.x + el.width / 2}%`}
          cy={`${el.y + el.width / 2}%`}
          r={`${el.width / 2}%`}
          fill={el.color || "#cccccc"}
        />
      );
    }
    if (el.shapeType === "line") {
      return (
        <line
          x1={ex} y1={ey}
          x2={`${el.x + el.width}%`} y2={ey}
          stroke={el.color || "#000"}
          strokeWidth={el.height || 2}
        />
      );
    }
  }

  if (el.type === "logo") {
    const iconPaths: Record<string, React.ReactNode> = {
      sparkles: (
        <path fill={el.color || "#000"} d="M50,0 L57,37 L94,44 L57,51 L50,88 L43,51 L6,44 L43,37 Z M25,12 L28,21 L37,23 L28,25 L25,34 L22,25 L13,23 L22,21 Z" />
      ),
      mortarboard: (
        <g fill={el.color || "#000"}>
          <polygon points="50,15 90,35 50,55 10,35" />
          <polygon points="25,48 25,75 50,88 75,75 75,48 50,60" />
          <polygon points="85,35 85,65 89,68 89,37" />
        </g>
      ),
      shield: (
        <path fill={el.color || "#000"} d="M50,10 C70,10 85,18 85,18 C85,18 85,55 50,85 C15,55 15,18 15,18 C15,18 30,10 50,10 Z" />
      ),
      leaf: (
        <path fill={el.color || "#000"} d="M15,90 C15,90 35,40 85,15 C85,15 80,50 50,75 C30,92 15,90 15,90 Z" />
      ),
    };
    return (
      <svg x={ex} y={ey} width={ew} height={eh} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        {iconPaths[el.logoIcon ?? ""] ?? <circle cx="50" cy="50" r="40" fill={el.color || "#000"} />}
      </svg>
    );
  }

  if (el.type === "text" && el.text) {
    return (
      <svg x={ex} y={ey} width={ew} height={eh} viewBox={`0 0 ${el.width * 10} ${el.height * 10}`} preserveAspectRatio="xMidYMid meet" overflow="visible">
        <text
          x={el.align === "center" ? "50%" : el.align === "right" ? "100%" : "0%"}
          y="50%"
          dominantBaseline="middle"
          textAnchor={el.align === "center" ? "middle" : el.align === "right" ? "end" : "start"}
          fill={el.color || "#0F172A"}
          fontSize={el.fontSize ? el.fontSize * 1.5 : 14}
          fontFamily={el.fontFamily || "Inter"}
          fontWeight={el.fontWeight || "normal"}
        >
          {el.text}
        </text>
      </svg>
    );
  }

  if (el.type === "custom_svg" && el.customSvg) {
    return (
      <g dangerouslySetInnerHTML={{ 
        __html: el.customSvg
          .replace(/fill="[^"]*"/g, `fill="${el.color || '#000000'}"`)
          .replace(/<svg([^>]*)>/, (match, p1) => {
            let attrs = p1.replace(/\s(x|y|width|height)="[^"]*"/g, '');
            if (!attrs.includes("preserveAspectRatio")) {
              attrs += ' preserveAspectRatio="xMidYMid meet"';
            }
            return `<svg x="${el.x}%" y="${el.y}%" width="${el.width}%" height="${el.height}%" ${attrs} overflow="visible">`;
          })
      }} />
    );
  }

  if (el.type === "image" && el.imageUrl) {
    return (
      <image x={ex} y={ey} width={ew} height={eh} href={el.imageUrl} preserveAspectRatio="none" />
    );
  }

  return null;
}

/** Kanvas desain SVG yang bisa digunakan di flat dan 3D view */
function DesignCanvas({ project, width, height, borderRadius = 8, isExport = false }: {
  project: DesignProject;
  width: number;
  height: number;
  borderRadius?: number;
  isExport?: boolean;
}) {
  const sorted = [...project.elements].sort((a, b) => a.zIndex - b.zIndex);
  const isSizeB = project.printSize === "Size B (17x23cm)";
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: project.materialColor || project.backgroundColor || "#ffffff",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Subtle gloss overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 55%, rgba(0,0,0,0.04) 100%)",
        }}
      />
      
      {/* Tekstur Bahan SVG Overlay */}
      <svg className="absolute inset-0 pointer-events-none w-full h-full opacity-60 mix-blend-multiply" style={{ zIndex: 11 }}>
        <filter id="leather-texture-preview">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" result="noise" />
          <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0   0 0 0 0.3 0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#leather-texture-preview)" />
      </svg>

      <svg className="absolute inset-0 w-full h-full" aria-hidden="true" style={{zIndex: 20}}>
        {sorted.map((el) => (
          <SvgElement key={el.id} el={el} />
        ))}
        {!isExport && (
          <image
            href="/mika-nama.png"
            x={isSizeB ? '11.76%' : '21.73%'}
            y={isSizeB ? '50%' : '66.17%'}
            width={isSizeB ? '76.47%' : '56.52%'}
            height={isSizeB ? '19.56%' : '13.23%'}
            preserveAspectRatio="none"
            pointerEvents="none"
          />
        )}
      </svg>
    </div>
  );
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
          ctx.arc(drawX + drawW / 2, drawY + drawW / 2, drawW / 2, 0, Math.PI * 2);
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
        const sz = (el.fontSize || 14) * 1.5 * scaleFactor;
        ctx.font = `${el.fontWeight || "normal"} ${sz}px ${el.fontFamily || "sans-serif"}`;
        ctx.fillStyle = el.color || "#000";
        ctx.textAlign = el.align || "left";
        ctx.textBaseline = "top";
        const tx = el.align === "center" ? drawX + drawW / 2 : el.align === "right" ? drawX + drawW : drawX;
        ctx.fillText(el.text, tx, drawY);
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
      } else if (el.type === "custom_svg" && el.customSvg) {
        let str = el.customSvg.replace(/fill="[^"]*"/g, `fill="${el.color || '#000000'}"`);
        str = str.replace(/<svg([^>]*)>/, (match, p1) => {
          let attrs = p1.replace(/\s(x|y|width|height)="[^"]*"/g, '');
          if (!attrs.includes("preserveAspectRatio")) {
            attrs += ' preserveAspectRatio="xMidYMid meet"';
          }
          return `<svg width="${drawW}" height="${drawH}" ${attrs}>`;
        });
        
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, drawX, drawY, drawW, drawH);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(str)}`;
        });
      }
      ctx.restore();
    }

    if (format === "png") {
      const a = document.createElement("a");
      a.download = `PageFree-${project.name.replace(/\s+/g, "_")}-SampulRapor.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    } else {
      window.print();
    }
  };

  const isSizeB = project.printSize === "Size B (17x23cm)";
  const ratio = isSizeB ? (17 / 23) : (23 / 34);
  const flatW = 280;
  const flatH = Math.round(flatW / ratio);

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col" id="preview-page-wrapper">

      {/* Navbar */}
      <header className="bg-white border-b border-stone-200 h-14 flex items-center justify-between px-5 shrink-0 z-10" id="preview-header">
        <button
          onClick={onBackToEditor}
          className="flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900 cursor-pointer transition"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Kembali ke Editor</span>
        </button>

        <div className="flex items-center gap-1.5 bg-stone-100 rounded-lg p-1" id="mode-toggle">
          {(["3d", "flat"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                mode === m
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {m === "3d" ? "Tampilan 3D" : "Tampilan Rata"}
            </button>
          ))}
        </div>

        <div className="text-right hidden sm:block">
          <p className="text-xs font-bold text-stone-800">{project.name}</p>
          <p className="text-[10px] text-stone-400">{project.productType}</p>
        </div>
      </header>

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
            <p className="absolute bottom-4 left-0 right-0 text-center text-[10px] text-stone-600 font-mono">
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
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2.5">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                Spesifikasi Cetak
              </h3>
              {[
                ["Ukuran", project.printSize || "Size A (23x34cm)"],
                ["Jenis Kertas", "Bahan Sintetis (ASE)"],
                ["Metode Cetak", project.printMethod || "Embos Foil"],
                ["Konsep", project.concept],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-center text-xs">
                  <span className="text-stone-400">{label}</span>
                  <span className="text-stone-700 font-semibold text-right max-w-[55%]">{value}</span>
                </div>
              ))}
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
                    <span className="text-[9px] font-mono text-stone-400">Dasar</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full h-8 rounded-lg border border-stone-200 shadow-inner"
                      style={{ backgroundColor: project.printMethod === "Embos Foil" ? "#D4AF37" : "#FFFFFF" }}
                    />
                    <span className="text-[9px] font-mono text-stone-400">Tinta 1</span>
                  </div>
                  {project.printMethod === "Sablon" && (
                    <div className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full h-8 rounded-lg border border-stone-200 shadow-inner"
                        style={{ backgroundColor: "#111111" }}
                      />
                      <span className="text-[9px] font-mono text-stone-400">Tinta 2</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Download Actions */}
          <div className="p-5 border-t border-stone-100 space-y-2.5">
            <button
              onClick={() => generateHighResFile("png")}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer shadow-sm transition"
            >
              <Download className="w-4 h-4" />
              <span>Unduh PNG (Resolusi Tinggi)</span>
            </button>
            <button
              onClick={() => generateHighResFile("pdf")}
              className="w-full py-3 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 font-semibold rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <FileText className="w-4 h-4 text-rose-400" />
              <span>Simpan sebagai PDF</span>
            </button>
            <button
              onClick={onBackToEditor}
              className="w-full py-2.5 text-stone-400 hover:text-stone-700 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Kembali Edit Desain</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
