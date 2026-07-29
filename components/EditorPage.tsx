"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { CanvasElement, DesignProject } from "../lib/types";
import CanvasFitText from "./CanvasFitText";
import {
  clampToCanvas,
  getCenteredX,
  applySnap,
  enforceMikaConstraint,
  getCardRatio,
  getMikaOverlayRect,
  sortByZIndex,
  computeImageImportSize,
  computeResize,
  ResizeHandle,
} from "../lib/canvasConstraints";
import {
  MATERIAL_TEXTURE_OPACITY,
  MATERIAL_TEXTURE_BLEND_MODE,
  MATERIAL_TEXTURE_BASE_FREQUENCY,
  MATERIAL_TEXTURE_NUM_OCTAVES,
  MATERIAL_TEXTURE_COLOR_MATRIX_VALUES,
} from "../lib/materialTexture";
import { getLogoIconMarkup, LOGO_ICON_LIST } from "../lib/logoIcons";
import { prepareCustomSvgMarkup } from "../lib/svgUtils";
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
  Loader2,
  PanelRight,
} from "lucide-react";
import ImageToVectorConverter from "./ImageToVectorConverter";
import { Button, IconButton, Card } from "@/components/ui";
import { cn, generateId } from "@/lib/utils";

interface EditorPageProps {
  project: DesignProject;
  onBackToDashboard: () => void;
  onSaveProject: (updatedProject: DesignProject) => Promise<{ project: DesignProject; persisted: boolean }>;
  onExport: (project: DesignProject) => Promise<void>;
}

