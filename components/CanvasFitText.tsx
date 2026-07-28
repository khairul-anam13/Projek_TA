"use client";

import { useMemo } from "react";
import { CanvasElement } from "@/lib/types";
import { computeFitFontSize, scaledInitialFontSize } from "@/lib/textLayout";

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
 */
export default function CanvasFitText({ el, boxWidthPx, boxHeightPx, canvasWidthPx }: CanvasFitTextProps) {
  const fontFamily = el.fontFamily || "Times New Roman";
  const fontWeight = el.fontWeight || "normal";
  const initialFontSize = scaledInitialFontSize(el.fontSize, canvasWidthPx);

  const fontSize = useMemo(
    () => computeFitFontSize(el.text, boxWidthPx, boxHeightPx, initialFontSize, fontFamily, fontWeight),
    [el.text, boxWidthPx, boxHeightPx, initialFontSize, fontFamily, fontWeight]
  );

  if (!el.text || el.text.trim() === "") return null;

  const justifyContent = el.align === "center" ? "center" : el.align === "right" ? "flex-end" : "flex-start";

  return (
    <foreignObject x={`${el.x}%`} y={`${el.y}%`} width={`${el.width}%`} height={`${el.height}%`}>
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent,
          fontFamily,
          fontWeight,
          fontSize: `${fontSize}px`,
          color: el.color || "#000",
          overflow: "hidden",
          wordBreak: "break-word",
          overflowWrap: "anywhere",
          textAlign: el.align || "left",
          lineHeight: 1.35,
          padding: "2px 4px",
          boxSizing: "border-box" as const,
        }}
      >
        {el.text}
      </div>
    </foreignObject>
  );
}
