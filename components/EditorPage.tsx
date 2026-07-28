"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { CanvasElement, DesignProject } from "../lib/types";
import {
  clampToCanvas,
  getCenteredX,
  applySnap,
  enforceMikaConstraint,
  getCardRatio,
  computeImageImportSize,
} from "../lib/canvasConstraints";
import {
  Undo,
  Redo,
  Save,
  Square,
  Sparkles,
  Layers,
  Trash2,
  BringToFront,
  SendToBack,
  Copy,
  ChevronLeft,
  Palette,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Minus,
  Grid,
  MousePointer2,
  Circle,
  Type as TypeIcon,
  Image as ImageIcon,
  Wand2,
  Download,
  Lock,
  Unlock,
} from "lucide-react";
import ImageToVectorConverter from "./ImageToVectorConverter";
import { Button, IconButton, Card } from "@/components/ui";
import { cn } from "@/lib/utils";

interface EditorPageProps {
  project: DesignProject;
  onBackToDashboard: () => void;
  onSaveProject: (updatedProject: DesignProject) => void;
  onExport: (project: DesignProject) => void;
}

const PRESET_FONTS = [
  { name: "Times New Roman", label: "Times New Roman (Serif Utama)" },
  { name: "Arial", label: "Arial (Tebal / Sans-Serif)" },
];

const MATERIAL_COLORS = [
  { name: "Maroon", hex: "#800000" },
  { name: "Navy", hex: "#000080" },
  { name: "Biru Muda Agak Tua", hex: "#4682B4" },
  { name: "Hijau Tua", hex: "#006400" },
  { name: "Hijau Botol", hex: "#004225" },
  { name: "Hitam Abu (Soft)", hex: "#2C2C2C" }
];

const fieldClass =
  "bg-white border border-stone-200 rounded-lg px-2 py-1.5 text-xs text-stone-700 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}`;
}

function renderLogoSvg(icon: string, color: string) {
  switch (icon) {
    case "sparkles":
      return <path fill={color} d="M50,0 L57,37 L94,44 L57,51 L50,88 L43,51 L6,44 L43,37 Z M25,12 L28,21 L37,23 L28,25 L25,34 L22,25 L13,23 L22,21 Z" />;
    case "mortarboard":
      return <g fill={color}><polygon points="50,15 90,35 50,55 10,35" /><polygon points="25,48 25,75 50,88 75,75 75,48 50,60" /><polygon points="85,35 85,65 89,68 89,37" /></g>;
    case "shield":
      return <path fill={color} d="M50,10 C70,10 85,18 85,18 C85,18 85,55 50,85 C15,55 15,18 15,18 C15,18 30,10 50,10 Z" />;
    case "leaf":
      return <path fill={color} d="M15,90 C15,90 35,40 85,15 C85,15 80,50 50,75 C30,92 15,90 15,90 Z" />;
    case "building":
      return <path fill={color} stroke={color} strokeWidth="4" strokeLinecap="round" d="M10,90 L90,90 M20,90 L20,30 L50,10 L80,30 L80,90 M30,40 L40,40 M30,55 L40,55 M60,40 L70,40 M60,55 L70,55" />;
    default:
      return <circle cx="50" cy="50" r="40" fill={color} />;
  }
}

