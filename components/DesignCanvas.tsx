"use client";

import React, { useId } from "react";
import type { CanvasElement, DesignProject } from "@/lib/types";
import { getMikaRect } from "@/lib/canvasConstraints";
import { logoIconMarkup } from "@/lib/logoIcons";
import { customSvgMarkup } from "@/lib/svgUtils";
import {
  MATERIAL_TEXTURE_OPACITY,
  MATERIAL_TEXTURE_BLEND_MODE,
  MATERIAL_TEXTURE_BASE_FREQUENCY,
  MATERIAL_TEXTURE_NUM_OCTAVES,
  MATERIAL_TEXTURE_COLOR_MATRIX_VALUES,
} from "@/lib/materialTexture";
import CanvasFitText from "./CanvasFitText";

/** Render satu elemen SVG dari data CanvasElement (hanya-baca). */
function SvgElement({
  el,
  canvasWidthPx,
  canvasHeightPx,
}: {
  el: CanvasElement;
  canvasWidthPx: number;
  canvasHeightPx: number;
}) {
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
        <ellipse
          cx={`${el.x + el.width / 2}%`}
          cy={`${el.y + el.height / 2}%`}
          rx={`${el.width / 2}%`}
          ry={`${el.height / 2}%`}
          fill={el.color || "#cccccc"}
        />
      );
    }
    if (el.shapeType === "line") {
      return (
        <line
          x1={ex}
          y1={ey}
          x2={`${el.x + el.width}%`}
          y2={ey}
          stroke={el.color || "#000"}
          strokeWidth={el.height || 2}
        />
      );
    }
  }

  if (el.type === "logo") {
    return (
      <svg
        x={ex}
        y={ey}
        width={ew}
        height={eh}
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        dangerouslySetInnerHTML={{ __html: logoIconMarkup(el.logoIcon, el.color || "#000") }}
      />
    );
  }

  if (el.type === "text") {
    if (!el.text || el.text.trim() === "") return null;
    return (
      <CanvasFitText
        el={el}
        boxWidthPx={(el.width / 100) * canvasWidthPx}
        boxHeightPx={(el.height / 100) * canvasHeightPx}
        canvasWidthPx={canvasWidthPx}
      />
    );
  }

  if (el.type === "custom_svg" && el.customSvg) {
    return (
      <g
        dangerouslySetInnerHTML={{
          __html: customSvgMarkup(
            el.customSvg,
            el.color || "#000000",
            `x="${el.x}%" y="${el.y}%" width="${el.width}%" height="${el.height}%"`
          ),
        }}
      />
    );
  }

  if (el.type === "image" && el.imageUrl) {
    return <image x={ex} y={ey} width={ew} height={eh} href={el.imageUrl} preserveAspectRatio="none" />;
  }

  return null;
}

/** Kanvas desain SVG hanya-baca: dipakai preview flat/3D dan galeri template. */
export function DesignCanvas({
  project,
  width,
  height,
  borderRadius = 8,
  showMika = true,
}: {
  project: Pick<DesignProject, "elements" | "materialColor" | "backgroundColor" | "printSize">;
  width: number;
  height: number;
  borderRadius?: number;
  showMika?: boolean;
}) {
  const filterId = `tex-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const sorted = [...project.elements].sort((a, b) => a.zIndex - b.zIndex);
  const mika = getMikaRect(project.printSize);

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

      {/* Tekstur bahan (parameter sinkron dengan lib/materialTexture.ts, dipakai juga oleh ekspor) */}
      <svg
        className="absolute inset-0 pointer-events-none w-full h-full"
        style={{ zIndex: 11, opacity: MATERIAL_TEXTURE_OPACITY, mixBlendMode: MATERIAL_TEXTURE_BLEND_MODE }}
      >
        <filter id={filterId}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency={MATERIAL_TEXTURE_BASE_FREQUENCY}
            numOctaves={MATERIAL_TEXTURE_NUM_OCTAVES}
            result="noise"
          />
          <feColorMatrix type="matrix" values={MATERIAL_TEXTURE_COLOR_MATRIX_VALUES} />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${filterId})`} />
      </svg>

      <svg className="absolute inset-0 w-full h-full" aria-hidden="true" style={{ zIndex: 20 }}>
        {sorted.map((el) => (
          <SvgElement key={el.id} el={el} canvasWidthPx={width} canvasHeightPx={height} />
        ))}
        {showMika && (
          <image
            href="/mika-nama.png"
            x={`${mika.x}%`}
            y={`${mika.y}%`}
            width={`${mika.width}%`}
            height={`${mika.height}%`}
            preserveAspectRatio="none"
            pointerEvents="none"
          />
        )}
      </svg>
    </div>
  );
}
