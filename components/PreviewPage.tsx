"use client";

import React, { useState } from "react";
import { DesignProject, CanvasElement } from "../lib/types";
import { ArrowLeft, Download, FileText, Check, ChevronLeft, Image as ImageIcon, Sparkles, Printer } from "lucide-react";

interface PreviewPageProps {
  project: DesignProject;
  onBackToEditor: () => void;
}

export default function PreviewPage({ project, onBackToEditor }: PreviewPageProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [mockupMode, setMockupMode] = useState<"flat" | "3d">("3d");

  // Custom vector drawing onto Canvas context for premium high-res PNG download compatibility!
  const drawVectorIconOnCanvas = (ctx: CanvasRenderingContext2D, icon: string, x: number, y: number, size: number, color: string) => {
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.04;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    ctx.translate(x, y);

    switch (icon) {
      case "sparkles":
        // Draw elegant 4-sided stars
        ctx.beginPath();
        ctx.moveTo(size / 2, 0);
        ctx.quadraticCurveTo(size / 2, size / 2, size, size / 2);
        ctx.quadraticCurveTo(size / 2, size / 2, size / 2, size);
        ctx.quadraticCurveTo(size / 2, size / 2, 0, size / 2);
        ctx.quadraticCurveTo(size / 2, size / 2, size / 2, 0);
        ctx.closePath();
        ctx.fill();

        // Plus smaller side sparkle
        ctx.beginPath();
        ctx.arc(size * 0.25, size * 0.25, size * 0.08, 0, Math.PI * 2);
        ctx.fill();
        break;

      case "mortarboard":
        // Diamond head hat
        ctx.beginPath();
        ctx.moveTo(size * 0.5, size * 0.15);
        ctx.lineTo(size * 0.9, size * 0.35);
        ctx.lineTo(size * 0.5, size * 0.55);
        ctx.lineTo(size * 0.1, size * 0.35);
        ctx.closePath();
        ctx.fill();

        // Hat body folder base
        ctx.beginPath();
        ctx.moveTo(size * 0.25, size * 0.48);
        ctx.lineTo(size * 0.25, size * 0.75);
        ctx.quadraticCurveTo(size * 0.5, size * 0.88, size * 0.75, size * 0.75);
        ctx.lineTo(size * 0.75, size * 0.48);
        ctx.lineTo(size * 0.5, size * 0.60);
        ctx.closePath();
        ctx.fill();
        break;

      case "building":
        ctx.beginPath();
        ctx.rect(size * 0.2, size * 0.3, size * 0.6, size * 0.6);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(size * 0.1, size * 0.9);
        ctx.lineTo(size * 0.9, size * 0.9);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(size * 0.5, size * 0.1);
        ctx.lineTo(size * 0.2, size * 0.3);
        ctx.lineTo(size * 0.8, size * 0.3);
        ctx.closePath();
        ctx.fill();
        break;

      case "leaf":
        ctx.beginPath();
        ctx.moveTo(size * 0.15, size * 0.9);
        ctx.quadraticCurveTo(size * 0.35, size * 0.4, size * 0.85, size * 0.15);
        ctx.quadraticCurveTo(size * 0.8, size * 0.5, size * 0.5, size * 0.75);
        ctx.quadraticCurveTo(size * 0.3, size * 0.92, size * 0.15, size * 0.9);
        ctx.closePath();
        ctx.fill();
        break;

      case "shield":
        ctx.beginPath();
        ctx.moveTo(size * 0.5, size * 0.1);
        ctx.quadraticCurveTo(size * 0.7, size * 0.1, size * 0.85, size * 0.18);
        ctx.quadraticCurveTo(size * 0.85, size * 0.55, size * 0.5, size * 0.85);
        ctx.quadraticCurveTo(size * 0.15, size * 0.55, size * 0.15, size * 0.18);
        ctx.quadraticCurveTo(size * 0.3, size * 0.1, size * 0.5, size * 0.1);
        ctx.closePath();
        ctx.fill();
        break;

      default:
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size * 0.4, 0, Math.PI * 2);
        ctx.fill();
        break;
    }

    ctx.restore();
  };

  const generateHighResFile = (format: "png" | "pdf") => {
    const isCard = project.productType === "Kartu Nama";
    // Set 2x canvas dimensions for ultra high-fidelity crisp outputs
    const scaleFactor = 2; 
    const baseW = isCard ? 900 : 800;
    const baseH = isCard ? 540 : 1130;
    const canvasW = baseW * scaleFactor;
    const canvasH = baseH * scaleFactor;

    const canvas = document.createElement("canvas");
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw print-ready rich solid background
    ctx.fillStyle = project.backgroundColor || "#ffffff";
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Sort layers
    const sorted = [...project.elements].sort((a, b) => a.zIndex - b.zIndex);

    sorted.forEach((el) => {
      ctx.save();

      // Convert percentage coordinates into high-res pixels
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
          ctx.strokeStyle = el.color || "#1E293B";
          ctx.lineWidth = (el.height || 3) * scaleFactor;
          ctx.beginPath();
          ctx.moveTo(drawX, drawY);
          ctx.lineTo(drawX + drawW, drawY);
          ctx.stroke();
        } else {
          // rectangular
          ctx.fillRect(drawX, drawY, drawW, drawH);
        }
      } else if (el.type === "logo") {
        drawVectorIconOnCanvas(ctx, el.logoIcon || "sparkles", drawX, drawY, drawW, el.color || "#3b82f6");
      } else if (el.type === "text" && el.text) {
        // Draw crisp wrapped text block
        const scaledFont = (el.fontSize || 14) * 1.5 * scaleFactor;
        const font = el.fontFamily || "Inter";
        const weight = el.fontWeight || "normal";
        ctx.font = `${weight} ${scaledFont}px ${font}, sans-serif`;
        ctx.fillStyle = el.color || "#111827";
        ctx.textAlign = el.align || "left";
        ctx.textBaseline = "top";

        let textX = drawX;
        if (el.align === "center") {
          textX = drawX + drawW / 2;
        } else if (el.align === "right") {
          textX = drawX + drawW;
        }

        // Draw basic lines on canvas
        ctx.fillText(el.text, textX, drawY);
      }

      ctx.restore();
    });

    if (format === "png") {
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.download = `PageFree-${project.name.replace(/\s+/g, "_")}-${project.productType.replace(/\s+/g, "")}.png`;
      a.href = dataUrl;
      a.click();
    } else {
      // Trigger browser basic print option to save as PDF
      window.print();
    }
  };

  const handleShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const isCard = project.productType === "Kartu Nama";

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col" id="preview-page-wrapper">
      {/* Navbar Title header */}
      <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0 z-10" id="preview-header">
        <button
          onClick={onBackToEditor}
          className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Kembali ke Editor</span>
        </button>

        <div className="flex items-center gap-1">
          <span className="text-sm font-extrabold text-slate-800">Mockup Presentasi</span>
          <span className="hidden sm:inline text-[9px] bg-emerald-50 text-emerald-700 font-mono font-bold px-2 py-0.5 rounded-md border border-emerald-100 uppercase uppercase">
            Ready to Print CMYK
          </span>
        </div>

        <div className="flex items-center gap-2" id="preview-actions">
          <button
            onClick={handleShareLink}
            className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl cursor-pointer shadow-sm"
          >
            {copiedLink ? "Link Disalin! ✓" : "Salin Link Proyek"}
          </button>
        </div>
      </header>

      {/* Main Preview stage split view */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow grid lg:grid-cols-12 gap-8 w-full" id="split-mockup-workspace">
        
        {/* LEFT COLUMN: The actual mockup rendering with solid shadow */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center bg-slate-950 rounded-2xl relative p-8 h-[550px] overflow-hidden border border-slate-800/80 shadow-2xl" id="mockup-display-plate">
          {/* Background overlay aesthetic */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(30,58,138,0.2),transparent_75%)]" />
          
          <div className="absolute top-4 left-4 flex gap-1.5" id="view-mode-toggle">
            <button
              onClick={() => setMockupMode("flat")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase transition cursor-pointer ${
                mockupMode === "flat"
                  ? "bg-slate-800 text-white border border-slate-700"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Rata (Flat)
            </button>
            <button
              onClick={() => setMockupMode("3d")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase transition cursor-pointer ${
                mockupMode === "3d"
                  ? "bg-slate-800 text-white border border-slate-700"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              3D Presentasi
            </button>
          </div>

          <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] text-slate-500 font-mono">
            <Sparkles className="w-3 h-3 text-blue-400" />
            <span>Interactive Live Mockup</span>
          </div>

          {/* Interactive display base on 3D or flat state */}
          <div
            className={`transition-all duration-500 transform ${
              mockupMode === "3d"
                ? isCard
                  ? "rotate-x-[15deg] rotate-y-[-18deg] rotate-z-[6deg] hover:scale-105 shadow-[25px_30px_70px_rgba(0,0,0,0.7)]"
                  : "rotate-x-[12deg] rotate-y-[-10deg] hover:scale-103 shadow-[20px_25px_60px_rgba(0,0,0,0.6)]"
                : "shadow-xl border border-white/10"
            }`}
            style={{
              width: isCard ? "460px" : "330px",
              height: isCard ? "276px" : "467px",
              backgroundColor: project.backgroundColor || "#ffffff",
              borderRadius: isCard ? "14px" : "8px",
              overflow: "hidden",
              position: "relative"
            }}
            id="mockup-item"
          >
            {/* Glossy lighting effect overlay on top of item */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(135deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_50%,rgba(0,0,0,0.05)_100%)] z-10" />

            <svg className="absolute inset-0 w-full h-full">
              {project.elements.map((el) => {
                const elementX = `${el.x}%`;
                const elementY = `${el.y}%`;
                const elementW = `${el.width}%`;
                const elementH = `${el.height}%`;

                return (
                  <g key={el.id}>
                    {/* Render Shapes */}
                    {el.type === "shape" && (
                      <g>
                        {el.shapeType === "rectangle" && (
                          <rect
                            x={elementX}
                            y={elementY}
                            width={elementW}
                            height={elementH}
                            fill={el.color || "#cccccc"}
                          />
                        )}
                        {el.shapeType === "circle" && (
                          <circle
                            cx={`${el.x + el.width / 2}%`}
                            cy={`${el.y + el.width / 2}%`}
                            r={`${el.width / 2}%`}
                            fill={el.color || "#cccccc"}
                          />
                        )}
                        {el.shapeType === "line" && (
                          <line
                            x1={elementX}
                            y1={elementY}
                            x2={`${el.x + el.width}%`}
                            y2={elementY}
                            stroke={el.color || "#000000"}
                            strokeWidth={el.height || 3}
                          />
                        )}
                      </g>
                    )}

                    {/* Render Icons */}
                    {el.type === "logo" && (
                      <svg
                        x={elementX}
                        y={elementY}
                        width={elementW}
                        height={elementH}
                        viewBox="0 0 100 100"
                        preserveAspectRatio="xMidYMid meet"
                      >
                        {el.logoIcon === "sparkles" && (
                          <path
                            fill={el.color || "#000000"}
                            d="M50,0 L57,37 L94,44 L57,51 L50,88 L43,51 L6,44 L43,37 Z M25,12 L28,21 L37,23 L28,25 L25,34 L22,25 L13,23 L22,21 Z"
                          />
                        )}
                        {el.logoIcon === "mortarboard" && (
                          <g fill={el.color || "#000000"}>
                            <polygon points="50,15 90,35 50,55 10,35" />
                            <polygon points="25,48 25,75 50,88 75,75 75,48 50,60" />
                            <polygon points="85,35 85,65 89,68 89,37" />
                          </g>
                        )}
                        {el.logoIcon === "building" && (
                          <path
                            fill={el.color || "#000000"}
                            d="M10,90 L90,90 M20,90 L20,30 L50,10 L80,30 L80,90 M30,40 L40,40 M30,55 L40,55 M30,70 L40,70 M60,40 L70,40 M60,55 L70,55 M60,70 L70,70"
                            stroke={el.color || "#000000"}
                            strokeWidth="4"
                          />
                        )}
                        {el.logoIcon === "leaf" && (
                          <path
                            fill={el.color || "#000000"}
                            d="M15,90 C15,90 35,40 85,15 C85,15 80,50 50,75 C30,92 15,90 15,90 M15,90 L40,65"
                            stroke={el.color || "#000000"}
                            strokeWidth="3"
                          />
                        )}
                        {el.logoIcon === "shield" && (
                          <path
                            fill={el.color || "#000000"}
                            d="M50,10 C70,10 85,18 85,18 C85,18 85,55 50,85 C15,55 15,18 15,18 C15,18 30,10 50,10 Z"
                          />
                        )}
                      </svg>
                    )}

                    {/* Render Text element */}
                    {el.type === "text" && el.text && (
                      <svg
                        x={elementX}
                        y={elementY}
                        width={elementW}
                        height={elementH}
                        viewBox={`0 0 ${el.width * 10} ${el.height * 10}`}
                        preserveAspectRatio="xMidYMid meet"
                      >
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
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* RIGHT COLUMN: Print specs and high-fidelity download buttons */}
        <div className="lg:col-span-4 space-y-6" id="preview-panel-sidebar">
          
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-950 font-display-space">Rincian Teknis Cetak</h3>
              <p className="text-xs text-slate-400 mt-1">Estimasi berat dan dimensi standar industri</p>
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Skala Desain:</span>
                <strong className="text-slate-800 font-bold">{isCard ? "90 x 55 mm" : "A4 (210 x 297 mm)"}</strong>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Rekomendasi Kertas:</span>
                <strong className="text-slate-800 font-bold">{isCard ? "Art Carton 260gsm" : "Laminating Glossy / Doff 310g"}</strong>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Sistem Warna:</span>
                <strong className="text-slate-800 font-bold">Standard CMYK (Ready to Print)</strong>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Nama Konsep:</span>
                <strong className="text-slate-800 font-bold">{project.concept}</strong>
              </div>
            </div>
          </div>

          {/* Download Operations panel */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-3 block">Unduh File Desain</h4>
            
            <button
              onClick={() => generateHighResFile("png")}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-100"
            >
              <Download className="w-4 h-4" />
              <span>Unduh PNG Resolusi Tinggi (Ultra HD)</span>
            </button>

            <button
              onClick={() => generateHighResFile("pdf")}
              className="w-full py-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-rose-500" />
              <span>Simpan sebagai Cetak PDF (Browser Print)</span>
            </button>

            <button
              onClick={onBackToEditor}
              className="w-full py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer mt-2"
            >
              <span>Ubah Elemen / Kembali Edit</span>
            </button>
          </div>

          {/* Slogan metadata */}
          <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl">
            <span className="text-[10px] text-blue-700 font-bold uppercase block mb-1">Tagline Promosi Rekomendasi AI</span>
            <p className="text-xs italic text-slate-600">&ldquo;{project.slogan || "Terdepan & Terpercaya di Seluruh Indonesia"}&rdquo;</p>
          </div>
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-slate-400 font-mono">
        Rekomendasi Ekspor Studio Engine PT Indonesia &bull; 2026
      </footer>
    </div>
  );
}