export default function EditorPage({
  project: initialProject,
  onBackToDashboard,
  onSaveProject,
  onExport,
}: EditorPageProps) {
  const [project, setProject] = useState<DesignProject>(initialProject);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [history, setHistory] = useState<CanvasElement[][]>([initialProject.elements]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [activeGuides, setActiveGuides] = useState<{ type: "v" | "h"; value: number }[]>([]);

  // Docker panel tabs
  const [activeDocker, setActiveDocker] = useState<"properties" | "elements">("properties");
  const [showVectorConverter, setShowVectorConverter] = useState(false);

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, elX: 0, elY: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  }, []);

  const pushHistory = useCallback((elements: CanvasElement[]) => {
    setHistory((h) => {
      const next = h.slice(0, historyIndex + 1);
      return [...next, elements];
    });
    setHistoryIndex((i) => i + 1);
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prev = historyIndex - 1;
      setHistoryIndex(prev);
      setProject((p) => ({ ...p, elements: history[prev] }));
      setSelectedId(null);
      toast("Undo");
    }
  }, [historyIndex, history, toast]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const next = historyIndex + 1;
      setHistoryIndex(next);
      setProject((p) => ({ ...p, elements: history[next] }));
      setSelectedId(null);
      toast("Redo");
    }
  }, [historyIndex, history, toast]);

  const updateElement = useCallback((id: string, updates: Partial<CanvasElement>) => {
    setProject((p) => {
      const next = p.elements.map((el) => (el.id === id ? { ...el, ...updates } : el));
      return { ...p, elements: next };
    });
  }, []);

  const commitUpdate = useCallback((id: string, updates: Partial<CanvasElement>) => {
    setProject((p) => {
      const next = p.elements.map((el) => (el.id === id ? { ...el, ...updates } : el));
      pushHistory(next);
      return { ...p, elements: next };
    });
  }, [pushHistory]);

  const addElement = useCallback((type: "text" | "shape" | "logo" | "custom_svg" | "image", props: Partial<CanvasElement>) => {
    const id = generateId("el");
    const zIndex = Math.max(0, ...project.elements.map((e) => e.zIndex)) + 1;

    let defaultColor = project.printMethod === "Embos Foil" ? "#D4AF37" : "#FFFFFF";
    let defaultFont = props.fontFamily || "Times New Roman";
    let defaultWeight: "normal"|"bold"|"medium" = defaultFont === "Arial" ? "bold" : "normal";

    if (props.fontWeight) defaultWeight = props.fontWeight;

    const w = props.width ?? (type === "text" ? 80 : 25);
    const newEl: CanvasElement = {
      id, type, x: 50 - (w / 2), y: 40,
      width: w,
      height: type === "text" ? 8 : 25,
      zIndex,
      fontFamily: defaultFont,
      fontWeight: defaultWeight,
      color: defaultColor,
      align: type === "text" ? "center" : undefined,
      isLockedX: true,
      ...props,
    };
    const next = [...project.elements, newEl];
    setProject((p) => ({ ...p, elements: next }));
    setSelectedId(id);
    pushHistory(next);
  }, [project.elements, pushHistory, project.printMethod]);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    const next = project.elements.filter((e) => e.id !== selectedId);
    setProject((p) => ({ ...p, elements: next }));
    setSelectedId(null);
    pushHistory(next);
  }, [selectedId, project.elements, pushHistory]);

  const duplicateSelected = useCallback(() => {
    const el = project.elements.find((e) => e.id === selectedId);
    if (!el) return;
    const newId = generateId("el");
    const newZ = Math.max(0, ...project.elements.map((e) => e.zIndex)) + 1;
    const dup: CanvasElement = { ...el, id: newId, x: Math.min(el.x + 5, 80), y: Math.min(el.y + 5, 80), zIndex: newZ };
    const next = [...project.elements, dup];
    setProject((p) => ({ ...p, elements: next }));
    setSelectedId(newId);
    pushHistory(next);
  }, [selectedId, project.elements, pushHistory]);

  const changeLayer = useCallback((dir: "front" | "back") => {
    if (!selectedId) return;
    const newZ = dir === "front"
      ? Math.max(0, ...project.elements.map((e) => e.zIndex)) + 1
      : Math.min(0, ...project.elements.map((e) => e.zIndex)) - 1;
    commitUpdate(selectedId, { zIndex: newZ });
  }, [selectedId, project.elements, commitUpdate]);

  const alignSelected = useCallback((type: "centerX" | "centerY" | "left" | "right") => {
    if (!selectedId) return;
    const el = project.elements.find((e) => e.id === selectedId);
    if (!el) return;
    const updates: Partial<CanvasElement> = {};
    if (type === "centerX") updates.x = parseFloat((50 - el.width / 2).toFixed(2));
    if (type === "centerY") updates.y = parseFloat((50 - el.height / 2).toFixed(2));
    if (type === "left") updates.x = 5;
    if (type === "right") updates.x = parseFloat((95 - el.width).toFixed(2));
    commitUpdate(selectedId, updates);
  }, [selectedId, project.elements, commitUpdate]);

  const handleImageImport = useCallback((file: File) => {
    if (!file.type.startsWith('image/') && !file.name.endsWith('.svg')) {
      toast("Format file tidak didukung! Hanya JPG/PNG/SVG.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        // Batas impor maks. 30% lebar dan 40% tinggi kanvas agar proporsional
        const cardRatio = getCardRatio(project.printSize);
        const { width: w, height: h } = computeImageImportSize(img.width, img.height, cardRatio);

        addElement('image', { imageUrl: dataUrl, width: w, height: h });
        toast("Gambar berhasil diimpor");
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, [addElement, toast, project.printSize]);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageImport(e.dataTransfer.files[0]);
    }
  }, [handleImageImport]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const el = project.elements.find((x) => x.id === id);
    if (!el) return;
    setSelectedId(id);
    setActiveDocker("properties");
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY, elX: el.x, elY: el.y };
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !selectedId || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      if (!rect.width) return;

      const dx = ((e.clientX - dragStartRef.current.x) / rect.width) * 100 / zoom;
      const dy = ((e.clientY - dragStartRef.current.y) / rect.height) * 100 / zoom;

      let tx = clampToCanvas(dragStartRef.current.elX + dx);
      let ty = clampToCanvas(dragStartRef.current.elY + dy);

      const elTypeObj = project.elements.find((e) => e.id === selectedId);
      if (elTypeObj?.isLockedX) {
        tx = getCenteredX(elTypeObj.width);
      }

      const snapped = applySnap(tx, ty);
      tx = snapped.x;
      ty = snapped.y;

      // Constraint Zona Mika: elemen teks tidak boleh di Y 50-80
      ty = enforceMikaConstraint(elTypeObj?.type, ty);

      setActiveGuides(snapped.guides);
      setProject((p) => ({
        ...p,
        elements: p.elements.map((el) =>
          el.id === selectedId
            ? { ...el, x: parseFloat(tx.toFixed(2)), y: parseFloat(ty.toFixed(2)) }
            : el
        ),
      }));
    };

    const onUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setActiveGuides([]);
        setProject((p) => { pushHistory(p.elements); return p; });
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [selectedId, zoom, pushHistory]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;

      if (e.ctrlKey && e.key === "z") { e.preventDefault(); handleUndo(); return; }
      if (e.ctrlKey && e.key === "y") { e.preventDefault(); handleRedo(); return; }
      if (e.ctrlKey && e.key === "d") { e.preventDefault(); duplicateSelected(); return; }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) { e.preventDefault(); deleteSelected(); return; }

      if (!selectedId) return;
      const el = project.elements.find((x) => x.id === selectedId);
      const step = e.shiftKey ? 5 : 1;
      const move: Record<string, Partial<CanvasElement>> = {
        ArrowUp: { y: Math.max(0, (el?.y ?? 0) - step) },
        ArrowDown: { y: Math.min(95, (el?.y ?? 0) + step) },
      };

      if (!el?.isLockedX) {
        move.ArrowLeft = { x: Math.max(0, (el?.x ?? 0) - step) };
        move.ArrowRight = { x: Math.min(95, (el?.x ?? 0) + step) };
      }

      if (move[e.key]) { e.preventDefault(); updateElement(selectedId, move[e.key]); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, handleUndo, handleRedo, duplicateSelected, deleteSelected, updateElement, project.elements]);


  const selectedEl = project.elements.find((e) => e.id === selectedId);
  const isSizeB = project.printSize === "Size B (17x23cm)";
  const ratio = isSizeB ? (17 / 23) : (23 / 34);
  const canvasW = 400 * zoom;
  const canvasH = Math.round(canvasW / ratio);

  const handleColorClick = (hex: string) => {
    if (selectedEl) {
      commitUpdate(selectedEl.id, { color: hex });
    } else {
      setProject((p) => ({ ...p, backgroundColor: hex }));
    }
  };

  return (
    <div className="h-screen bg-canvas flex flex-col overflow-hidden font-sans text-[13px] text-stone-800 select-none">

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-lg pointer-events-none">
          {toastMsg}
        </div>
      )}

      {/* ─── TOP BAR ──────────────────────────────────────────────────── */}
      <header className="h-14 bg-white border-b border-stone-200 flex items-center px-3 gap-1.5 shrink-0 z-30">
        <IconButton onClick={onBackToDashboard} title="Kembali ke Dashboard">
          <ChevronLeft size={18} />
        </IconButton>

        <div className="flex items-center gap-2 min-w-0 mr-1 pl-1">
          <div className="w-7 h-7 rounded-lg overflow-hidden shadow-sm shrink-0">
            <img src="/pagefree.png" alt="Page Free" className="w-full h-full object-cover bg-white" />
          </div>
          <span className="text-sm font-bold text-stone-800 truncate max-w-[180px]" title={project.name}>
            {project.name}
          </span>
        </div>

        <div className="w-px h-6 bg-stone-200 mx-1" />

        <IconButton onClick={handleUndo} disabled={historyIndex === 0} title="Undo (Ctrl+Z)">
          <Undo size={16} />
        </IconButton>
        <IconButton onClick={handleRedo} disabled={historyIndex >= history.length - 1} title="Redo (Ctrl+Y)">
          <Redo size={16} />
        </IconButton>

        <div className="w-px h-6 bg-stone-200 mx-1" />

        <select
          value={zoom}
          onChange={(e) => setZoom(parseFloat(e.target.value))}
          className={cn(fieldClass, "w-20")}
        >
          <option value={0.5}>50%</option>
          <option value={0.75}>75%</option>
          <option value={1}>100%</option>
          <option value={1.25}>125%</option>
          <option value={1.5}>150%</option>
        </select>

        <IconButton
          onClick={() => setShowGrid(!showGrid)}
          variant={showGrid ? "active" : "default"}
          title="Snap to Grid"
        >
          <Grid size={16} />
        </IconButton>

        <div className="flex-1" />

        <Button variant="secondary" size="sm" onClick={() => { onSaveProject(project); toast("Project Saved"); }} title="Simpan Proyek (Ctrl+S)">
          <Save size={14} /> Save
        </Button>
        <Button variant="primary" size="sm" onClick={() => onExport(project)} title="Ekspor ke PDF atau Print">
          <Download size={14} /> Export / Print
        </Button>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ─── LEFT ICON RAIL ─────────────────────────────────────────── */}
        <div className="w-14 bg-white border-r border-stone-200 flex flex-col items-center py-3 gap-1.5 shrink-0">
          <IconButton variant={!selectedId ? "active" : "default"} title="Pick Tool">
            <MousePointer2 size={18} />
          </IconButton>
          <div className="w-6 h-px bg-stone-200 my-1" />
          <IconButton onClick={() => { addElement('shape', { shapeType: 'rectangle' }); setActiveDocker('properties'); }} title="Rectangle Tool (F6)">
            <Square size={18} />
          </IconButton>
          <IconButton onClick={() => { addElement('shape', { shapeType: 'circle' }); setActiveDocker('properties'); }} title="Ellipse Tool (F7)">
            <Circle size={18} />
          </IconButton>
          <IconButton onClick={() => setActiveDocker('elements')} title="Text Tool (Open presets)">
            <TypeIcon size={18} />
          </IconButton>
          <IconButton onClick={() => { addElement('shape', { shapeType: 'line', width: 40, height: 1 }); setActiveDocker('properties'); }} title="Freehand Tool">
            <Minus size={18} />
          </IconButton>
          <IconButton onClick={() => setActiveDocker('elements')} title="Stamp & Icons Tool">
            <Sparkles size={18} />
          </IconButton>
        </div>

        {/* ─── CANVAS ─────────────────────────────────────────────────── */}
        <section
          className="flex-grow bg-stone-100 overflow-auto flex items-center justify-center p-10 relative"
          onClick={() => setSelectedId(null)}
          onDrop={handleFileDrop}
          onDragOver={handleDragOver}
          id="canvas-area"
        >
          {/* Canvas paper */}
          <div
            className="bg-white shadow-2xl rounded-lg relative transition-all duration-300"
            style={{
              width: `${canvasW}px`,
              height: `${canvasH}px`,
              backgroundColor: project.materialColor || project.backgroundColor || "#800000"
            }}
            ref={canvasRef}
          >
            {/* Tekstur Bahan SVG Overlay */}
            <svg className="absolute inset-0 pointer-events-none w-full h-full opacity-60 mix-blend-multiply rounded-lg" style={{ zIndex: 1 }}>
              <filter id="leather-texture">
                <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" result="noise" />
                <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0   0 0 0 0.3 0" />
              </filter>
              <rect width="100%" height="100%" filter="url(#leather-texture)" />
            </svg>

            {/* Grid Overlay */}
            {showGrid && (
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.2]"
                style={{ backgroundImage: "linear-gradient(to right,#000 1px,transparent 1px),linear-gradient(to bottom,#000 1px,transparent 1px)", backgroundSize: "25px 25px" }}
              />
            )}

            {/* SVG elements */}
            <svg className="absolute inset-0 w-full h-full" id="canvas-svg" style={{zIndex: 2}}>
              {[...project.elements].sort((a, b) => a.zIndex - b.zIndex).map((el) => {
                const ex = `${el.x}%`, ey = `${el.y}%`, ew = `${el.width}%`, eh = `${el.height}%`;
                const sel = el.id === selectedId;
                return (
                  <g
                    key={el.id}
                    onMouseDown={(e) => handleMouseDown(e, el.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="cursor-move"
                    id={`el-${el.id}`}
                  >
                    {el.type === "shape" && el.shapeType === "rectangle" && (
                      <rect x={ex} y={ey} width={ew} height={eh} fill={el.color || "#000"} />
                    )}
                    {el.type === "shape" && el.shapeType === "circle" && (
                      <circle cx={`${el.x + el.width / 2}%`} cy={`${el.y + el.width / 2}%`} r={`${el.width / 2}%`} fill={el.color || "#000"} />
                    )}
                    {el.type === "shape" && el.shapeType === "line" && (
                      <line x1={ex} y1={ey} x2={`${el.x + el.width}%`} y2={ey} stroke={el.color || "#000"} strokeWidth={el.height || 2} />
                    )}
                    {el.type === "logo" && (
                      <svg x={ex} y={ey} width={ew} height={eh} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                        {renderLogoSvg(el.logoIcon || "sparkles", el.color || "#000")}
                      </svg>
                    )}
                    {el.type === "text" && el.text && (
                      <svg x={ex} y={ey} width={ew} height={eh} viewBox={`0 0 ${el.width * 10} ${el.height * 10}`} preserveAspectRatio="xMidYMid meet" overflow="visible">
                        <text
                          x={el.align === "center" ? "50%" : el.align === "right" ? "100%" : "0%"}
                          y="50%" dominantBaseline="middle"
                          textAnchor={el.align === "center" ? "middle" : el.align === "right" ? "end" : "start"}
                          fill={el.color || "#000"}
                          fontSize={el.fontSize ? el.fontSize * 1.5 : 16}
                          fontFamily={el.fontFamily || "Arial"}
                          fontWeight={el.fontWeight || "normal"}
                        >
                          {el.text}
                        </text>
                      </svg>
                    )}
                    {el.type === "custom_svg" && el.customSvg && (
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
                    )}
                    {el.type === "image" && el.imageUrl && (
                      <image x={ex} y={ey} width={ew} height={eh} href={el.imageUrl} preserveAspectRatio="none" />
                    )}

                    {/* Selection outline with 8 anchor points */}
                    {sel && (
                      <g>
                        {/* Bounding box */}
                        <rect
                          x={`${el.x}%`} y={`${el.y}%`}
                          width={`${el.width}%`} height={`${el.height}%`}
                          fill="none" stroke="#0d9488" strokeWidth="1.5" strokeDasharray="4 3"
                        />
                        {/* 8 Anchor points */}
                        {[[el.x, el.y], [el.x + el.width/2, el.y], [el.x + el.width, el.y],
                          [el.x, el.y + el.height/2], [el.x + el.width, el.y + el.height/2],
                          [el.x, el.y + el.height], [el.x + el.width/2, el.y + el.height], [el.x + el.width, el.y + el.height]].map(([cx, cy], i) => (
                          <rect key={i} x={`${cx}%`} y={`${cy}%`} width="7" height="7" rx="1.5" transform="translate(-3.5, -3.5)" fill="#0d9488" stroke="#fff" strokeWidth="1" />
                        ))}
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Snap guides */}
              {activeGuides.map((g, i) => (
                g.type === "v"
                  ? <line key={i} x1={`${g.value}%`} y1="0%" x2={`${g.value}%`} y2="100%" stroke="#0d9488" strokeWidth="0.75" strokeDasharray="4 4" />
                  : <line key={i} x1="0%" y1={`${g.value}%`} x2="100%" y2={`${g.value}%`} stroke="#0d9488" strokeWidth="0.75" strokeDasharray="4 4" />
              ))}

              {/* Mika Nama Overlay */}
              <image
                href="/mika-nama.png"
                x={isSizeB ? '11.76%' : '21.73%'}
                y={isSizeB ? '50%' : '66.17%'}
                width={isSizeB ? '76.47%' : '56.52%'}
                height={isSizeB ? '19.56%' : '13.23%'}
                preserveAspectRatio="none"
                pointerEvents="none"
              />
            </svg>
          </div>
        </section>

        {/* ─── RIGHT PANEL ────────────────────────────────────────────── */}
        <div className="w-80 bg-white border-l border-stone-200 flex flex-col shrink-0">
          {/* TABS */}
          <div className="flex gap-1 p-2 border-b border-stone-200">
            {([
              { key: "properties", label: "Properties" },
              { key: "elements", label: "Insert" },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveDocker(tab.key)}
                className={cn(
                  "flex-1 py-2 rounded-lg text-xs font-bold transition cursor-pointer",
                  activeDocker === tab.key
                    ? "bg-brand-50 text-brand-700"
                    : "text-stone-400 hover:bg-stone-50 hover:text-stone-600"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 p-3 overflow-y-auto space-y-3">
            {/* TAB CONTENT: Properties */}
            {activeDocker === "properties" && (
              <div className="space-y-3">
                {/* PROJECT MOCKUP SETTINGS (WHEN NOTHING SELECTED) */}
                {!selectedEl && (
                  <Card className="p-3">
                    <p className="font-bold text-stone-700 mb-3 flex items-center gap-1.5 text-xs uppercase tracking-wide">
                      <Layers size={14}/> Mockup & Bahan
                    </p>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-stone-400 uppercase mb-1 block">Ukuran Cetak</label>
                        <select
                          className={cn(fieldClass, "w-full")}
                          value={project.printSize || "Size A (23x34cm)"}
                          onChange={(e) => setProject({...project, printSize: e.target.value as "Size A (23x34cm)" | "Size B (17x23cm)"})}
                        >
                          <option value="Size A (23x34cm)">Ukuran A (23x34cm)</option>
                          <option value="Size B (17x23cm)">Ukuran B (17x23cm)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-stone-400 uppercase mb-1 block">Metode Cetak</label>
                        <select
                          className={cn(fieldClass, "w-full")}
                          value={project.printMethod || "Embos Foil"}
                          onChange={(e) => {
                            const method = e.target.value as "Embos Foil" | "Sablon";
                            const forcedColor = method === "Embos Foil" ? "#D4AF37" : "#FFFFFF";
                            const elements = project.elements.map(el => ({ ...el, color: forcedColor }));
                            setProject({ ...project, printMethod: method, elements });
                          }}
                        >
                          <option value="Embos Foil">Embos Foil (Hanya Warna Emas)</option>
                          <option value="Sablon">Sablon (Hitam / Putih)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-stone-400 uppercase mb-1 block">Warna Dasar Bahan (ASE/Kulit)</label>
                        <div className="grid grid-cols-6 gap-1.5">
                          {MATERIAL_COLORS.map(c => (
                            <div
                              key={c.hex}
                              onClick={() => setProject({...project, materialColor: c.hex})}
                              className={cn(
                                "w-full aspect-square rounded-md cursor-pointer border-2",
                                project.materialColor === c.hex || (!project.materialColor && project.backgroundColor === c.hex)
                                  ? "border-brand-500 shadow-sm"
                                  : "border-stone-200"
                              )}
                              style={{backgroundColor: c.hex}}
                              title={c.name}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {/* ELEMENT PROPERTIES (WHEN SELECTED) */}
                {selectedEl && (
                  <div className="space-y-3">
                    {/* Object actions: layer, duplicate, delete */}
                    <Card className="p-3 flex items-center justify-between gap-1">
                      <IconButton size="sm" onClick={() => changeLayer('front')} title="To Front"><BringToFront size={14}/></IconButton>
                      <IconButton size="sm" onClick={() => changeLayer('back')} title="To Back"><SendToBack size={14}/></IconButton>
                      <div className="w-px h-5 bg-stone-200" />
                      <IconButton size="sm" onClick={duplicateSelected} title="Duplicate (Ctrl+D)"><Copy size={14}/></IconButton>
                      <IconButton size="sm" variant="destructive" onClick={deleteSelected} title="Delete"><Trash2 size={14}/></IconButton>
                    </Card>

                    {/* Position & Size + Align */}
                    <Card className="p-3">
                      <p className="font-bold text-stone-700 mb-2 text-xs uppercase tracking-wide">Posisi & Ukuran</p>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <label className="text-[10px] font-bold text-stone-400 uppercase mb-1 block">X</label>
                          <input type="number" value={selectedEl.x} onChange={(e) => commitUpdate(selectedEl.id, {x: parseFloat(e.target.value)})} className={cn(fieldClass, "w-full")} />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-stone-400 uppercase mb-1 block">Y</label>
                          <input type="number" value={selectedEl.y} onChange={(e) => commitUpdate(selectedEl.id, {y: parseFloat(e.target.value)})} className={cn(fieldClass, "w-full")} />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-stone-400 uppercase mb-1 block">Lebar</label>
                          <input type="number" value={selectedEl.width} onChange={(e) => commitUpdate(selectedEl.id, {width: parseFloat(e.target.value)})} className={cn(fieldClass, "w-full")} />
                        </div>
                        {selectedEl.type !== 'text' && (
                          <div>
                            <label className="text-[10px] font-bold text-stone-400 uppercase mb-1 block">Tinggi</label>
                            <input type="number" value={selectedEl.height} onChange={(e) => commitUpdate(selectedEl.id, {height: parseFloat(e.target.value)})} className={cn(fieldClass, "w-full")} />
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        <button onClick={() => alignSelected('centerX')} className="px-1 py-1 text-[9px] font-bold rounded-md border border-stone-200 text-stone-500 hover:bg-stone-50 hover:text-stone-700 cursor-pointer">Tgh X</button>
                        <button onClick={() => alignSelected('centerY')} className="px-1 py-1 text-[9px] font-bold rounded-md border border-stone-200 text-stone-500 hover:bg-stone-50 hover:text-stone-700 cursor-pointer">Tgh Y</button>
                        <button onClick={() => alignSelected('left')} className="px-1 py-1 text-[9px] font-bold rounded-md border border-stone-200 text-stone-500 hover:bg-stone-50 hover:text-stone-700 cursor-pointer">Kiri</button>
                        <button onClick={() => alignSelected('right')} className="px-1 py-1 text-[9px] font-bold rounded-md border border-stone-200 text-stone-500 hover:bg-stone-50 hover:text-stone-700 cursor-pointer">Kanan</button>
                      </div>
                    </Card>

                    {/* Lock X */}
                    <Card className="p-3 flex justify-between items-center">
                      <span className="font-semibold text-stone-600 text-xs flex items-center gap-1.5" title="Kunci elemen agar selalu di tengah secara mendatar">
                        {selectedEl.isLockedX ? <Lock size={14} className="text-brand-600"/> : <Unlock size={14} className="text-amber-600"/>}
                        Kunci Sumbu X
                      </span>
                      <button
                        onClick={() => commitUpdate(selectedId!, { isLockedX: !selectedEl.isLockedX })}
                        className={cn(
                          "px-2.5 py-1.5 text-[10px] font-bold rounded-lg shadow-sm border transition cursor-pointer",
                          selectedEl.isLockedX
                            ? "bg-brand-50 border-brand-200 text-brand-700 hover:bg-brand-100"
                            : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                        )}
                      >
                        {selectedEl.isLockedX ? "Buka Gembok" : "Kunci Tengah"}
                      </button>
                    </Card>

                    {/* Typography for text */}
                    {selectedEl.type === "text" && (
                      <Card className="p-3">
                        <p className="font-bold text-stone-700 mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wide">
                          <TypeIcon size={14}/> Tipografi
                        </p>
                        <div className="space-y-2">
                          <select
                            className={cn(fieldClass, "w-full")}
                            value={selectedEl.fontFamily || "Times New Roman"}
                            onChange={(e) => commitUpdate(selectedId!, { fontFamily: e.target.value })}
                          >
                            {PRESET_FONTS.map(f => (
                              <option key={f.name} value={f.name}>{f.label}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            className={cn(fieldClass, "w-full")}
                            value={selectedEl.text || ""}
                            onChange={(e) => commitUpdate(selectedId!, { text: e.target.value })}
                            placeholder="Ketik teks..."
                          />

                          <div>
                            <label className="text-[10px] font-bold text-stone-400 uppercase mb-1 block">Ukuran Font</label>
                            <input
                              type="number"
                              list="font-sizes"
                              className={cn(fieldClass, "w-full")}
                              value={selectedEl.fontSize || 14}
                              onChange={(e) => commitUpdate(selectedId!, { fontSize: Number(e.target.value) })}
                            />
                            <datalist id="font-sizes">
                              <option value="43" label="Judul Besar" />
                              <option value="33" label="Subjudul" />
                              <option value="23" label="Teks Sedang" />
                              <option value="13" label="Keterangan Kecil" />
                            </datalist>
                          </div>

                          <div className="flex items-center gap-1">
                            <IconButton
                              size="sm"
                              variant={selectedEl.fontWeight === 'bold' ? 'active' : 'default'}
                              onClick={() => commitUpdate(selectedId!, {fontWeight: selectedEl.fontWeight === 'bold' ? 'normal' : 'bold'})}
                            >
                              <Bold size={14}/>
                            </IconButton>
                            <div className="w-px h-5 bg-stone-200 mx-0.5" />
                            <IconButton size="sm" variant={selectedEl.align === 'left' || !selectedEl.align ? 'active' : 'default'} onClick={() => commitUpdate(selectedId!, { align: "left" })}><AlignLeft size={14}/></IconButton>
                            <IconButton size="sm" variant={selectedEl.align === 'center' ? 'active' : 'default'} onClick={() => commitUpdate(selectedId!, { align: "center" })}><AlignCenter size={14}/></IconButton>
                            <IconButton size="sm" variant={selectedEl.align === 'right' ? 'active' : 'default'} onClick={() => commitUpdate(selectedId!, { align: "right" })}><AlignRight size={14}/></IconButton>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Mockup Colors Constraints */}
                    <Card className="p-3">
                      <p className="font-bold text-stone-700 mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wide">
                        <Palette size={14}/> Warna ({project.printMethod || "Embos Foil"})
                      </p>
                      <div className="flex gap-2">
                        {(project.printMethod || "Embos Foil") === "Embos Foil" ? (
                          <div className="w-8 h-8 rounded-lg border-2 border-amber-500 flex items-center justify-center font-bold text-[9px] text-white shadow-sm" style={{background: "linear-gradient(135deg, #FFD700, #DAA520)"}} title="Emas Foil">Emas</div>
                        ) : (
                          <>
                            <div onClick={() => commitUpdate(selectedId!, { color: "#FFFFFF" })} className={cn("w-8 h-8 rounded-lg border-2 cursor-pointer", selectedEl.color === "#FFFFFF" ? "border-brand-500 shadow-sm" : "border-stone-300")} style={{backgroundColor: "#FFFFFF"}} title="Putih"></div>
                            <div onClick={() => commitUpdate(selectedId!, { color: "#111111" })} className={cn("w-8 h-8 rounded-lg border-2 cursor-pointer", selectedEl.color === "#111111" ? "border-brand-500 shadow-sm" : "border-stone-300")} style={{backgroundColor: "#111111"}} title="Hitam"></div>
                          </>
                        )}
                      </div>
                      <p className="text-[10px] text-stone-400 mt-2">Warna disesuaikan otomatis dengan metode cetak yang Anda pilih pada setelan proyek.</p>
                    </Card>
                  </div>
                )}
              </div>
            )}

            {/* DOCKER: INSERT ELEMENTS */}
            {activeDocker === 'elements' && (
              <div className="space-y-3">
                <Card className="p-3">
                  <p className="font-bold text-stone-700 mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wide"><TypeIcon size={14}/> Text Presets</p>
                  <div className="space-y-1.5">
                    <button onClick={() => addElement('text', {text: 'NAMA SEKOLAH', fontSize: 43, fontWeight: 'bold', width: 80, align: 'center'})} className="w-full text-left px-2.5 py-2 bg-stone-50 border border-stone-200 hover:border-brand-300 hover:bg-brand-50/50 rounded-lg transition cursor-pointer">
                      <span className="font-bold text-[13px]">Teks Judul Besar</span>
                    </button>
                    <button onClick={() => addElement('text', {text: 'Tahun Pelajaran', fontSize: 33, fontWeight: 'medium', width: 80, align: 'center'})} className="w-full text-left px-2.5 py-2 bg-stone-50 border border-stone-200 hover:border-brand-300 hover:bg-brand-50/50 rounded-lg transition cursor-pointer">
                      <span className="text-[12px]">Teks Subjudul</span>
                    </button>
                    <button onClick={() => addElement('text', {text: 'Alamat Sekolah', fontSize: 23, width: 80, align: 'center'})} className="w-full text-left px-2.5 py-2 bg-stone-50 border border-stone-200 hover:border-brand-300 hover:bg-brand-50/50 rounded-lg transition cursor-pointer">
                      <span className="text-[11px]">Teks Sedang</span>
                    </button>
                    <button onClick={() => addElement('text', {text: 'NISN: 000', fontSize: 13, width: 80, align: 'center'})} className="w-full text-left px-2.5 py-2 bg-stone-50 border border-stone-200 hover:border-brand-300 hover:bg-brand-50/50 rounded-lg transition cursor-pointer">
                      <span className="text-[10px]">Teks Keterangan</span>
                    </button>
                  </div>
                </Card>

                <Card className="p-3">
                  <p className="font-bold text-stone-700 mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wide"><ImageIcon size={14}/> Gambar & Vector</p>

                  <div className="space-y-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => imageInputRef.current?.click()}
                    >
                      <Download size={14} className="text-brand-600" />
                      <span>Import Gambar Biasa</span>
                    </Button>
                    <input
                      type="file"
                      ref={imageInputRef}
                      className="hidden"
                      accept="image/jpeg, image/png, image/svg+xml, image/webp"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleImageImport(e.target.files[0]);
                          e.target.value = '';
                        }
                      }}
                    />

                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowVectorConverter(true)}
                    >
                      <Wand2 size={14} className="text-brand-600" />
                      <span>Tracing ke Vector (B&W)</span>
                    </Button>
                  </div>
                  <p className="text-[10px] text-stone-400 mt-2 leading-tight text-center">Tips: Anda juga bisa Drag & Drop file langsung ke kanvas.</p>
                </Card>

                <Card className="p-3">
                  <p className="font-bold text-stone-700 mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wide"><Sparkles size={14}/> Stamps & Icons</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { icon: "mortarboard", label: "Toga" },
                      { icon: "shield", label: "Perisai" },
                      { icon: "sparkles", label: "Bintang" },
                      { icon: "leaf", label: "Daun" },
                      { icon: "building", label: "Gedung" },
                    ].map(s => (
                      <button key={s.icon} onClick={() => addElement('logo', {logoIcon: s.icon, width: 15, height: 15})} className="flex flex-col items-center p-2.5 bg-stone-50 border border-stone-200 hover:border-brand-300 hover:bg-brand-50/50 rounded-lg transition cursor-pointer">
                        <svg className="w-6 h-6 fill-current text-stone-600 mb-1" viewBox="0 0 100 100">{renderLogoSvg(s.icon, "currentColor")}</svg>
                        <span className="text-[10px] text-stone-500">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </Card>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* MODALS */}
      {showVectorConverter && (
        <ImageToVectorConverter
          onClose={() => setShowVectorConverter(false)}
          onInsertSVG={(svgString) => {
            addElement('custom_svg', { customSvg: svgString, color: '#000000', width: 30, height: 30 });
          }}
        />
      )}
    </div>
  );
}
