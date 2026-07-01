"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { CanvasElement, DesignProject } from "../lib/types";
import { DEFAULT_PROJECTS } from "../lib/templates";
import {
  Undo,
  Redo,
  Save,
  Eye,
  Type,
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
  AlignJustify,
  File,
  Edit,
  MoreHorizontal,
  FolderOpen,
  Image as ImageIcon,
  Wand2,
  Download,
  Lock,
  Unlock
} from "lucide-react";
import ImageToVectorConverter from "./ImageToVectorConverter";

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
  const [activeDocker, setActiveDocker] = useState<"properties" | "themes" | "elements">("properties");
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

  const applyTemplate = (presetId: string) => {
    const found = DEFAULT_PROJECTS.find((p) => p.id === presetId);
    if (!found) return;
    setProject((p) => ({ ...p, backgroundColor: found.backgroundColor, elements: found.elements, palette: found.palette, typography: found.typography }));
    setSelectedId(null);
    pushHistory(found.elements);
    toast(`Template diterapkan`);
  };

  const applyAesthetic = (gaya: "editorial" | "formal" | "ceria" | "nusantara") => {
    const themes: Record<string, { bg: string; title: string; body: string; primary: string; accent: string }> = {
      editorial: { bg: "#FAF9F5", title: "Playfair Display", body: "Inter", primary: "#1C1917", accent: "#C5A880" },
      formal:    { bg: "#EEF2FF", title: "Space Grotesk", body: "Inter", primary: "#1E3A8A", accent: "#F59E0B" },
      ceria:     { bg: "#FFF7F0", title: "Outfit", body: "Outfit", primary: "#C2410C", accent: "#10B981" },
      nusantara: { bg: "#0B2E24", title: "Playfair Display", body: "Inter", primary: "#FFFFFF", accent: "#C5A880" },
    };
    const t = themes[gaya];
    const next = project.elements.map((el) => {
      if (el.type === "text") return { ...el, fontFamily: el.fontSize && el.fontSize >= 15 ? t.title : t.body, color: t.primary };
      if (el.type === "logo") return { ...el, color: t.accent };
      if (el.type === "shape") return { ...el, color: el.id.includes("accent") || el.id.includes("strip") || el.id.includes("frame") ? t.accent : t.primary };
      return el;
    });
    setProject((p) => ({ ...p, backgroundColor: t.bg, elements: next, palette: { primary: t.primary, secondary: t.primary, accent: t.accent, explanation: `Gaya ${gaya}` }, typography: { title: t.title, body: t.body, explanation: `Tipografi ${gaya}` } }));
    pushHistory(next);
    toast(`Tema diterapkan`);
  };

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
        const isSizeB = project.printSize === "Size B (17x23cm)";
        const ratio = isSizeB ? (17 / 23) : (23 / 34);
        const cardW = 400 * zoom;
        const cardH = Math.round(cardW / ratio);

        // Set import bounds to max 30% width and 40% height to keep ratio proportional
        let w = 30; 
        let h = w * (img.height / img.width) * (cardW / cardH);

        if (h > 40) {
           h = 40;
           w = h * (img.width / img.height) / (cardW / cardH);
        }
        
        w = parseFloat(w.toFixed(2));
        h = parseFloat(h.toFixed(2));

        addElement('image', { imageUrl: dataUrl, width: w, height: h });
        toast("Gambar berhasil diimpor");
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, [addElement, toast, project.printSize, zoom]);

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

      let tx = Math.max(0, Math.min(95, dragStartRef.current.elX + dx));
      let ty = Math.max(0, Math.min(95, dragStartRef.current.elY + dy));

      const elTypeObj = project.elements.find((e) => e.id === selectedId);
      if (elTypeObj?.isLockedX) {
        tx = 50 - (elTypeObj.width / 2);
      }

      const guides: { type: "v" | "h"; value: number }[] = [];
      const snapPoints = [5, 50, 95];
      const thresh = 1.5;
      snapPoints.forEach((sp) => {
        if (Math.abs(tx - sp) < thresh) { tx = sp; guides.push({ type: "v", value: sp }); }
        if (Math.abs(ty - sp) < thresh) { ty = sp; guides.push({ type: "h", value: sp }); }
      });

      // MIKA constraint for text elements: Y 50-80 is forbidden
      const elType = project.elements.find((e) => e.id === selectedId)?.type;
      if (elType === "text" && ty >= 50 && ty <= 80) {
        if (ty < 65) ty = 49;
        else ty = 81;
      }

      setActiveGuides(guides);
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
    <div className="h-screen bg-[#F0F0F0] flex flex-col overflow-hidden font-sans text-[11px] text-gray-800 select-none">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 bg-[#FFFFCC] border border-[#A0A0A0] text-black px-4 py-1 text-xs shadow-md pointer-events-none">
          {toastMsg}
        </div>
      )}

      {/* ─── 1. TOP MENU BAR (Windows Classic Style) ─────────────────────── */}
      <div className="flex items-center bg-[#E0DFE3] border-b border-[#A0A0A0] px-1 py-0.5" style={{boxShadow: "inset 0 1px 0 #FFF"}}>
        <span className="px-2 py-0.5 hover:bg-[#C9E0F7] hover:border-[#62A2E4] border border-transparent rounded-sm cursor-default">File</span>
        <span className="px-2 py-0.5 hover:bg-[#C9E0F7] hover:border-[#62A2E4] border border-transparent rounded-sm cursor-default">Edit</span>
        <span className="px-2 py-0.5 hover:bg-[#C9E0F7] hover:border-[#62A2E4] border border-transparent rounded-sm cursor-default">View</span>
        <span className="px-2 py-0.5 hover:bg-[#C9E0F7] hover:border-[#62A2E4] border border-transparent rounded-sm cursor-default">Layout</span>
        <span className="px-2 py-0.5 hover:bg-[#C9E0F7] hover:border-[#62A2E4] border border-transparent rounded-sm cursor-default">Arrange</span>
        <span className="px-2 py-0.5 hover:bg-[#C9E0F7] hover:border-[#62A2E4] border border-transparent rounded-sm cursor-default">Effects</span>
        <span className="px-2 py-0.5 hover:bg-[#C9E0F7] hover:border-[#62A2E4] border border-transparent rounded-sm cursor-default">Bitmaps</span>
        <span className="px-2 py-0.5 hover:bg-[#C9E0F7] hover:border-[#62A2E4] border border-transparent rounded-sm cursor-default">Text</span>
        <span className="px-2 py-0.5 hover:bg-[#C9E0F7] hover:border-[#62A2E4] border border-transparent rounded-sm cursor-default">Tools</span>
        <span className="px-2 py-0.5 hover:bg-[#C9E0F7] hover:border-[#62A2E4] border border-transparent rounded-sm cursor-default">Window</span>
        <span className="px-2 py-0.5 hover:bg-[#C9E0F7] hover:border-[#62A2E4] border border-transparent rounded-sm cursor-default">Help</span>
        <span className="ml-auto px-2 font-semibold text-gray-500">CorelDRAW X7 (Editor Mode) - {project.name}</span>
      </div>

      {/* ─── 2. STANDARD TOOLBAR ─────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-[#F0F0F0] border-b border-[#A0A0A0] p-1" style={{boxShadow: "inset 0 1px 0 #FFF"}}>
        <button onClick={onBackToDashboard} className="px-2 py-1 hover:bg-[#D5E1F2] border border-transparent hover:border-[#99B4D1] rounded-sm flex items-center justify-center gap-1 text-gray-700 font-semibold" title="Kembali ke Dashboard">
          <ChevronLeft size={16}/> <span>Back</span>
        </button>
        
        <div className="w-px h-5 bg-[#A0A0A0] mx-1 border-r border-[#FFF]"></div>
        
        <button onClick={() => { onSaveProject(project); toast("Project Saved"); }} className="px-2 py-1 hover:bg-[#D5E1F2] border border-transparent hover:border-[#99B4D1] rounded-sm flex items-center justify-center gap-1 text-gray-700 font-semibold" title="Simpan Proyek (Ctrl+S)">
          <Save size={16}/> <span>Save</span>
        </button>
        
        <button onClick={() => onExport(project)} className="px-3 py-1 bg-gradient-to-b from-[#E8F0F9] to-[#C9E0F7] border border-[#62A2E4] hover:from-[#C9E0F7] hover:to-[#A9CFF1] rounded-sm flex items-center justify-center gap-1 text-blue-800 font-bold shadow-sm" title="Ekspor ke PDF atau Print">
          <Download size={16}/> <span>Export / Print</span>
        </button>
        
        <div className="w-px h-5 bg-[#A0A0A0] mx-1 border-r border-[#FFF]"></div>
        
        <button onClick={handleUndo} disabled={historyIndex === 0} className="p-1 hover:bg-[#D5E1F2] border border-transparent hover:border-[#99B4D1] rounded-sm flex items-center justify-center w-6 h-6 disabled:opacity-40" title="Undo (Ctrl+Z)">
          <Undo size={16}/>
        </button>
        <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-1 hover:bg-[#D5E1F2] border border-transparent hover:border-[#99B4D1] rounded-sm flex items-center justify-center w-6 h-6 disabled:opacity-40" title="Redo (Ctrl+Y)">
          <Redo size={16}/>
        </button>

        <div className="w-px h-5 bg-[#A0A0A0] mx-1 border-r border-[#FFF]"></div>

        <select 
          value={zoom} 
          onChange={(e) => setZoom(parseFloat(e.target.value))}
          className="bg-white border border-[#999] px-1 py-0.5 text-[11px] h-5 outline-none shadow-inner w-16"
        >
          <option value={0.5}>50%</option>
          <option value={0.75}>75%</option>
          <option value={1}>100%</option>
          <option value={1.25}>125%</option>
          <option value={1.5}>150%</option>
        </select>

        <button onClick={() => setShowGrid(!showGrid)} className={`p-1 border rounded-sm flex items-center justify-center w-6 h-6 ${showGrid ? 'bg-[#C9E0F7] border-[#62A2E4]' : 'hover:bg-[#D5E1F2] border-transparent hover:border-[#99B4D1]'}`} title="Snap to Grid">
          <Grid size={16}/>
        </button>

        <div className="w-px h-5 bg-[#A0A0A0] mx-1 border-r border-[#FFF]"></div>
        
        <button onClick={() => setActiveDocker('properties')} className={`p-1 border rounded-sm flex items-center justify-center w-6 h-6 ${activeDocker === 'properties' ? 'bg-[#C9E0F7] border-[#62A2E4]' : 'hover:bg-[#D5E1F2] border-transparent hover:border-[#99B4D1]'}`} title="Object Properties Docker">
          <Layers size={16}/>
        </button>
        <button onClick={() => setActiveDocker('elements')} className={`p-1 border rounded-sm flex items-center justify-center w-6 h-6 ${activeDocker === 'elements' ? 'bg-[#C9E0F7] border-[#62A2E4]' : 'hover:bg-[#D5E1F2] border-transparent hover:border-[#99B4D1]'}`} title="Insert Elements Docker">
          <Sparkles size={16}/>
        </button>
        <button onClick={() => setActiveDocker('themes')} className={`p-1 border rounded-sm flex items-center justify-center w-6 h-6 ${activeDocker === 'themes' ? 'bg-[#C9E0F7] border-[#62A2E4]' : 'hover:bg-[#D5E1F2] border-transparent hover:border-[#99B4D1]'}`} title="Themes & Layouts Docker">
          <Palette size={16}/>
        </button>
      </div>

      {/* ─── 3. PROPERTY BAR (Contextual) ────────────────────────────────── */}
      <div className="flex items-center gap-2 bg-[#F0F0F0] border-b border-[#A0A0A0] p-1 h-8" style={{boxShadow: "inset 0 1px 0 #FFF"}}>
        {selectedEl ? (
          <>
            <div className="flex items-center gap-1">
              <span className="text-gray-500 mr-1">X:</span>
              <input type="number" value={selectedEl.x} onChange={(e) => commitUpdate(selectedEl.id, {x: parseFloat(e.target.value)})} className="w-14 bg-white border border-[#999] px-1 h-5 shadow-inner outline-none"/>
              <span className="text-gray-500 mr-1 ml-2">Y:</span>
              <input type="number" value={selectedEl.y} onChange={(e) => commitUpdate(selectedEl.id, {y: parseFloat(e.target.value)})} className="w-14 bg-white border border-[#999] px-1 h-5 shadow-inner outline-none"/>
            </div>
            
            <div className="w-px h-5 bg-[#A0A0A0] mx-1 border-r border-[#FFF]"></div>

            <div className="flex items-center gap-1">
              <span className="text-gray-500 mr-1">W:</span>
              <input type="number" value={selectedEl.width} onChange={(e) => commitUpdate(selectedEl.id, {width: parseFloat(e.target.value)})} className="w-12 bg-white border border-[#999] px-1 h-5 shadow-inner outline-none"/>
              {selectedEl.type !== 'text' && (
                <>
                  <span className="text-gray-500 mr-1 ml-2">H:</span>
                  <input type="number" value={selectedEl.height} onChange={(e) => commitUpdate(selectedEl.id, {height: parseFloat(e.target.value)})} className="w-12 bg-white border border-[#999] px-1 h-5 shadow-inner outline-none"/>
                </>
              )}
            </div>

            {selectedEl.type === 'text' && (
              <>
                <div className="w-px h-5 bg-[#A0A0A0] mx-1 border-r border-[#FFF]"></div>
                <select value={selectedEl.fontFamily || "Inter"} onChange={(e) => commitUpdate(selectedEl.id, {fontFamily: e.target.value})} className="w-32 bg-white border border-[#999] px-1 h-5 shadow-inner outline-none">
                  {PRESET_FONTS.map(f => <option key={f.name} value={f.name}>{f.label}</option>)}
                </select>
                <input type="number" value={selectedEl.fontSize || 14} onChange={(e) => commitUpdate(selectedEl.id, {fontSize: parseFloat(e.target.value)})} className="w-12 bg-white border border-[#999] px-1 h-5 shadow-inner outline-none" title="Font Size"/>
                <button onClick={() => commitUpdate(selectedEl.id, {fontWeight: selectedEl.fontWeight === 'bold' ? 'normal' : 'bold'})} className={`p-1 border rounded-sm flex items-center justify-center w-6 h-6 ${selectedEl.fontWeight === 'bold' ? 'bg-[#C9E0F7] border-[#62A2E4]' : 'hover:bg-[#D5E1F2] border-transparent hover:border-[#99B4D1]'}`}>
                  <Bold size={14}/>
                </button>
                <div className="flex border border-[#999] rounded-sm bg-white h-5">
                  <button onClick={() => commitUpdate(selectedEl.id, {align: 'left'})} className={`px-1.5 ${selectedEl.align === 'left' || !selectedEl.align ? 'bg-[#D5E1F2]' : 'hover:bg-gray-100'}`}><AlignLeft size={12}/></button>
                  <button onClick={() => commitUpdate(selectedEl.id, {align: 'center'})} className={`px-1.5 border-l border-r border-[#E0E0E0] ${selectedEl.align === 'center' ? 'bg-[#D5E1F2]' : 'hover:bg-gray-100'}`}><AlignCenter size={12}/></button>
                  <button onClick={() => commitUpdate(selectedEl.id, {align: 'right'})} className={`px-1.5 ${selectedEl.align === 'right' ? 'bg-[#D5E1F2]' : 'hover:bg-gray-100'}`}><AlignRight size={12}/></button>
                </div>
              </>
            )}

            <div className="w-px h-5 bg-[#A0A0A0] mx-1 border-r border-[#FFF]"></div>
            
            <button onClick={() => changeLayer('front')} className="p-1 hover:bg-[#D5E1F2] border border-transparent hover:border-[#99B4D1] rounded-sm flex items-center justify-center w-6 h-6" title="To Front (Shift+PgUp)"><BringToFront size={14}/></button>
            <button onClick={() => changeLayer('back')} className="p-1 hover:bg-[#D5E1F2] border border-transparent hover:border-[#99B4D1] rounded-sm flex items-center justify-center w-6 h-6" title="To Back (Shift+PgDn)"><SendToBack size={14}/></button>
            <button onClick={duplicateSelected} className="p-1 hover:bg-[#D5E1F2] border border-transparent hover:border-[#99B4D1] rounded-sm flex items-center justify-center w-6 h-6" title="Duplicate (Ctrl+D)"><Copy size={14}/></button>
            <button onClick={deleteSelected} className="p-1 hover:bg-[#D5E1F2] border border-transparent hover:border-[#99B4D1] rounded-sm flex items-center justify-center w-6 h-6 text-red-600" title="Delete"><Trash2 size={14}/></button>
          </>
        ) : (
          <span className="text-gray-500 italic px-2">No object selected. Background color: {project.backgroundColor}</span>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* ─── 4. VERTICAL TOOLBOX (Left) ─────────────────────────────────── */}
        <div className="w-10 bg-[#F0F0F0] border-r border-[#A0A0A0] flex flex-col items-center py-2 gap-1.5" style={{boxShadow: "inset -1px 0 0 #E0E0E0"}}>
          <button className={`p-1.5 border rounded-sm ${!selectedId ? 'bg-[#C9E0F7] border-[#62A2E4]' : 'hover:bg-[#D5E1F2] border-transparent hover:border-[#99B4D1]'}`} title="Pick Tool">
            <MousePointer2 size={18}/>
          </button>
          <div className="w-6 h-px bg-[#A0A0A0] my-1 border-b border-[#FFF]"></div>
          <button onClick={() => { addElement('shape', {shapeType: 'rectangle'}); setActiveDocker('properties'); }} className="p-1.5 hover:bg-[#D5E1F2] border border-transparent hover:border-[#99B4D1] rounded-sm" title="Rectangle Tool (F6)">
            <Square size={18}/>
          </button>
          <button onClick={() => { addElement('shape', {shapeType: 'circle'}); setActiveDocker('properties'); }} className="p-1.5 hover:bg-[#D5E1F2] border border-transparent hover:border-[#99B4D1] rounded-sm" title="Ellipse Tool (F7)">
            <Circle size={18}/>
          </button>
          <button onClick={() => setActiveDocker('elements')} className="p-1.5 hover:bg-[#D5E1F2] border border-transparent hover:border-[#99B4D1] rounded-sm" title="Text Tool (Open presets)">
            <TypeIcon size={18}/>
          </button>
          <button onClick={() => { addElement('shape', {shapeType: 'line', width: 40, height: 1}); setActiveDocker('properties'); }} className="p-1.5 hover:bg-[#D5E1F2] border border-transparent hover:border-[#99B4D1] rounded-sm" title="Freehand Tool">
            <Minus size={18}/>
          </button>
          <button onClick={() => setActiveDocker('elements')} className="p-1.5 hover:bg-[#D5E1F2] border border-transparent hover:border-[#99B4D1] rounded-sm" title="Stamp & Icons Tool">
            <Sparkles size={18}/>
          </button>
        </div>

        {/* ─── 5. CENTER CANVAS ───────────────────────────────────────────── */}
        <section
          className="flex-grow bg-[#D8D8DB] overflow-auto flex items-center justify-center p-8 relative"
          onClick={() => setSelectedId(null)}
          onDrop={handleFileDrop}
          onDragOver={handleDragOver}
          id="canvas-area"
          style={{boxShadow: "inset 2px 2px 5px rgba(0,0,0,0.2)"}}
        >
          {/* Canvas paper */}
          <div 
            className="bg-white shadow-xl relative transition-all duration-300"
            style={{
              width: `${canvasW}px`,
              height: `${canvasH}px`,
              backgroundColor: project.materialColor || project.backgroundColor || "#800000"
            }}
            ref={canvasRef}
          >
            {/* Tekstur Bahan SVG Overlay */}
            <svg className="absolute inset-0 pointer-events-none w-full h-full opacity-60 mix-blend-multiply" style={{ zIndex: 1 }}>
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

                    {/* Classic Selection outline with 8 black squares */}
                    {sel && (
                      <g>
                        {/* Bounding box */}
                        <rect
                          x={`${el.x}%`} y={`${el.y}%`}
                          width={`${el.width}%`} height={`${el.height}%`}
                          fill="none" stroke="#000" strokeWidth="1" strokeDasharray="2 2"
                        />
                        {/* 8 Anchor points */}
                        {[[el.x, el.y], [el.x + el.width/2, el.y], [el.x + el.width, el.y], 
                          [el.x, el.y + el.height/2], [el.x + el.width, el.y + el.height/2],
                          [el.x, el.y + el.height], [el.x + el.width/2, el.y + el.height], [el.x + el.width, el.y + el.height]].map(([cx, cy], i) => (
                          <rect key={i} x={`${cx}%`} y={`${cy}%`} width="6" height="6" transform="translate(-3, -3)" fill="#000" />
                        ))}
                        {/* Center X */}
                        <path d={`M ${el.x + el.width/2}% ${el.y + el.height/2}% m -3 -3 l 6 6 m 0 -6 l -6 6`} stroke="#000" strokeWidth="1" />
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Snap guides */}
              {activeGuides.map((g, i) => (
                g.type === "v"
                  ? <line key={i} x1={`${g.value}%`} y1="0%" x2={`${g.value}%`} y2="100%" stroke="#000" strokeWidth="0.5" strokeDasharray="4 4" />
                  : <line key={i} x1="0%" y1={`${g.value}%`} x2="100%" y2={`${g.value}%`} stroke="#000" strokeWidth="0.5" strokeDasharray="4 4" />
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

        {/* ─── 6. DOCKERS PANEL (Right) ──────────────────────────────────── */}
        <div className="w-72 bg-[#F0F0F0] border-l border-[#A0A0A0] flex flex-col shrink-0">
          {/* TABS */}
          <div className="flex border-b border-[#A0A0A0] text-[11px] font-bold bg-[#F0F0F0]">
            <button 
              onClick={() => setActiveDocker("properties")}
              className={`flex-1 py-1.5 border-r border-[#A0A0A0] ${activeDocker === "properties" ? "bg-[#FFF] border-b-transparent relative top-px" : "bg-transparent shadow-[inset_-1px_-1px_0_#999]"}`}
            >
              Properties
            </button>
            <button 
              onClick={() => setActiveDocker("elements")}
              className={`flex-1 py-1.5 border-r border-[#A0A0A0] ${activeDocker === "elements" ? "bg-[#FFF] border-b-transparent relative top-px" : "bg-transparent shadow-[inset_-1px_-1px_0_#999]"}`}
            >
              Insert
            </button>
            <button 
              onClick={() => setActiveDocker("themes")}
              className={`flex-1 py-1.5 ${activeDocker === "themes" ? "bg-[#FFF] border-b-transparent relative top-px" : "bg-transparent shadow-[inset_-1px_-1px_0_#999]"}`}
            >
              Themes
            </button>
          </div>

          <div className="flex-1 p-2 overflow-y-auto">
            {/* TAB CONTENT: Properties */}
            {activeDocker === "properties" && (
              <div className="space-y-3">
                {/* PROJECT MOCKUP SETTINGS (WHEN NOTHING SELECTED) */}
                {!selectedEl && (
                  <div className="border border-[#A0A0A0] bg-[#F9F9F9] p-2">
                    <p className="font-semibold text-gray-600 mb-2 flex items-center gap-1 border-b border-gray-300 pb-1">
                      <Layers size={14}/> Mockup & Bahan
                    </p>
                    
                    <div className="space-y-3 mt-2">
                      <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">Ukuran Cetak</label>
                        <select 
                          className="w-full border border-gray-300 rounded p-1 text-xs"
                          value={project.printSize || "Size A (23x34cm)"}
                          onChange={(e) => setProject({...project, printSize: e.target.value as "Size A (23x34cm)" | "Size B (17x23cm)"})}
                        >
                          <option value="Size A (23x34cm)">Ukuran A (23x34cm)</option>
                          <option value="Size B (17x23cm)">Ukuran B (17x23cm)</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">Metode Cetak</label>
                        <select 
                          className="w-full border border-gray-300 rounded p-1 text-xs"
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
                        <label className="text-xs font-bold text-gray-500 mb-1 block">Warna Dasar Bahan (ASE/Kulit)</label>
                        <div className="grid grid-cols-6 gap-1">
                          {MATERIAL_COLORS.map(c => (
                            <div
                              key={c.hex}
                              onClick={() => setProject({...project, materialColor: c.hex})}
                              className={`w-full aspect-square rounded cursor-pointer border-2 ${project.materialColor === c.hex || (!project.materialColor && project.backgroundColor === c.hex) ? 'border-blue-500 shadow-sm' : 'border-gray-300'}`}
                              style={{backgroundColor: c.hex}}
                              title={c.name}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ELEMENT PROPERTIES (WHEN SELECTED) */}
                {selectedEl && (
                  <div className="space-y-4">
                    {/* Universal Actions (Lock/Unlock) */}
                    <div className="border border-[#A0A0A0] bg-[#F9F9F9] p-2 flex justify-between items-center">
                      <span className="font-semibold text-gray-600 text-xs flex items-center gap-1" title="Kunci elemen agar selalu di tengah secara mendatar">
                        {selectedEl.isLockedX ? <Lock size={14} className="text-teal-600"/> : <Unlock size={14} className="text-amber-600"/>}
                        Kunci Sumbu X (Tengah)
                      </span>
                      <button
                        onClick={() => commitUpdate(selectedId!, { isLockedX: !selectedEl.isLockedX })}
                        className={`px-2 py-1 text-[10px] font-bold rounded shadow-sm border transition ${
                          selectedEl.isLockedX 
                            ? "bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100"
                            : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                        }`}
                      >
                        {selectedEl.isLockedX ? "Buka Gembok" : "Kunci Tengah"}
                      </button>
                    </div>

                    {/* Typography for text */}
                    {selectedEl.type === "text" && (
                      <div className="border border-[#A0A0A0] bg-[#F9F9F9] p-2">
                        <p className="font-semibold text-gray-600 mb-2 flex items-center gap-1 border-b border-gray-300 pb-1">
                          <TypeIcon size={14}/> Tipografi
                        </p>
                        <div className="space-y-2">
                          <select 
                            className="w-full p-1 text-xs border border-gray-300 rounded"
                            value={selectedEl.fontFamily || "Times New Roman"}
                            onChange={(e) => commitUpdate(selectedId!, { fontFamily: e.target.value })}
                          >
                            {PRESET_FONTS.map(f => (
                              <option key={f.name} value={f.name}>{f.label}</option>
                            ))}
                          </select>
                          <input 
                            type="text" 
                            className="w-full p-1 text-xs border border-gray-300 rounded" 
                            value={selectedEl.text || ""} 
                            onChange={(e) => commitUpdate(selectedId!, { text: e.target.value })} 
                            placeholder="Ketik teks..." 
                          />
                          
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 mb-1 block">Ukuran Font</label>
                            <input 
                              type="number" 
                              list="font-sizes"
                              className="w-full border border-gray-300 rounded p-1 text-xs" 
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
                            <button onClick={() => commitUpdate(selectedId!, { align: "left" })} className={`p-1 rounded ${selectedEl.align === 'left' ? 'bg-[#D5E1F2]' : 'hover:bg-gray-200'}`}><AlignLeft size={14}/></button>
                            <button onClick={() => commitUpdate(selectedId!, { align: "center" })} className={`p-1 rounded ${selectedEl.align === 'center' ? 'bg-[#D5E1F2]' : 'hover:bg-gray-200'}`}><AlignCenter size={14}/></button>
                            <button onClick={() => commitUpdate(selectedId!, { align: "right" })} className={`p-1 rounded ${selectedEl.align === 'right' ? 'bg-[#D5E1F2]' : 'hover:bg-gray-200'}`}><AlignRight size={14}/></button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Mockup Colors Constraints */}
                    <div className="border border-[#A0A0A0] bg-[#F9F9F9] p-2">
                      <p className="font-semibold text-gray-600 mb-2 flex items-center gap-1 border-b border-gray-300 pb-1">
                        <Palette size={14}/> Warna ({project.printMethod || "Embos Foil"})
                      </p>
                      <div className="flex gap-2">
                        {(project.printMethod || "Embos Foil") === "Embos Foil" ? (
                          <div className="w-8 h-8 rounded border-2 border-yellow-600 flex items-center justify-center font-bold text-[10px] text-white shadow-sm" style={{backgroundColor: "#D4AF37", background: "linear-gradient(135deg, #FFD700, #DAA520)"}} title="Emas Foil">Emas</div>
                        ) : (
                          <>
                            <div onClick={() => commitUpdate(selectedId!, { color: "#FFFFFF" })} className={`w-8 h-8 rounded border-2 cursor-pointer ${selectedEl.color === "#FFFFFF" ? 'border-blue-500 shadow-sm' : 'border-gray-300'}`} style={{backgroundColor: "#FFFFFF"}} title="Putih"></div>
                            <div onClick={() => commitUpdate(selectedId!, { color: "#111111" })} className={`w-8 h-8 rounded border-2 cursor-pointer ${selectedEl.color === "#111111" ? 'border-blue-500 shadow-sm' : 'border-gray-400'}`} style={{backgroundColor: "#111111"}} title="Hitam"></div>
                          </>
                        )}
                      </div>
                      <p className="text-[9px] text-gray-500 mt-2">Warna disesuaikan otomatis dengan metode cetak yang Anda pilih pada setelan proyek.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* DOCKER: INSERT ELEMENTS */}
            {activeDocker === 'elements' && (
              <div className="space-y-4">
                <div className="border border-[#A0A0A0] bg-[#F9F9F9] p-2">
                  <p className="font-semibold text-gray-600 mb-2 flex items-center gap-1 border-b border-gray-300 pb-1"><TypeIcon size={14}/> Text Presets</p>
                  <div className="space-y-1">
                    <button onClick={() => addElement('text', {text: 'NAMA SEKOLAH', fontSize: 43, fontWeight: 'bold', width: 80, align: 'center'})} className="w-full text-left p-1 bg-[#E0DFE3] border border-[#A0A0A0] hover:bg-[#D5E1F2] active:bg-[#A0A0A0] shadow-[inset_-1px_-1px_0_#999,inset_1px_1px_0_#FFF]">
                      <span className="font-bold text-[12px]">Teks Judul Besar</span>
                    </button>
                    <button onClick={() => addElement('text', {text: 'Tahun Pelajaran', fontSize: 33, fontWeight: 'medium', width: 80, align: 'center'})} className="w-full text-left p-1 bg-[#E0DFE3] border border-[#A0A0A0] hover:bg-[#D5E1F2] active:bg-[#A0A0A0] shadow-[inset_-1px_-1px_0_#999,inset_1px_1px_0_#FFF]">
                      <span>Teks Subjudul</span>
                    </button>
                    <button onClick={() => addElement('text', {text: 'Alamat Sekolah', fontSize: 23, width: 80, align: 'center'})} className="w-full text-left p-1 bg-[#E0DFE3] border border-[#A0A0A0] hover:bg-[#D5E1F2] active:bg-[#A0A0A0] shadow-[inset_-1px_-1px_0_#999,inset_1px_1px_0_#FFF]">
                      <span className="text-[11px]">Teks Sedang</span>
                    </button>
                    <button onClick={() => addElement('text', {text: 'NISN: 000', fontSize: 13, width: 80, align: 'center'})} className="w-full text-left p-1 bg-[#E0DFE3] border border-[#A0A0A0] hover:bg-[#D5E1F2] active:bg-[#A0A0A0] shadow-[inset_-1px_-1px_0_#999,inset_1px_1px_0_#FFF]">
                      <span className="text-[10px]">Teks Keterangan</span>
                    </button>
                  </div>
                </div>

                <div className="border border-[#A0A0A0] bg-[#F9F9F9] p-2">
                  <p className="font-semibold text-gray-600 mb-2 flex items-center gap-1 border-b border-gray-300 pb-1"><ImageIcon size={14}/> Gambar & Vector</p>
                  
                  <div className="space-y-1.5">
                    <button 
                      onClick={() => imageInputRef.current?.click()} 
                      className="w-full text-left p-1 bg-[#E0DFE3] border border-[#A0A0A0] hover:bg-[#D5E1F2] active:bg-[#A0A0A0] shadow-[inset_-1px_-1px_0_#999,inset_1px_1px_0_#FFF] flex items-center justify-center gap-2"
                    >
                      <Download size={14} className="text-blue-600" />
                      <span className="font-bold text-[11px]">Import Gambar Biasa</span>
                    </button>
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

                    <button 
                      onClick={() => setShowVectorConverter(true)} 
                      className="w-full text-left p-1 bg-[#E0DFE3] border border-[#A0A0A0] hover:bg-[#D5E1F2] active:bg-[#A0A0A0] shadow-[inset_-1px_-1px_0_#999,inset_1px_1px_0_#FFF] flex items-center justify-center gap-2"
                    >
                      <Wand2 size={14} className="text-teal-600" />
                      <span className="font-bold text-[11px]">Tracing ke Vector (B&W)</span>
                    </button>
                  </div>
                  <p className="text-[9px] text-gray-500 mt-1.5 leading-tight text-center">Tips: Anda juga bisa Drag & Drop file langsung ke kanvas.</p>
                </div>

                <div className="border border-[#A0A0A0] bg-[#F9F9F9] p-2">
                  <p className="font-semibold text-gray-600 mb-2 flex items-center gap-1 border-b border-gray-300 pb-1"><Sparkles size={14}/> Stamps & Icons</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { icon: "mortarboard", label: "Toga" },
                      { icon: "shield", label: "Perisai" },
                      { icon: "sparkles", label: "Bintang" },
                      { icon: "leaf", label: "Daun" },
                      { icon: "building", label: "Gedung" },
                    ].map(s => (
                      <button key={s.icon} onClick={() => addElement('logo', {logoIcon: s.icon, width: 15, height: 15})} className="flex flex-col items-center p-2 bg-[#E0DFE3] border border-[#A0A0A0] hover:bg-[#D5E1F2] active:bg-[#A0A0A0] shadow-[inset_-1px_-1px_0_#999,inset_1px_1px_0_#FFF]">
                        <svg className="w-6 h-6 fill-current text-gray-700 mb-1" viewBox="0 0 100 100">{renderLogoSvg(s.icon, "currentColor")}</svg>
                        <span className="text-[9px]">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* DOCKER: THEMES & LAYOUTS */}
            {activeDocker === 'themes' && (
              <div className="space-y-4">
                <div className="border border-[#A0A0A0] bg-[#F9F9F9] p-2">
                  <p className="font-semibold text-gray-600 mb-2 border-b border-gray-300 pb-1">AI Aesthetics</p>
                  <p className="text-[9px] text-gray-500 mb-2 leading-tight">Ubah kombinasi warna & font sekaligus dengan gaya preset AI.</p>
                  <div className="space-y-1.5">
                    {[
                      { key: "editorial", label: "⚜️ Editorial (Elegan)" },
                      { key: "formal", label: "🏛️ Formal (Biru/Kuning)" },
                      { key: "ceria", label: "🌿 Ceria (Hangat)" },
                      { key: "nusantara", label: "🌿 Nusantara (Hijau/Emas)" },
                    ].map(t => (
                      <button key={t.key} onClick={() => applyAesthetic(t.key as any)} className="w-full text-left px-2 py-1.5 bg-[#E0DFE3] border border-[#A0A0A0] hover:bg-[#D5E1F2] active:bg-[#A0A0A0] shadow-[inset_-1px_-1px_0_#999,inset_1px_1px_0_#FFF]">
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border border-[#A0A0A0] bg-[#F9F9F9] p-2">
                  <p className="font-semibold text-gray-600 mb-2 flex items-center gap-1 border-b border-gray-300 pb-1"><FolderOpen size={14}/> Layout Presets</p>
                  <div className="space-y-1.5">
                    {DEFAULT_PROJECTS.map(p => (
                      <button key={p.id} onClick={() => applyTemplate(p.id)} className="w-full text-left px-2 py-1.5 bg-[#E0DFE3] border border-[#A0A0A0] hover:bg-[#D5E1F2] active:bg-[#A0A0A0] shadow-[inset_-1px_-1px_0_#999,inset_1px_1px_0_#FFF]">
                        <span className="font-bold block text-[11px]">{p.name}</span>
                        <span className="text-[9px] text-gray-500">{p.layoutType}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Removed Vertical Color Palette since colors are restricted by print method */}
      </div>

      {/* ─── 8. STATUS BAR (Bottom) ──────────────────────────────────────── */}
      <div className="h-6 bg-[#F0F0F0] border-t border-[#A0A0A0] flex items-center px-2 text-gray-600 gap-4" style={{boxShadow: "inset 0 1px 0 #FFF"}}>
        <span className="font-bold flex items-center gap-1">
           <div className="w-3 h-3 bg-white border border-gray-400 shadow-inner"></div> Page 1
        </span>
        <div className="w-px h-4 bg-[#A0A0A0] border-r border-[#FFF]"></div>
        <span>
          {selectedEl 
            ? `${selectedEl.type === 'text' ? 'Artistic Text' : selectedEl.type === 'custom_svg' ? 'Vector Object' : selectedEl.shapeType || 'Object'} on Layer 1` 
            : 'No object selected'}
        </span>
        <div className="w-px h-4 bg-[#A0A0A0] border-r border-[#FFF] ml-auto"></div>
        <span className="text-right w-32 cursor-pointer flex items-center gap-1" title="Fill Color">
          <div className="w-3 h-3 border border-gray-500" style={{backgroundColor: selectedEl ? selectedEl.color : project.backgroundColor}}></div>
          {selectedEl ? selectedEl.color : project.backgroundColor}
        </span>
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
