"use client";

import { useMemo } from "react";
import { CanvasElement } from "@/lib/types";
import { computeFitLayout, scaledInitialFontSize } from "@/lib/textLayout";

interface CanvasFitTextProps {
  el: CanvasElement;
  /** Pixel width of the element's bounding box on the currently rendered canvas. */
  boxWidthPx: number;
  /** Pixel height of the element's bounding box on the currently rendered canvas. */
  boxHeightPx: number;
  /**
   * Total pixel width of the parent canvas (not just this element's box).
   * Used to scale the starting font size relative to BASE_CANVAS_WIDTH_PX so
   * the same element looks proportionally identical whether rendered in the
   * 400px editor canvas, a smaller preview thumbnail, or the high-res export.
   */
  canvasWidthPx: number;
}

/**
 * Renders a text CanvasElement as a wrapped, auto-shrunk foreignObject block,
 * matching the fit logic used by the PDF/PNG export (lib/textLayout.ts) so the
 * on-screen editor/preview never shows text that the final export would have
 * shrunk or wrapped differently.
 *
 * Renders the exact `lines` computed by computeFitLayout (one per row) instead
 * of a single raw text blob left to the browser's own word-wrap — the browser
 * wraps differently at every container width (editor zoom vs. preview
 * thumbnail vs. export canvas), which used to make text disagree between
 * editor/preview and, when it produced more lines than the fit algorithm
 * assumed, overflow and get clipped by the box.
 */
export default function CanvasFitText({ el, boxWidthPx, boxHeightPx, canvasWidthPx }: CanvasFitTextProps) {
  const fontFamily = el.fontFamily || "Times New Roman";
  const fontWeight = el.fontWeight || "normal";
  const initialFontSize = scaledInitialFontSize(el.fontSize, canvasWidthPx);

  const { lines, fontSize } = useMemo(
    () => computeFitLayout(el.text, boxWidthPx, boxHeightPx, initialFontSize, fontFamily, fontWeight),
    [el.text, boxWidthPx, boxHeightPx, initialFontSize, fontFamily, fontWeight]
  );

  if (!el.text || el.text.trim() === "" || lines.length === 0) return null;

  const align = el.align || "left";
  const alignItems = align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start";

  return (
    <foreignObject x={`${el.x}%`} y={`${el.y}%`} width={`${el.width}%`} height={`${el.height}%`}>
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems,
          fontFamily,
          fontWeight,
          fontSize: `${fontSize}px`,
          color: el.color || "#000",
          overflow: "hidden",
          lineHeight: 1.35,
        }}
      >
        {lines.map((line, i) => (
          <div key={i} style={{ whiteSpace: "nowrap" }}>{line}</div>
        ))}
      </div>
    </foreignObject>
  );
}
