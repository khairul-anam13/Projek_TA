"use client";

import React, { useState, useRef, useEffect } from "react";
import { CanvasElement, DesignProject } from "../lib/types";
import { DEFAULT_PROJECTS } from "../lib/templates";
import {
  Undo,
  Redo,
  Save,
  Download,
  Plus,
  Type,
  Square,
  Sparkles,
  Layers,
  Trash2,
  Minimize,
  BringToFront,
  SendToBack,
  ZoomIn,
  Move,
  Grid,
  ChevronLeft,
  ChevronRight,
  Printer,
  Copy,
  FolderOpen
} from "lucide-react";

interface EditorPageProps {
  project: DesignProject;
  onBackToDashboard: () => void;
  onSaveProject: (updatedProject: DesignProject) => void;
  onExport: (project: DesignProject) => void;
}

const PRESET_FONTS = ["Inter", "Space Grotesk", "Outfit", "Playfair Display", "JetBrains_Mono"];

// pure ID generator outside component
function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}`;
}

export default function EditorPage({
  project: initialProject,
  onBackToDashboard,
  onSaveProject,
  onExport,
}: EditorPageProps) {
  const [project, setProject] = useState<DesignProject>(initialProject);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeLeftTab, setActiveLeftTab] = useState<"templates" | "text" | "shapes" | "logo" | "background">("templates");
  const [zoom, setZoom] = useState<number>(1); // Zoom multiplier (1, 1.25, 1.5)
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(false);
  const [activeGuides, setActiveGuides] = useState<{ type: "v" | "h"; value: number; label?: string }[]>([]);

  // Undo / Redo stacks
  const [history, setHistory] = useState<CanvasElement[][]>([initialProject.elements]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Drag-and-drop state reference
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; elX: number; elY: number }>({ x: 0, y: 0, elX: 0, elY: 0 });
  const workspaceRef = useRef<HTMLDivElement>(null);

  // Push new state onto the history stack
  const pushHistory = (newElements: CanvasElement[]) => {
    const nextHistory = history.slice(0, historyIndex + 1);
    setHistory([...nextHistory, newElements]);
    setHistoryIndex(nextHistory.length);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setProject((p) => ({ ...p, elements: history[prevIndex] }));
      setSelectedId(null);
      showToast("Tindakan dibatalkan (Undo)");
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setProject((p) => ({ ...p, elements: history[nextIndex] }));
      setSelectedId(null);
      showToast("Tindakan diulang (Redo)");
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Set selected element properties
  const updateElement = (id: string, updates: Partial<CanvasElement>) => {
    const nextElements = project.elements.map((el) => {
      if (el.id === id) {
        return { ...el, ...updates };
      }
      return el;
    });
    setProject((p) => ({ ...p, elements: nextElements }));
    pushHistory(nextElements);
  };

  // Add a new element to the canvas
  const addElement = (type: "text" | "shape" | "logo", initialProps: Partial<CanvasElement>) => {
    const id = generateId("el");
    const zIndex = project.elements.reduce((max, el) => Math.max(max, el.zIndex), 0) + 1;
    
    const newElement: CanvasElement = {
      id,
      type,
      x: 35, // default centered percentage
      y: 40,
      width: type === "text" ? 40 : 15,
      height: type === "text" ? 8 : 10,
      zIndex,
      ...initialProps,
    };

    const nextElements = [...project.elements, newElement];
    setProject((p) => ({ ...p, elements: nextElements }));
    setSelectedId(id);
    pushHistory(nextElements);
    showToast(`Ditambahkan objek ${type}`);
  };

  // Remove selected element
  const deleteSelectedElement = () => {
    if (!selectedId) return;
    const nextElements = project.elements.filter((el) => el.id !== selectedId);
    setProject((p) => ({ ...p, elements: nextElements }));
    setSelectedId(null);
    pushHistory(nextElements);
    showToast("Objek berhasil dihapus");
  };

  // Duplicate selected element
  const duplicateSelectedElement = () => {
    const el = project.elements.find((e) => e.id === selectedId);
    if (!el) return;
    const nextId = generateId("el");
    const nextZ = project.elements.reduce((max, e) => Math.max(max, e.zIndex), 0) + 1;
    
    const duplicated: CanvasElement = {
      ...el,
      id: nextId,
      x: Math.min(el.x + 4, 80),
      y: Math.min(el.y + 4, 80),
      zIndex: nextZ,
    };

    const nextElements = [...project.elements, duplicated];
    setProject((p) => ({ ...p, elements: nextElements }));
    setSelectedId(nextId);
    pushHistory(nextElements);
    showToast("Objek digandakan");
  };

  // Send element backward or forward
  const changeLayer = (direction: "front" | "back") => {
    if (!selectedId) return;
    const el = project.elements.find((e) => e.id === selectedId);
    if (!el) return;

    const currentZ = el.zIndex;
    let nextZ = currentZ;

    if (direction === "front") {
      nextZ = project.elements.reduce((max, e) => Math.max(max, e.zIndex), 0) + 1;
    } else {
      const minZ = project.elements.reduce((min, e) => Math.min(min, e.zIndex), 0);
      nextZ = Math.max(0, minZ - 1);
    }

    updateElement(selectedId, { zIndex: nextZ });
    showToast(direction === "front" ? "Bawa ke depan" : "Kirim ke belakang");
  };

  // Mouse event handlers for SVG move dragging
  const handleElementMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const el = project.elements.find((x) => x.id === id);
    if (!el) return;

    setSelectedId(id);
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      elX: el.x,
      elY: el.y,
    };
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !selectedId || !workspaceRef.current) return;
      
      const rect = workspaceRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;

      // Translate px movement into percentage (scaled by zoom)
      const percentDeltaX = (deltaX / rect.width) * 100 / zoom;
      const percentDeltaY = (deltaY / rect.height) * 100 / zoom;

      let targetX = Math.max(0, Math.min(100, dragStartRef.current.elX + percentDeltaX));
      let targetY = Math.max(0, Math.min(100, dragStartRef.current.elY + percentDeltaY));

      const activeSnapGuides: { type: "v" | "h"; value: number; label?: string }[] = [];

      // Find the moving elements metrics
      const curEl = project.elements.find((e) => e.id === selectedId);
      if (curEl) {
        const w = curEl.width || 10;
        const h = curEl.height || 10;
        
        // Snap Threshold in percentage (about 1.25% gives cozy magnetic feel)
        const snapThreshold = 1.35;

        // --- X Axis (Vertical Alignment lines) ---
        let bestDiffX = snapThreshold;
        let snapX: number | null = null;
        let matchingValueX: number | null = null;
        let labelX = "";

        // Standard guide lines (Safe areas, margins, centers)
        const canvasXGuides = [
          { val: 6, label: "Garis Kiri Aman (6%)" },
          { val: 50, label: "Tengah Horisontal (50%)" },
          { val: 94, label: "Garis Kanan Aman (94%)" }
        ];

        // Other elements' landmarks
        const otherXGuides: { val: number; label: string }[] = [];
        project.elements.forEach((oth) => {
          if (oth.id !== selectedId) {
            const labelStr = oth.text ? `"${oth.text.substring(0, 10)}..."` : oth.type;
            otherXGuides.push({ val: oth.x, label: `Rata Kiri dgn ${labelStr}` });
            otherXGuides.push({ val: parseFloat((oth.x + (oth.width || 10) / 2).toFixed(2)), label: `Rata Tengah dgn ${labelStr}` });
            otherXGuides.push({ val: oth.x + (oth.width || 10), label: `Rata Kanan dgn ${labelStr}` });
          }
        });

        const allXCandidates = [...canvasXGuides, ...otherXGuides];

        // Check Left edge
        allXCandidates.forEach((cand) => {
          const diff = Math.abs(targetX - cand.val);
          if (diff < bestDiffX) {
            bestDiffX = diff;
            snapX = cand.val;
            matchingValueX = cand.val;
            labelX = cand.label;
          }
        });

        // Check Center
        allXCandidates.forEach((cand) => {
          const diff = Math.abs((targetX + w / 2) - cand.val);
          if (diff < bestDiffX) {
            bestDiffX = diff;
            snapX = cand.val - w / 2;
            matchingValueX = cand.val;
            labelX = cand.label;
          }
        });

        // Check Right edge
        allXCandidates.forEach((cand) => {
          const diff = Math.abs((targetX + w) - cand.val);
          if (diff < bestDiffX) {
            bestDiffX = diff;
            snapX = cand.val - w;
            matchingValueX = cand.val;
            labelX = cand.label;
          }
        });

        if (snapX !== null && matchingValueX !== null) {
          targetX = snapX;
          activeSnapGuides.push({
            type: "v",
            value: matchingValueX,
            label: labelX
          });
        }

        // --- Y Axis (Horizontal Alignment lines) ---
        let bestDiffY = snapThreshold;
        let snapY: number | null = null;
        let matchingValueY: number | null = null;
        let labelY = "";

        const canvasYGuides = [
          { val: 6, label: "Batas Atas Aman (6%)" },
          { val: 50, label: "Tengah Vertikal (50%)" },
          { val: 94, label: "Batas Bawah Aman (94%)" }
        ];

        const otherYGuides: { val: number; label: string }[] = [];
        project.elements.forEach((oth) => {
          if (oth.id !== selectedId) {
            const labelStr = oth.text ? `"${oth.text.substring(0, 10)}..."` : oth.type;
            otherYGuides.push({ val: oth.y, label: `Rata Atas dgn ${labelStr}` });
            otherYGuides.push({ val: parseFloat((oth.y + (oth.height || 10) / 2).toFixed(2)), label: `Rata Tengah dgn ${labelStr}` });
            otherYGuides.push({ val: oth.y + (oth.height || 10), label: `Rata Bawah dgn ${labelStr}` });
          }
        });

        const allYCandidates = [...canvasYGuides, ...otherYGuides];

        // Check Top edge
        allYCandidates.forEach((cand) => {
          const diff = Math.abs(targetY - cand.val);
          if (diff < bestDiffY) {
            bestDiffY = diff;
            snapY = cand.val;
            matchingValueY = cand.val;
            labelY = cand.label;
          }
        });

        // Check Center
        allYCandidates.forEach((cand) => {
          const diff = Math.abs((targetY + h / 2) - cand.val);
          if (diff < bestDiffY) {
            bestDiffY = diff;
            snapY = cand.val - h / 2;
            matchingValueY = cand.val;
            labelY = cand.label;
          }
        });

        // Check Bottom edge
        allYCandidates.forEach((cand) => {
          const diff = Math.abs((targetY + h) - cand.val);
          if (diff < bestDiffY) {
            bestDiffY = diff;
            snapY = cand.val - h;
            matchingValueY = cand.val;
            labelY = cand.label;
          }
        });

        if (snapY !== null && matchingValueY !== null) {
          targetY = snapY;
          activeSnapGuides.push({
            type: "h",
            value: matchingValueY,
            label: labelY
          });
        }
      }

      // If Smart Snap is disabled or did not match, fallback to standard 2.5% increments if snapToGrid is checked
      if (snapToGrid && activeSnapGuides.length === 0) {
        targetX = Math.round(targetX / 2.5) * 2.5;
        targetY = Math.round(targetY / 2.5) * 2.5;
      }

      // Expose the guidelines globally
      setActiveGuides(activeSnapGuides);

      // Quietly update element coordinates in real-time
      setProject((p) => {
        const nextElements = p.elements.map((el) => {
          if (el.id === selectedId) {
            return { ...el, x: parseFloat(targetX.toFixed(2)), y: parseFloat(targetY.toFixed(2)) };
          }
          return el;
        });
        return { ...p, elements: nextElements };
      });
    };

    const handleGlobalMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setActiveGuides([]); // Reset visual guide lines instantly when letting go
        // Lock history on release
        pushHistory(project.elements);
      }
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [selectedId, project.elements, zoom, snapToGrid]);

  const handleWorkspaceClick = () => {
    setSelectedId(null);
  };

  // Keyboard shortcuts & precision nudging controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedId) return;

      const activeElTag = document.activeElement?.tagName;
      if (activeElTag === "INPUT" || activeElTag === "TEXTAREA" || activeElTag === "SELECT") {
        return;
      }

      const step = e.shiftKey ? 5 : 1;
      let dx = 0;
      let dy = 0;

      if (e.key === "ArrowUp") dy = -step;
      else if (e.key === "ArrowDown") dy = step;
      else if (e.key === "ArrowLeft") dx = -step;
      else if (e.key === "ArrowRight") dx = step;
      else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelectedElement();
        return;
      } else if (e.ctrlKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handleUndo();
        return;
      } else if (e.ctrlKey && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
        return;
      } else if (e.ctrlKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelectedElement();
        return;
      } else {
        return;
      }

      e.preventDefault();

      let nextEls = project.elements.map((el) => {
        if (el.id === selectedId) {
          const nextX = parseFloat(Math.max(0, Math.min(100, el.x + dx)).toFixed(2));
          const nextY = parseFloat(Math.max(0, Math.min(100, el.y + dy)).toFixed(2));
          return { ...el, x: nextX, y: nextY };
        }
        return el;
      });

      setProject((p) => ({ ...p, elements: nextEls }));
      pushHistory(nextEls);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedId, project.elements, historyIndex, history, pushHistory, deleteSelectedElement, handleUndo, handleRedo, duplicateSelectedElement]);

  // Quick preload standard project templates
  const applyPresetTemplate = (presetId: string) => {
    const found = DEFAULT_PROJECTS.find((p) => p.id === presetId);
    if (!found) return;
    setProject((prev) => ({
      ...prev,
      backgroundColor: found.backgroundColor,
      elements: found.elements,
      palette: found.palette,
      typography: found.typography,
      layoutType: found.layoutType,
    }));
    setSelectedId(null);
    pushHistory(found.elements);
    showToast(`Template "${found.name}" berhasil diterapkan`);
  };

  // Dynamically apply high-end human design aesthetics to banish generic AI look
  const applyDesignAesthetic = (gaya: "editorial" | "brutalist" | "swiss" | "nusantara") => {
    let bg = "#FDFCFA";
    let titleFont = "Space Grotesk";
    let bodyFont = "Inter";
    let primaryCol = "#1A1A1A";
    let secondaryCol = "#78716C";
    let accentCol = "#D97706";

    if (gaya === "editorial") {
      bg = "#FAF9F5"; // Cream warm chalk
      titleFont = "Playfair Display";
      bodyFont = "Inter";
      primaryCol = "#1C1917"; // Stone charcoal
      secondaryCol = "#78716C"; // Soft warm gray
      accentCol = "#C5A880"; // Muted sage/gold
    } else if (gaya === "brutalist") {
      bg = "#FFFFFF";
      titleFont = "JetBrains Mono";
      bodyFont = "JetBrains Mono";
      primaryCol = "#000000"; // Pure black
      secondaryCol = "#4B5563"; 
      accentCol = "#2563EB"; // Intense electric blue
    } else if (gaya === "swiss") {
      bg = "#F9FAF1"; // Off-white modern
      titleFont = "Outfit";
      bodyFont = "Inter";
      primaryCol = "#0F172A"; // Slate dark
      secondaryCol = "#E11D48"; // Vibrant crimson
      accentCol = "#0F172A";
    } else if (gaya === "nusantara") {
      bg = "#0B2E24"; // Indonesian forest teal
      titleFont = "Playfair Display";
      bodyFont = "Inter";
      primaryCol = "#FFFFFF"; // Pure white text
      secondaryCol = "#E2E8F0";
      accentCol = "#C5A880"; // Luxury Gold
    }

    // Go through current elements and map fonts/colors
    const nextElements = project.elements.map((el) => {
      let updated = { ...el };
      
      // Map texts
      if (el.type === "text") {
        const textLower = el.text?.toLowerCase() || "";
        const isHeader = (el.fontSize && el.fontSize >= 15) || 
                         textLower.includes("laporan") || 
                         textLower.includes("solusi") || 
                         textLower.includes("studio") || 
                         textLower.includes("kop") || 
                         el.id.includes("title") || 
                         el.id.includes("header") || 
                         el.id.includes("comp");
        
        updated.fontFamily = isHeader ? titleFont : bodyFont;
        if (gaya === "editorial") {
          updated.color = isHeader ? primaryCol : secondaryCol;
          if (el.id.includes("role") || el.id.includes("accent")) {
            updated.color = accentCol;
          }
        } else if (gaya === "brutalist") {
          updated.color = isHeader ? primaryCol : "#000000";
          if (el.id.includes("role") || el.id.includes("accent")) {
            updated.color = accentCol;
          }
        } else if (gaya === "swiss") {
          updated.color = isHeader ? primaryCol : "#1E293B";
          if (el.id.includes("role") || el.id.includes("accent") || el.id.includes("contact")) {
            updated.color = secondaryCol;
          }
        } else if (gaya === "nusantara") {
          updated.color = isHeader ? primaryCol : "#E2E8F0";
          if (el.id.includes("role") || el.id.includes("accent") || el.id.includes("border") || el.id.includes("line")) {
            updated.color = accentCol;
          }
        }
      }

      // Map shapes/decorations
      if (el.type === "shape") {
        if (gaya === "editorial") {
          updated.color = el.id.includes("line") || el.id.includes("border") ? accentCol : secondaryCol;
        } else if (gaya === "brutalist") {
          updated.color = primaryCol;
        } else if (gaya === "swiss") {
          updated.color = el.id.includes("accent") || el.id.includes("line") ? secondaryCol : primaryCol;
        } else if (gaya === "nusantara") {
          updated.color = el.id.includes("border") || el.id.includes("line") || el.id.includes("frame") ? accentCol : "#0D4236";
        }
      }

      // Map logos
      if (el.type === "logo") {
        updated.color = accentCol;
      }

      return updated;
    });

    setProject((p) => ({
      ...p,
      backgroundColor: bg,
      palette: {
        primary: primaryCol,
        secondary: secondaryCol,
        accent: accentCol,
        explanation: `Estetika gaya ${gaya} diaplikasikan secara harmonis.`
      },
      typography: {
        title: titleFont,
        body: bodyFont,
        explanation: `Tipografi disesuaikan dengan mood ${gaya}.`
      },
      elements: nextElements,
    }));

    pushHistory(nextElements);
    showToast(`Gaya "${gaya.toUpperCase()}" berhasil diterapkan!`);
  };

  const handleSave = () => {
    onSaveProject(project);
    showToast("Semua perubahan disimpan ke cloud-local.");
  };

  const selectedElement = project.elements.find((el) => el.id === selectedId);

  // Canvas aspect sizing configurations
  const isCard = project.productType === "Kartu Nama";
  const canvasWidth = isCard ? 650 : 420;
  const canvasHeight = isCard ? 390 : 594; // Cards are 5:3, Report is A4 ratio

  // SVG customized drawing mapping according to icon chosen
  const renderLogoStampSvg = (icon: string, color: string) => {
    switch (icon) {
      case "sparkles":
        return (
          <path
            fill={color}
            d="M50,0 L57,37 L94,44 L57,51 L50,88 L43,51 L6,44 L43,37 Z M25,12 L28,21 L37,23 L28,25 L25,34 L22,25 L13,23 L22,21 Z"
          />
        );
      case "mortarboard":
        return (
          <g fill={color}>
            <polygon points="50,15 90,35 50,55 10,35" />
            <polygon points="25,48 25,75 50,88 75,75 75,48 50,60" />
            <polygon points="85,35 85,65 89,68 89,37" />
          </g>
        );
      case "building":
        return (
          <path
            fill={color}
            d="M10,90 L90,90 M20,90 L20,30 L50,10 L80,30 L80,90 M30,40 L40,40 M30,55 L40,55 M30,70 L40,70 M60,40 L70,40 M60,55 L70,55 M60,70 L70,70"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
          />
        );
      case "leaf":
        return (
          <path
            fill={color}
            d="M15,90 C15,90 35,40 85,15 C85,15 80,50 50,75 C30,92 15,90 15,90 M15,90 L40,65"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
          />
        );
      case "shield":
        return (
          <path
            fill={color}
            d="M50,10 C70,10 85,18 85,18 C85,18 85,55 50,85 C15,55 15,18 15,18 C15,18 30,10 50,10 Z M50,22 L50,72 C65,52 73,30 73,30 C73,30 60,25 50,22 Z"
          />
        );
      default:
        return (
          <circle cx="50" cy="50" r="40" fill={color} />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col h-screen overflow-hidden text-slate-800" id="editor-page-layout">
      {/* Undo/Redo toasts */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 p-3 bg-slate-900 border border-slate-700 text-white text-xs rounded-xl shadow-xl z-50 animate-fade-in font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modern Top Header Toolbar */}
      <header className="bg-white border-b border-slate-200 h-14 flex items-center justify-between px-4 shrink-0 z-30" id="editor-header">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 cursor-pointer text-xs font-bold flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
          
          <div className="h-4 w-px bg-slate-200" />
          
          <div className="flex items-center gap-1 text-slate-800 font-bold text-xs sm:text-sm">
            <span>Editor: {project.name}</span>
            <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md font-mono">{project.productType}</span>
          </div>
        </div>

        {/* Central visual control adjustments */}
        <div className="flex items-center gap-2">
          {/* Undo/Redo Stack controls */}
          <button
            onClick={handleUndo}
            disabled={historyIndex === 0}
            className="p-2 hover:bg-slate-100 disabled:opacity-30 rounded-lg cursor-pointer text-slate-600"
            title="Undo"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 hover:bg-slate-100 disabled:opacity-30 rounded-lg cursor-pointer text-slate-600"
            title="Redo"
          >
            <Redo className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-200" />

          {/* Zoom Multipliers */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5">
            <button
              onClick={() => setZoom(1)}
              className={`px-2 py-1 text-[10px] font-mono font-bold rounded ${zoom === 1 ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}
            >
              100%
            </button>
            <button
              onClick={() => setZoom(1.15)}
              className={`px-2 py-1 text-[10px] font-mono font-bold rounded ${zoom === 1.15 ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}
            >
              115%
            </button>
            <button
              onClick={() => setZoom(1.3)}
              className={`px-2 py-1 text-[10px] font-mono font-bold rounded ${zoom === 1.3 ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}
            >
              130%
            </button>
          </div>
        </div>

        {/* Action button panel */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Simpan</span>
          </button>

          <button
            onClick={() => onExport(project)}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm shadow-blue-100"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor / Mockup</span>
          </button>
        </div>
      </header>

      {/* Editor visual Workspace blocks */}
      <div className="flex-grow flex overflow-hidden">
        
        {/* LEFT COLLAPSIBLE PANEL: Canva tab menus */}
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0">
          {/* Top category selectors icons */}
          <div className="grid grid-cols-5 border-b border-slate-100 bg-slate-50 text-center text-slate-400 shrink-0">
            <button
              onClick={() => setActiveLeftTab("templates")}
              className={`py-3 flex flex-col items-center justify-center gap-1 cursor-pointer border-b-2 ${activeLeftTab === "templates" ? "border-blue-600 text-blue-600 bg-white" : "border-transparent hover:text-slate-700"}`}
            >
              <Grid className="w-4 h-4" />
              <span className="text-[9px] font-bold">Template</span>
            </button>
            <button
              onClick={() => setActiveLeftTab("text")}
              className={`py-3 flex flex-col items-center justify-center gap-1 cursor-pointer border-b-2 ${activeLeftTab === "text" ? "border-blue-600 text-blue-600 bg-white" : "border-transparent hover:text-slate-700"}`}
            >
              <Type className="w-4 h-4" />
              <span className="text-[9px] font-bold">Teks</span>
            </button>
            <button
              onClick={() => setActiveLeftTab("logo")}
              className={`py-3 flex flex-col items-center justify-center gap-1 cursor-pointer border-b-2 ${activeLeftTab === "logo" ? "border-blue-600 text-blue-600 bg-white" : "border-transparent hover:text-slate-700"}`}
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-[9px] font-bold">Stempel</span>
            </button>
            <button
              onClick={() => setActiveLeftTab("shapes")}
              className={`py-3 flex flex-col items-center justify-center gap-1 cursor-pointer border-b-2 ${activeLeftTab === "shapes" ? "border-blue-600 text-blue-600 bg-white" : "border-transparent hover:text-slate-700"}`}
            >
              <Square className="w-4 h-4" />
              <span className="text-[9px] font-bold">Bentuk</span>
            </button>
            <button
              onClick={() => setActiveLeftTab("background")}
              className={`py-3 flex flex-col items-center justify-center gap-1 cursor-pointer border-b-2 ${activeLeftTab === "background" ? "border-blue-600 text-blue-600 bg-white" : "border-transparent hover:text-slate-700"}`}
            >
              <Printer className="w-4 h-4" />
              <span className="text-[9px] font-bold">Kanvas</span>
            </button>
          </div>

          {/* Tab contents window */}
          <div className="flex-grow p-4 overflow-y-auto space-y-4">
            
            {/* 1. Templates selector tab */}
            {activeLeftTab === "templates" && (
              <div className="space-y-4">
                {/* Visual Premium Design Aesthetic Presets */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="flex items-center gap-1.5 text-blue-600">
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Estetika Gaya Premium</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal font-medium">Beralih ke desain premium dengan font & skema warna terkurasi manual (antitesis AI generik).</p>
                  
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      onClick={() => applyDesignAesthetic("editorial")}
                      className="p-2 bg-white hover:bg-amber-50/30 border border-slate-200 hover:border-slate-350 rounded-lg text-left cursor-pointer transition shadow-xs flex flex-col gap-0.5"
                    >
                      <span className="text-[10px] font-bold text-slate-800 font-serif">⚜ Editorial</span>
                      <span className="text-[8px] text-slate-400 font-medium">Anggun, Bersih, Seni</span>
                    </button>
                    
                    <button
                      onClick={() => applyDesignAesthetic("swiss")}
                      className="p-2 bg-white hover:bg-rose-50/30 border border-slate-200 hover:border-slate-350 rounded-lg text-left cursor-pointer transition shadow-xs flex flex-col gap-0.5"
                    >
                      <span className="text-[10px] font-black text-slate-800 font-sans tracking-tight">❖ Swiss Modern</span>
                      <span className="text-[8px] text-slate-400 font-medium">Kontras, Asimetris, Keren</span>
                    </button>
                    
                    <button
                      onClick={() => applyDesignAesthetic("brutalist")}
                      className="p-2 bg-white hover:bg-zinc-100 border border-slate-200 hover:border-slate-350 rounded-lg text-left cursor-pointer transition shadow-xs flex flex-col gap-0.5"
                    >
                      <span className="text-[10px] font-black text-slate-800 font-mono">[⊞] Brutalist</span>
                      <span className="text-[8px] text-slate-400 font-medium font-mono text-[7px]">Sederhana, Monokrom, Dev</span>
                    </button>
                    
                    <button
                      onClick={() => applyDesignAesthetic("nusantara")}
                      className="p-2 bg-white hover:bg-emerald-50/30 border border-slate-200 hover:border-slate-350 rounded-lg text-left cursor-pointer transition shadow-xs flex flex-col gap-0.5"
                    >
                      <span className="text-[10px] font-bold text-slate-800 font-serif text-emerald-700">⚔ Nusantara</span>
                      <span className="text-[8px] text-slate-400 font-medium">Mewah, Resmi, Emas</span>
                    </button>
                  </div>
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-200/60"></div>
                  <span className="flex-shrink mx-3 text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">Layout Dasar</span>
                  <div className="flex-grow border-t border-slate-200/60"></div>
                </div>

                <div>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">Preset Layout Industri</p>
                  <div className="space-y-2">
                    {DEFAULT_PROJECTS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => applyPresetTemplate(p.id)}
                        className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-blue-300 rounded-xl text-left transition flex items-center justify-between group cursor-pointer"
                      >
                        <div>
                          <span className="block text-xs font-bold text-slate-900 line-clamp-1">{p.name}</span>
                          <span className="block text-[9px] text-slate-400 mt-0.5">{p.productType} &bull; {p.layoutType}</span>
                        </div>
                        <FolderOpen className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. Add text element tab menu */}
            {activeLeftTab === "text" && (
              <div className="space-y-2.5">
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">Tambahkan Teks Baru</p>
                <button
                  onClick={() => addElement("text", {
                    text: "JUDUL UTAMA BARU",
                    fontSize: 22,
                    fontWeight: "bold",
                    fontFamily: project.typography?.title || "Space Grotesk",
                    color: project.palette?.accent || "#3B82F6",
                    width: 70,
                    height: 8,
                    align: "center"
                  })}
                  className="w-full py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left px-4 block text-sm font-extrabold cursor-pointer transition hover:border-slate-300"
                >
                  <span className="text-slate-800 text-lg font-bold block">Teks Judul Besar</span>
                  <span className="text-[10px] text-slate-400 font-medium block">Untuk nama merk, instansi, atau sekolah</span>
                </button>

                <button
                  onClick={() => addElement("text", {
                    text: "Deskripsi pendukung subjudul",
                    fontSize: 13,
                    fontWeight: "medium",
                    fontFamily: project.typography?.body || "Inter",
                    color: "#94A3B8",
                    width: 60,
                    height: 6,
                    align: "center"
                  })}
                  className="w-full py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left px-4 block cursor-pointer transition hover:border-slate-300"
                >
                  <span className="text-slate-700 text-sm font-semibold block">Teks Subjudul</span>
                  <span className="text-[10px] text-slate-400 font-medium block">Untuk peranan jabatan atau slogan</span>
                </button>

                <button
                  onClick={() => addElement("text", {
                    text: "✉ email@contoh.id | ☏ +62 812",
                    fontSize: 9,
                    fontWeight: "normal",
                    fontFamily: "Inter",
                    color: "#CBD5E1",
                    width: 80,
                    height: 5,
                    align: "left"
                  })}
                  className="w-full py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left px-4 block cursor-pointer transition hover:border-slate-300"
                >
                  <span className="text-slate-600 text-xs font-mono block">Data Kontak / Informasi Kecil</span>
                  <span className="text-[10px] text-slate-400 font-medium block">Untuk nisn, alamat kantor, sosial media</span>
                </button>
              </div>
            )}

            {/* 3. Add Custom Vector Icon Stamp logo */}
            {activeLeftTab === "logo" && (
              <div className="space-y-3">
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Pilih Stempel Ornamen Stamp</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: "sparkles", label: "Kilatan Sparkle" },
                    { icon: "mortarboard", label: "Toga Sekolah" },
                    { icon: "building", label: "Gedung Kantor" },
                    { icon: "leaf", label: "Organik Daun" },
                    { icon: "shield", label: "Perisai Keamanan" },
                  ].map((stamp) => (
                    <button
                      key={stamp.icon}
                      onClick={() => addElement("logo", {
                        logoIcon: stamp.icon,
                        width: 10,
                        height: 10,
                        color: project.palette?.accent || "#3B82F6"
                      })}
                      className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition text-center"
                    >
                      <div className="w-8 h-8 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-700">
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 100 100">
                          {renderLogoStampSvg(stamp.icon, "currentColor")}
                        </svg>
                      </div>
                      <span className="text-[10px] text-slate-600 font-semibold">{stamp.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Add Shapes elements tab menu */}
            {activeLeftTab === "shapes" && (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">Elemen Bentuk Geometris</p>
                <button
                  onClick={() => addElement("shape", {
                    shapeType: "rectangle",
                    width: 25,
                    height: 12,
                    color: project.palette?.secondary || "#1E3A8A"
                  })}
                  className="w-full p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-3 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  <span className="w-6 h-4 bg-slate-400 rounded" />
                  <span>Tambah Persegi Panjang</span>
                </button>

                <button
                  onClick={() => addElement("shape", {
                    shapeType: "circle",
                    width: 12,
                    height: 12,
                    color: project.palette?.accent || "#10B981"
                  })}
                  className="w-full p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-3 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  <span className="w-5 h-5 bg-slate-400 rounded-full" />
                  <span>Tambah Lingkaran Bulat</span>
                </button>

                <button
                  onClick={() => addElement("shape", {
                    shapeType: "line",
                    width: 50,
                    height: 2,
                    color: project.palette?.accent || "#F59E0B"
                  })}
                  className="w-full p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-3 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  <span className="w-10 h-0.5 bg-slate-400 block" />
                  <span>Tambah Garis Garis Pembatas</span>
                </button>
              </div>
            )}

            {/* 5. Custom Canvas Background controllers */}
            {activeLeftTab === "background" && (
              <div className="space-y-3">
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Warna Latar Belakang Kanvas</p>
                
                {project.palette && (
                  <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                    <p className="text-[10px] text-blue-700 font-bold uppercase mb-2">Preset Warna Rekomendasi AI</p>
                    <div className="flex gap-2.5">
                      {[project.palette.primary, project.palette.secondary, project.palette.accent, "#FFFFFF", "#111827"].map((hex) => (
                        <button
                          key={hex}
                          onClick={() => setProject((p) => ({ ...p, backgroundColor: hex }))}
                          className="w-8 h-8 rounded-full border border-slate-300 shadow-sm relative shrink-0 cursor-pointer"
                          style={{ backgroundColor: hex }}
                          title={hex}
                        >
                          {project.backgroundColor === hex && (
                            <span className="absolute inset-0 m-auto w-2.5 h-2.5 bg-white rounded-full mix-blend-difference" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Hex background field */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1.5" htmlFor="bg-hex-input">Format Warna Custom Hex</label>
                  <input
                    id="bg-hex-input"
                    type="text"
                    value={project.backgroundColor}
                    onChange={(e) => setProject((p) => ({ ...p, backgroundColor: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono outline-none text-slate-800"
                  />
                </div>

                {/* Visual Grid Helpers and magnets */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Kisi Pembantu & Magnet</p>
                  
                  <div className="flex items-center justify-between" id="toggle-grid-container">
                    <span className="text-xs font-semibold text-slate-600">Tampilkan Kisi Panduan</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showGrid}
                        onChange={(e) => setShowGrid(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between" id="toggle-snap-container">
                    <span className="text-xs font-semibold text-slate-600">Gunakan Magnet (Snap Grid)</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={snapToGrid}
                        onChange={(e) => setSnapToGrid(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <p className="text-[9px] text-slate-400 leading-normal font-medium">Bantuan grid dan magnet mempercepat penataan tata letak (layout) presisi tinggi untuk percetakan.</p>
                </div>
              </div>
            )}
          </div>

          {/* Quick AI palette guide */}
          {project.palette && (
            <div className="p-3.5 bg-amber-50/50 border-t border-slate-100 flex items-center gap-2 shrink-0">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-[10px] text-amber-800 font-medium leading-normal">
                Warna didasarkan konsep <strong className="font-bold">{project.concept}</strong>. Silakan sesuaikan ketebalan font sesuka Anda.
              </p>
            </div>
          )}
        </aside>

        {/* CENTER COLUMN: Interactive Design Canvas and Alignment grid */}
        <section className="flex-grow bg-slate-100 overflow-auto flex items-center justify-center p-8 relative" onClick={handleWorkspaceClick}>
          <div
            className="relative bg-white shadow-2xl transition-all duration-300 border border-slate-300/40 select-none"
            ref={workspaceRef}
            style={{
              width: `${canvasWidth}px`,
              height: `${canvasHeight}px`,
              backgroundColor: project.backgroundColor || "#ffffff",
              transform: `scale(${zoom})`,
              transformOrigin: "center center",
            }}
          >
            {/* Guide Grid lines overlay (active based on showGrid state) */}
            {showGrid && (
              <div 
                className="absolute inset-0 pointer-events-none opacity-[0.06]"
                style={{ 
                  backgroundImage: "linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)", 
                  backgroundSize: "25px 25px"
                }} 
              />
            )}

            {/* SVG Visual Stage Render elements */}
            <svg className="absolute inset-0 w-full h-full" id="svg-canvas-stage">
              {project.elements.map((el) => {
                const elementX = `${el.x}%`;
                const elementY = `${el.y}%`;
                const elementW = `${el.width}%`;
                const elementH = `${el.height}%`;

                // Calculate visual colors
                const isSelected = el.id === selectedId;

                return (
                  <g
                    key={el.id}
                    id={`svg-element-group-${el.id}`}
                    onMouseDown={(e) => handleElementMouseDown(e, el.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="cursor-move"
                  >
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
                            stroke={el.color || "#0F172A"}
                            strokeWidth={el.height || 3}
                          />
                        )}
                      </g>
                    )}

                    {/* Render Custom Logo Stamps */}
                    {el.type === "logo" && (
                      <svg
                        x={elementX}
                        y={elementY}
                        width={elementW}
                        height={elementH}
                        viewBox="0 0 100 100"
                        preserveAspectRatio="xMidYMid meet"
                      >
                        {renderLogoStampSvg(el.logoIcon || "sparkles", el.color || "#000000")}
                      </svg>
                    )}

                    {/* Render Text Content with custom font styles */}
                    {el.type === "text" && (
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
                          fontSize={el.fontSize ? el.fontSize * 1.5 : 16}
                          fontFamily={el.fontFamily || "Inter"}
                          fontWeight={el.fontWeight || "normal"}
                        >
                          {el.text}
                        </text>
                      </svg>
                    )}

                    {/* Gimmick: Selection high-contrast bounding box with professional Figma-like corner anchor points */}
                    {isSelected && (
                      <g>
                        {/* Thin Blue Bounding Box Frame */}
                        <rect
                          x={`${el.x - 0.4}%`}
                          y={`${el.y - 0.4}%`}
                          width={`${el.width + 0.8}%`}
                          height={`${el.height + 0.8}%`}
                          fill="none"
                          stroke="#3B82F6"
                          strokeWidth="1.5"
                          strokeDasharray="3 1.5"
                        />
                        {/* Top-Left Anchor */}
                        <circle
                          cx={`${el.x - 0.4}%`}
                          cy={`${el.y - 0.4}%`}
                          r="4"
                          fill="#FFFFFF"
                          stroke="#2563EB"
                          strokeWidth="1.5"
                        />
                        {/* Top-Right Anchor */}
                        <circle
                          cx={`${el.x + el.width + 0.4}%`}
                          cy={`${el.y - 0.4}%`}
                          r="4"
                          fill="#FFFFFF"
                          stroke="#2563EB"
                          strokeWidth="1.5"
                        />
                        {/* Bottom-Left Anchor */}
                        <circle
                          cx={`${el.x - 0.4}%`}
                          cy={`${el.y + el.height + 0.4}%`}
                          r="4"
                          fill="#FFFFFF"
                          stroke="#2563EB"
                          strokeWidth="1.5"
                        />
                        {/* Bottom-Right Anchor */}
                        <circle
                          cx={`${el.x + el.width + 0.4}%`}
                          cy={`${el.y + el.height + 0.4}%`}
                          r="4"
                          fill="#FFFFFF"
                          stroke="#2563EB"
                          strokeWidth="1.5"
                        />
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Dynamic Visual Magnetic Snapping Guides */}
              {activeGuides.map((guide, idx) => {
                if (guide.type === "v") {
                  return (
                    <g key={`v-guide-${idx}`}>
                      <line
                        x1={`${guide.value}%`}
                        y1="0%"
                        x2={`${guide.value}%`}
                        y2="100%"
                        stroke="#EF4444"
                        strokeWidth="1.2"
                        strokeDasharray="4 2"
                      />
                      {guide.label && (
                        <g transform={`translate(0, 0)`}>
                          {/* Draped text background shadow card */}
                          <rect
                            x={`${guide.value}%`}
                            y="14"
                            width={guide.label.length * 5.5}
                            height="15"
                            rx="3"
                            fill="#FEE2E2"
                            stroke="#EF4444"
                            strokeWidth="0.5"
                            transform={`translate(-${(guide.label.length * 5.5) / 2}, 0)`}
                          />
                          <text
                            x={`${guide.value}%`}
                            y="24"
                            fill="#991B1B"
                            fontSize="8"
                            fontFamily="monospace"
                            fontWeight="extrabold"
                            textAnchor="middle"
                          >
                            {guide.label}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                } else {
                  return (
                    <g key={`h-guide-${idx}`}>
                      <line
                        x1="0%"
                        y1={`${guide.value}%`}
                        x2="100%"
                        y2={`${guide.value}%`}
                        stroke="#EF4444"
                        strokeWidth="1.2"
                        strokeDasharray="4 2"
                      />
                      {guide.label && (
                        <g>
                          <rect
                            x="10"
                            y={`${guide.value}%`}
                            width={guide.label.length * 5.5}
                            height="15"
                            rx="3"
                            fill="#FEE2E2"
                            stroke="#EF4444"
                            strokeWidth="0.5"
                            transform="translate(0, -7.5)"
                          />
                          <text
                            x="14"
                            y={`${guide.value}%`}
                            fill="#991B1B"
                            fontSize="8"
                            fontFamily="monospace"
                            fontWeight="extrabold"
                            dominantBaseline="middle"
                          >
                            {guide.label}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                }
              })}
            </svg>
          </div>
        </section>

        {/* RIGHT PROPERTY COLUMN WORKSPACE: Selected element customization */}
        <aside className="w-80 bg-white border-l border-slate-200 p-5 shrink-0 overflow-y-auto space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 uppercase">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Properti Desain</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 font-semibold">Sesuaikan detail teks, warna, dan perlapisan objek terpilih</p>
          </div>

          {selectedElement ? (
            <div className="space-y-5" id="element-properties-control">
              
              {/* Type and coordinates */}
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200/55">
                <span className="text-[10px] font-mono font-bold capitalize text-slate-500">Objek: {selectedElement.type}</span>
                <span className="text-[9px] font-mono text-slate-400">X: {selectedElement.x}% | Y: {selectedElement.y}%</span>
              </div>

              {/* Penyelarasan Instan Cepat */}
              <div className="space-y-1.5" id="alignment-quick-actions">
                <span className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-500 mb-0.5">Penyelarasan Instan</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => {
                      const el = project.elements.find(e => e.id === selectedElement.id);
                      if (el) {
                        updateElement(selectedElement.id, { x: parseFloat((50 - el.width / 2).toFixed(2)) });
                        showToast("Rata Tengah Horisontal");
                      }
                    }}
                    className="px-2 py-1.5 text-[10px] font-bold bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition text-slate-700"
                  >
                    <span>Rata Tengah X</span>
                  </button>
                  <button
                    onClick={() => {
                      const el = project.elements.find(e => e.id === selectedElement.id);
                      if (el) {
                        updateElement(selectedElement.id, { y: parseFloat((50 - el.height / 2).toFixed(2)) });
                        showToast("Rata Tengah Vertikal");
                      }
                    }}
                    className="px-2 py-1.5 text-[10px] font-bold bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition text-slate-700"
                  >
                    <span>Rata Tengah Y</span>
                  </button>
                  <button
                    onClick={() => {
                      updateElement(selectedElement.id, { x: 6 });
                      showToast("Diposisikan Kiri");
                    }}
                    className="px-2 py-1.5 text-[10px] font-bold bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition text-slate-700"
                  >
                    <span>Garis Kiri Aman</span>
                  </button>
                  <button
                    onClick={() => {
                      const el = project.elements.find(e => e.id === selectedElement.id);
                      if (el) {
                        updateElement(selectedElement.id, { x: parseFloat((94 - el.width).toFixed(2)) });
                        showToast("Diposisikan Kanan");
                      }
                    }}
                    className="px-2 py-1.5 text-[10px] font-bold bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition text-slate-700"
                  >
                    <span>Garis Kanan Aman</span>
                  </button>
                </div>
              </div>

              {/* Editable Text values */}
              {selectedElement.type === "text" && (
                <div className="space-y-1.5" id="text-value-box">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-500 mb-0.5" htmlFor="property-text-value">Isi Kalimat Teks</label>
                  <textarea
                    id="property-text-value"
                    rows={2}
                    value={selectedElement.text || ""}
                    onChange={(e) => updateElement(selectedElement.id, { text: e.target.value })}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all text-slate-800"
                  />
                </div>
              )}

              {/* Fonts family selection */}
              {selectedElement.type === "text" && (
                <div className="space-y-1.5" id="text-font-box">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-500 mb-0.5" htmlFor="property-font-select">Pilihan Keluarga Huruf</label>
                  <select
                    id="property-font-select"
                    value={selectedElement.fontFamily || "Inter"}
                    onChange={(e) => updateElement(selectedElement.id, { fontFamily: e.target.value })}
                    className="w-full text-xs font-bold px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-800"
                  >
                    {PRESET_FONTS.map((font) => (
                      <option key={font} value={font}>{font}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Font Weight selection */}
              {selectedElement.type === "text" && (
                <div className="space-y-1.5" id="text-weight-box">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-500 mb-0.5">Ketebalan Huruf (Weight)</label>
                  <div className="grid grid-cols-3 gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    {["normal", "medium", "bold"].map((weightOpt) => (
                      <button
                        key={weightOpt}
                        onClick={() => updateElement(selectedElement.id, { fontWeight: weightOpt as "normal" | "medium" | "bold" })}
                        className={`py-1 text-[10px] font-bold capitalize rounded cursor-pointer ${selectedElement.fontWeight === weightOpt || (!selectedElement.fontWeight && weightOpt === "normal") ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-700"}`}
                      >
                        {weightOpt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Text aligning styles */}
              {selectedElement.type === "text" && (
                <div className="space-y-1" id="text-align-box">
                  <span className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-500 mb-1.5">Penjajaran Baris</span>
                  <div className="grid grid-cols-3 gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    {["left", "center", "right"].map((alignOpt) => (
                      <button
                        key={alignOpt}
                        onClick={() => updateElement(selectedElement.id, { align: alignOpt as "left" | "center" | "right" })}
                        className={`py-1 text-[10px] font-bold capitalize rounded ${selectedElement.align === alignOpt ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-700"}`}
                      >
                        {alignOpt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Object sizing scale sliders */}
              <div className="space-y-1.5" id="element-size-sliders">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
                  <span>Lebar Objek (% Base)</span>
                  <span>{selectedElement.width}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={selectedElement.width}
                  onChange={(e) => updateElement(selectedElement.id, { width: parseInt(e.target.value) })}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />

                {selectedElement.type === "text" && (
                  <>
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase mt-2">
                      <span>Ukuran Huruf (Font Size)</span>
                      <span>{selectedElement.fontSize || 14} px</span>
                    </div>
                    <input
                      type="range"
                      min="6"
                      max="48"
                      value={selectedElement.fontSize || 14}
                      onChange={(e) => updateElement(selectedElement.id, { fontSize: parseInt(e.target.value) })}
                      className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </>
                )}

                {selectedElement.type !== "text" && (
                  <>
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase mt-2">
                      <span>Tinggi Objek (% Base)</span>
                      <span>{selectedElement.height}%</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="100"
                      value={selectedElement.height}
                      onChange={(e) => updateElement(selectedElement.id, { height: parseInt(e.target.value) })}
                      className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </>
                )}
              </div>

              {/* Object color custom codes */}
              <div className="space-y-1.5" id="element-color-picker">
                <span className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-500 mb-1.5">Kelir Objek</span>
                <div className="flex gap-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <input
                    type="color"
                    value={selectedElement.color || "#000000"}
                    onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })}
                    className="w-8 h-8 rounded border border-slate-200 cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    value={selectedElement.color || ""}
                    onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })}
                    className="w-full text-xs font-mono text-center px-1 py-1 rounded border border-slate-200 text-slate-800"
                    placeholder="#000000"
                  />
                </div>
              </div>

              {/* Layers Ordering controls and alignments */}
              <div className="space-y-2 pt-3 border-t border-slate-100" id="element-arrange-layers">
                <span className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-500 mb-1.5">Tumpukan Lapisan</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => changeLayer("front")}
                    className="p-2 border border-slate-250 rounded-lg hover:bg-slate-50 transition text-[10px] font-bold text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <BringToFront className="w-3.5 h-3.5 text-blue-600" />
                    <span>Lapis Terdepan</span>
                  </button>
                  <button
                    onClick={() => changeLayer("back")}
                    className="p-2 border border-slate-250 rounded-lg hover:bg-slate-50 transition text-[10px] font-bold text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <SendToBack className="w-3.5 h-3.5 text-blue-600" />
                    <span>Lapis Terbawah</span>
                  </button>
                </div>
              </div>

              {/* Delete / Duplicate shortcuts */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100" id="element-actions">
                <button
                  onClick={duplicateSelectedElement}
                  className="p-2 border border-slate-250 rounded-lg bg-white hover:bg-slate-50 hover:border-slate-350 text-[10px] font-bold text-slate-700 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Kloning</span>
                </button>

                <button
                  onClick={deleteSelectedElement}
                  className="p-2 border border-rose-200 rounded-lg bg-rose-50 hover:bg-rose-100 text-[10px] font-bold text-rose-600 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400 text-xs border-2 border-dashed border-slate-100 rounded-xl" id="null-element-properties">
              <Move className="w-8 h-8 text-slate-200 mx-auto mb-2 animate-bounce" />
              <p className="font-semibold text-slate-500">Kanvas Kosong Terpilih</p>
              <p className="max-w-[180px] mx-auto mt-1 leading-normal text-[11px]">
                Silakan ketuk bidang teks, stamp, atau bentuk geometris di tengah untuk merombak dimensinya.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