const RESIZE_CURSORS: Record<ResizeHandle, string> = {
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
  nw: "nwse-resize",
  se: "nwse-resize",
};

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
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  // Promise dari save yang sedang berjalan (kalau ada) — dipakai supaya
  // "Kembali ke Dashboard" menunggu save selesai dulu alih-alih pindah
  // halaman sebelum perubahan benar-benar tersimpan (race condition).
  const pendingSaveRef = useRef<Promise<unknown> | null>(null);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(false);

  // Docker panel tabs
  const [activeDocker, setActiveDocker] = useState<"properties" | "elements">("properties");
  const [showVectorConverter, setShowVectorConverter] = useState(false);

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, elX: 0, elY: 0 });
  const isResizingRef = useRef(false);
  const resizeStartRef = useRef({ x: 0, y: 0, elX: 0, elY: 0, elWidth: 0, elHeight: 0, handle: "se" as ResizeHandle });
  const canvasRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Ref "cermin" berisi elements terbaru, dibaca oleh event listener window
  // (mousemove/mouseup) yang tidak boleh sering re-subscribe setiap elemen
  // berubah (akan terjadi berkali-kali per detik saat drag/resize berlangsung).
  const elementsRef = useRef<CanvasElement[]>(project.elements);
  useEffect(() => {
    elementsRef.current = project.elements;
  }, [project.elements]);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  }, []);

  // Dipakai bersama oleh tombol Save dan pintasan Ctrl+S, supaya keduanya
  // selalu berperilaku identik alih-alih Ctrl+S diam-diam tidak melakukan
  // apa pun seperti sebelumnya (tooltip tombol menjanjikan pintasan ini,
  // tapi listener keydown tidak pernah benar-benar menanganinya).
  const handleSave = useCallback(() => {
    if (isSaving) return;
    const savePromise = (async () => {
      setIsSaving(true);
      try {
        const { persisted } = await onSaveProject(project);
        toast(persisted ? "Proyek tersimpan" : "Tersimpan lokal — server tidak merespons");
      } catch {
        toast("Gagal menyimpan proyek. Coba lagi.");
      } finally {
        setIsSaving(false);
      }
    })();
    pendingSaveRef.current = savePromise;
    savePromise.finally(() => {
      if (pendingSaveRef.current === savePromise) pendingSaveRef.current = null;
    });
  }, [isSaving, onSaveProject, project, toast]);

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

  // Untuk field angka yang diketik bebas (X, Y, Lebar, Tinggi, Ukuran Font):
  // update tampilan secara live per keystroke TANPA menulis ke riwayat
  // undo/redo. Riwayat baru dicatat sekali saat field kehilangan fokus
  // (lihat commitHistory di onBlur) — supaya Ctrl+Z membatalkan satu
  // pengeditan penuh, bukan mundur satu digit/karakter setiap kali.
  const updateNumericField = useCallback((id: string, key: "x" | "y" | "width" | "height" | "fontSize", raw: string) => {
    const parsed = parseFloat(raw);
    if (Number.isNaN(parsed)) return;
    updateElement(id, { [key]: parsed } as Partial<CanvasElement>);
  }, [updateElement]);

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

  const handleResizeMouseDown = (e: React.MouseEvent, id: string, handle: ResizeHandle) => {
    e.stopPropagation();
    const el = project.elements.find((x) => x.id === id);
    if (!el) return;
    setSelectedId(id);
    isResizingRef.current = true;
    resizeStartRef.current = { x: e.clientX, y: e.clientY, elX: el.x, elY: el.y, elWidth: el.width, elHeight: el.height, handle };
  };

  // Commit snapshot elements saat ini ke riwayat undo/redo. Dipakai saat
  // sebuah interaksi "selesai" (mouseup setelah drag/resize, atau blur pada
  // input teks/angka) — supaya satu interaksi = satu langkah undo, bukan satu
  // langkah per event (per pixel drag, atau per keystroke saat mengetik).
  const commitHistory = useCallback(() => {
    setProject((p) => { pushHistory(p.elements); return p; });
  }, [pushHistory]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      if (isResizingRef.current && selectedId) {
        const dx = ((e.clientX - resizeStartRef.current.x) / rect.width) * 100;
        const dy = ((e.clientY - resizeStartRef.current.y) / rect.height) * 100;
        const el = elementsRef.current.find((x) => x.id === selectedId);

        const geometry = computeResize(
          {
            x: resizeStartRef.current.elX,
            y: resizeStartRef.current.elY,
            width: resizeStartRef.current.elWidth,
            height: resizeStartRef.current.elHeight,
          },
          resizeStartRef.current.handle,
          dx,
          dy,
          !!el?.isLockedX
        );

        setProject((p) => ({
          ...p,
          elements: p.elements.map((x) => (x.id === selectedId ? { ...x, ...geometry } : x)),
        }));
        return;
      }

      if (!isDraggingRef.current || !selectedId) return;

      // Pergerakan mouse dalam persentase kanvas: rect.width sudah mencakup
      // efek zoom (canvas dirender pada 400*zoom px), jadi TIDAK perlu dibagi
      // zoom lagi di sini — dulu dibagi dua kali sehingga drag terasa lamban
      // saat zoom-in dan terlalu sensitif saat zoom-out.
      const dx = ((e.clientX - dragStartRef.current.x) / rect.width) * 100;
      const dy = ((e.clientY - dragStartRef.current.y) / rect.height) * 100;

      let tx = clampToCanvas(dragStartRef.current.elX + dx);
      let ty = clampToCanvas(dragStartRef.current.elY + dy);

      const elTypeObj = elementsRef.current.find((e) => e.id === selectedId);
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
      if (isDraggingRef.current || isResizingRef.current) {
        isDraggingRef.current = false;
        isResizingRef.current = false;
        setActiveGuides([]);
        commitHistory();
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [selectedId, commitHistory]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;

      if (e.ctrlKey && e.key === "z") { e.preventDefault(); handleUndo(); return; }
      if (e.ctrlKey && e.key === "y") { e.preventDefault(); handleRedo(); return; }
      if (e.ctrlKey && e.key === "d") { e.preventDefault(); duplicateSelected(); return; }
      if (e.ctrlKey && e.key === "s") { e.preventDefault(); handleSave(); return; }
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
  }, [selectedId, handleUndo, handleRedo, duplicateSelected, deleteSelected, handleSave, updateElement, project.elements]);


  const selectedEl = project.elements.find((e) => e.id === selectedId);
  const ratio = getCardRatio(project.printSize);
  const canvasW = 400 * zoom;
  const canvasH = Math.round(canvasW / ratio);
  const mikaRect = getMikaOverlayRect(project.printSize);

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
      <header className="h-14 bg-white border-b border-stone-200 flex items-center px-3 gap-1.5 shrink-0 z-30 overflow-x-auto overflow-y-hidden">
        <IconButton
          onClick={async () => {
            // Kalau ada save yang masih berjalan, tunggu dulu supaya tidak
            // pindah halaman sebelum perubahan terakhir benar-benar tersimpan.
            if (pendingSaveRef.current) await pendingSaveRef.current;
            onBackToDashboard();
          }}
          title="Kembali ke Dashboard"
        >
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

        <IconButton
          onClick={() => setShowPropertiesPanel((v) => !v)}
          variant={showPropertiesPanel ? "active" : "default"}
          title="Panel Properti"
          className="lg:hidden"
        >
          <PanelRight size={16} />
        </IconButton>

        <Button
          variant="secondary"
          size="sm"
          disabled={isSaving}
          onClick={handleSave}
          title="Simpan Proyek (Ctrl+S)"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={isExporting}
          onClick={async () => {
            setIsExporting(true);
            try {
              await onExport(project);
            } catch {
              toast("Gagal mengekspor proyek. Coba lagi.");
              setIsExporting(false);
            }
          }}
          title="Ekspor ke PDF atau Print"
        >
          {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Export / Print
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
          className="flex-grow min-w-0 bg-stone-100 overflow-auto flex items-center justify-center p-10 relative"
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
            {/* Tekstur Bahan SVG Overlay (parameter sinkron dengan lib/materialTexture.ts, dipakai juga oleh pipeline ekspor) */}
            <svg
              className="absolute inset-0 pointer-events-none w-full h-full rounded-lg"
              style={{ zIndex: 1, opacity: MATERIAL_TEXTURE_OPACITY, mixBlendMode: MATERIAL_TEXTURE_BLEND_MODE }}
            >
              <filter id="leather-texture">
                <feTurbulence type="fractalNoise" baseFrequency={MATERIAL_TEXTURE_BASE_FREQUENCY} numOctaves={MATERIAL_TEXTURE_NUM_OCTAVES} result="noise" />
                <feColorMatrix type="matrix" values={MATERIAL_TEXTURE_COLOR_MATRIX_VALUES} />
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
              {sortByZIndex(project.elements).map((el) => {
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
                      <svg
                        x={ex} y={ey} width={ew} height={eh}
                        viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"
                        dangerouslySetInnerHTML={{ __html: getLogoIconMarkup(el.logoIcon || "sparkles", el.color || "#000") }}
                      />
                    )}
                    {el.type === "text" && el.text && (
                      <CanvasFitText
                        el={el}
                        boxWidthPx={(el.width / 100) * canvasW}
                        boxHeightPx={(el.height / 100) * canvasH}
                        canvasWidthPx={canvasW}
                      />
                    )}
                    {el.type === "custom_svg" && el.customSvg && (
                      <g dangerouslySetInnerHTML={{
                        __html: prepareCustomSvgMarkup(
                          el.customSvg,
                          el.color || '#000000',
                          `x="${el.x}%" y="${el.y}%" width="${el.width}%" height="${el.height}%" overflow="visible"`
                        )
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
                        {/* 8 Anchor points (resize handles) */}
                        {([
                          { handle: "nw", cx: el.x, cy: el.y },
                          { handle: "n", cx: el.x + el.width / 2, cy: el.y },
                          { handle: "ne", cx: el.x + el.width, cy: el.y },
                          { handle: "w", cx: el.x, cy: el.y + el.height / 2 },
                          { handle: "e", cx: el.x + el.width, cy: el.y + el.height / 2 },
                          { handle: "sw", cx: el.x, cy: el.y + el.height },
                          { handle: "s", cx: el.x + el.width / 2, cy: el.y + el.height },
                          { handle: "se", cx: el.x + el.width, cy: el.y + el.height },
                        ] as { handle: ResizeHandle; cx: number; cy: number }[]).map(({ handle, cx, cy }) => (
                          <rect
                            key={handle}
                            x={`${cx}%`} y={`${cy}%`}
                            width="7" height="7" rx="1.5" transform="translate(-3.5, -3.5)"
                            fill="#0d9488" stroke="#fff" strokeWidth="1"
                            style={{ cursor: RESIZE_CURSORS[handle] }}
                            onMouseDown={(e) => handleResizeMouseDown(e, el.id, handle)}
                          />
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
                x={`${mikaRect.xPct}%`}
                y={`${mikaRect.yPct}%`}
                width={`${mikaRect.widthPct}%`}
                height={`${mikaRect.heightPct}%`}
                preserveAspectRatio="none"
                pointerEvents="none"
              />
            </svg>
          </div>
        </section>

        {/* Backdrop panel properti (hanya tampil di layar sempit saat panel dibuka) */}
        {showPropertiesPanel && (
          <div
            className="fixed inset-0 bg-stone-900/30 z-40 lg:hidden"
            onClick={() => setShowPropertiesPanel(false)}
          />
        )}

        {/* ─── RIGHT PANEL ────────────────────────────────────────────── */}
        <div
          className={cn(
            "w-80 max-w-[85vw] bg-white border-l border-stone-200 flex flex-col shrink-0",
            "fixed inset-y-0 right-0 z-50 transition-transform duration-200 ease-out",
            showPropertiesPanel ? "translate-x-0" : "translate-x-full",
            "lg:static lg:inset-auto lg:translate-x-0 lg:z-auto lg:transition-none"
          )}
        >
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
                            <button
                              key={c.hex}
                              type="button"
                              onClick={() => setProject({...project, materialColor: c.hex})}
                              className={cn(
                                "w-full aspect-square rounded-md cursor-pointer border-2",
                                project.materialColor === c.hex || (!project.materialColor && project.backgroundColor === c.hex)
                                  ? "border-brand-500 shadow-sm"
                                  : "border-stone-200"
                              )}
                              style={{backgroundColor: c.hex}}
                              title={c.name}
                              aria-label={c.name}
                              aria-pressed={project.materialColor === c.hex || (!project.materialColor && project.backgroundColor === c.hex)}
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
                          <input type="number" value={selectedEl.x} onChange={(e) => updateNumericField(selectedEl.id, "x", e.target.value)} onBlur={commitHistory} className={cn(fieldClass, "w-full")} />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-stone-400 uppercase mb-1 block">Y</label>
                          <input type="number" value={selectedEl.y} onChange={(e) => updateNumericField(selectedEl.id, "y", e.target.value)} onBlur={commitHistory} className={cn(fieldClass, "w-full")} />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-stone-400 uppercase mb-1 block">Lebar</label>
                          <input type="number" value={selectedEl.width} onChange={(e) => updateNumericField(selectedEl.id, "width", e.target.value)} onBlur={commitHistory} className={cn(fieldClass, "w-full")} />
                        </div>
                        {selectedEl.type !== 'text' && (
                          <div>
                            <label className="text-[10px] font-bold text-stone-400 uppercase mb-1 block">Tinggi</label>
                            <input type="number" value={selectedEl.height} onChange={(e) => updateNumericField(selectedEl.id, "height", e.target.value)} onBlur={commitHistory} className={cn(fieldClass, "w-full")} />
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
                            onChange={(e) => updateElement(selectedId!, { text: e.target.value })}
                            onBlur={commitHistory}
                            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                            placeholder="Ketik teks..."
                          />

                          <div>
                            <label className="text-[10px] font-bold text-stone-400 uppercase mb-1 block">Ukuran Font</label>
                            <input
                              type="number"
                              list="font-sizes"
                              className={cn(fieldClass, "w-full")}
                              value={selectedEl.fontSize || 14}
                              onChange={(e) => updateNumericField(selectedId!, "fontSize", e.target.value)}
                              onBlur={commitHistory}
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
                            <button type="button" onClick={() => commitUpdate(selectedId!, { color: "#FFFFFF" })} className={cn("w-8 h-8 rounded-lg border-2 cursor-pointer", selectedEl.color === "#FFFFFF" ? "border-brand-500 shadow-sm" : "border-stone-300")} style={{backgroundColor: "#FFFFFF"}} title="Putih" aria-label="Putih" aria-pressed={selectedEl.color === "#FFFFFF"}></button>
                            <button type="button" onClick={() => commitUpdate(selectedId!, { color: "#111111" })} className={cn("w-8 h-8 rounded-lg border-2 cursor-pointer", selectedEl.color === "#111111" ? "border-brand-500 shadow-sm" : "border-stone-300")} style={{backgroundColor: "#111111"}} title="Hitam" aria-label="Hitam" aria-pressed={selectedEl.color === "#111111"}></button>
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
                    {LOGO_ICON_LIST.map(s => (
                      <button key={s.icon} onClick={() => addElement('logo', {logoIcon: s.icon, width: 15, height: 15})} className="flex flex-col items-center p-2.5 bg-stone-50 border border-stone-200 hover:border-brand-300 hover:bg-brand-50/50 rounded-lg transition cursor-pointer">
                        <svg
                          className="w-6 h-6 fill-current text-stone-600 mb-1" viewBox="0 0 100 100"
                          dangerouslySetInnerHTML={{ __html: getLogoIconMarkup(s.icon, "currentColor") }}
                        />
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
