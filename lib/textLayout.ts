/**
 * textLayout.ts
 *
 * Utility functions for rendering text inside a bounded box on an HTML Canvas
 * (Canvas 2D API). Handles:
 *  - Word-wrap (space-based, with ellipsis fallback for long unbreakable tokens)
 *  - Auto font-size shrink until text fits vertically
 *  - Horizontal & vertical centering
 *  - Edge cases: empty/null text, very long text without spaces
 */

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FitResult {
  lines: string[];
  fontSize: number;
  lineHeight: number;
  /** Y coordinate of the first line's baseline, vertically centered in box */
  startY: number;
}

// Batas bawah legibilitas absolut (BUKAN diskalakan terhadap kanvas) — ini
// adalah jaring pengaman terakhir untuk teks yang sangat panjang/box sangat
// kecil, dipakai sama di semua target render.
const MIN_FONT_SIZE = 6;
const LINE_HEIGHT_RATIO = 1.35;

/**
 * Lebar kanvas dasar (px) tempat nilai `CanvasElement.fontSize` dikalibrasi —
 * yaitu lebar kanvas editor pada zoom 100% (lihat EditorPage: `canvasW = 400 * zoom`).
 * Preview (3D/flat) dan ekspor resolusi tinggi dirender pada lebar kanvas piksel
 * yang berbeda-beda, jadi initial font-size (sebelum shrink-to-fit) HARUS
 * diskalakan relatif terhadap konstanta ini — kalau tidak, hasil render di
 * kanvas yang lebih besar/kecil akan memulai proses shrink dari titik yang
 * secara relatif salah, sehingga ukuran teks akhir tidak proporsional sama
 * antara editor, preview, dan file PNG/PDF hasil ekspor.
 */
export const BASE_CANVAS_WIDTH_PX = 400;

/**
 * Menghitung initial font-size (px, sebelum shrink-to-fit) yang sudah
 * diskalakan terhadap resolusi kanvas aktual, supaya `computeFitFontSize`
 * dan `drawTextInBox` menghasilkan ukuran teks yang secara visual PROPORSIONAL
 * sama persis di kanvas berapa pun ukurannya (editor, preview 3D/flat, ekspor).
 */
export function scaledInitialFontSize(
  fontSize: number | null | undefined,
  canvasWidthPx: number,
  fallbackFontSize = 16
): number {
  const base = fontSize ? fontSize * 1.5 : fallbackFontSize;
  const scale = canvasWidthPx > 0 ? canvasWidthPx / BASE_CANVAS_WIDTH_PX : 1;
  return base * scale;
}

/**
 * Sets the canvas context font string (used consistently for measurements).
 */
function setFont(
  ctx: CanvasRenderingContext2D,
  fontSize: number,
  fontFamily: string,
  fontWeight: string
) {
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
}

/**
 * Splits `text` into lines that each fit within `maxWidth` pixels.
 * Uses word (space) boundaries. Tokens that are still too wide at the given
 * font size are hard-truncated with "…" as an ultimate fallback.
 */
export function wrapTextToLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontSize: number,
  fontFamily: string,
  fontWeight: string
): string[] {
  if (!text || text.trim() === "") return [];

  setFont(ctx, fontSize, fontFamily, fontWeight);

  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    // Handle a single word that is too wide on its own
    const testWord = current ? `${current} ${word}` : word;
    const testWidth = ctx.measureText(testWord).width;

    if (testWidth <= maxWidth) {
      current = testWord;
    } else {
      // Push current accumulated line (if any)
      if (current) {
        lines.push(current);
        current = "";
      }

      // Check if the bare word itself overflows
      const wordWidth = ctx.measureText(word).width;
      if (wordWidth <= maxWidth) {
        current = word;
      } else {
        // Force-truncate the single overflowing word with ellipsis
        const truncated = truncateWord(ctx, word, maxWidth);
        lines.push(truncated);
        // current stays ""
      }
    }
  }

  if (current) lines.push(current);
  return lines;
}

/**
 * Truncates `word` to fit within `maxWidth`, appending "…".
 */
function truncateWord(
  ctx: CanvasRenderingContext2D,
  word: string,
  maxWidth: number
): string {
  const ellipsis = "…";
  let truncated = word;
  while (truncated.length > 0) {
    const measured = ctx.measureText(truncated + ellipsis).width;
    if (measured <= maxWidth) return truncated + ellipsis;
    truncated = truncated.slice(0, -1);
  }
  return ellipsis;
}

/**
 * Calculates the optimal font size and line layout so that all wrapped lines
 * fit within `box.height`. Starts at `initialFontSize` and shrinks by 1px
 * per iteration until text fits or `MIN_FONT_SIZE` is reached.
 *
 * Returns a `FitResult` ready for rendering.
 */
export function fitTextInBox(
  ctx: CanvasRenderingContext2D,
  text: string,
  box: BoundingBox,
  initialFontSize: number,
  fontFamily: string,
  fontWeight: string
): FitResult {
  if (!text || text.trim() === "") {
    return { lines: [], fontSize: initialFontSize, lineHeight: initialFontSize * LINE_HEIGHT_RATIO, startY: box.y };
  }

  let fontSize = Math.max(initialFontSize, MIN_FONT_SIZE);

  while (true) {
    const lineHeight = fontSize * LINE_HEIGHT_RATIO;
    const lines = wrapTextToLines(ctx, text, box.width, fontSize, fontFamily, fontWeight);
    const totalHeight = lines.length * lineHeight;

    if (totalHeight <= box.height || fontSize <= MIN_FONT_SIZE) {
      // Vertically center the block inside the box
      const blockHeight = lines.length * lineHeight;
      const startY = box.y + (box.height - blockHeight) / 2 + fontSize * 0.85; // baseline offset
      return { lines, fontSize, lineHeight, startY };
    }

    fontSize -= 1;
  }
}

/**
 * Full pipeline: wraps, shrinks, and draws `text` inside `box` on `ctx`.
 * Handles null/empty text gracefully (no-op).
 *
 * @param ctx       - Canvas 2D rendering context
 * @param text      - The text to render (may be null/undefined/empty)
 * @param box       - Bounding box in canvas pixel coordinates
 * @param initialFontSize - Starting font size in pixels
 * @param fontFamily
 * @param fontWeight - "normal" | "bold" | "medium" (medium treated as normal for canvas)
 * @param align     - "left" | "center" | "right"
 * @param color     - CSS color string
 */
export function drawTextInBox(
  ctx: CanvasRenderingContext2D,
  text: string | null | undefined,
  box: BoundingBox,
  initialFontSize: number,
  fontFamily: string,
  fontWeight: string,
  align: "left" | "center" | "right",
  color: string
) {
  if (!text || text.trim() === "") return;

  const { lines, fontSize, lineHeight, startY } = fitTextInBox(
    ctx,
    text,
    box,
    initialFontSize,
    fontFamily,
    fontWeight
  );

  if (lines.length === 0) return;

  setFont(ctx, fontSize, fontFamily, fontWeight);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";

  // Clip to bounding box as a safety net
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.width, box.height);
  ctx.clip();

  // Compute X anchor based on alignment
  let anchorX: number;
  if (align === "center") {
    anchorX = box.x + box.width / 2;
  } else if (align === "right") {
    anchorX = box.x + box.width;
  } else {
    anchorX = box.x;
  }

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], anchorX, startY + i * lineHeight);
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// SVG foreignObject helpers
// ---------------------------------------------------------------------------

/**
 * Computes CSS font-size for SVG foreignObject text boxes.
 * Uses an offscreen canvas to run the same shrink logic as drawTextInBox,
 * but returns just the final pixel size so CSS can apply it.
 *
 * @param text           - Text content
 * @param boxWidthPx     - Width of the element in screen pixels
 * @param boxHeightPx    - Height of the element in screen pixels
 * @param initialFontSize - Starting font size in pixels
 * @param fontFamily
 * @param fontWeight
 * @returns Optimal font size in pixels
 */
export function computeFitFontSize(
  text: string | null | undefined,
  boxWidthPx: number,
  boxHeightPx: number,
  initialFontSize: number,
  fontFamily: string,
  fontWeight: string
): number {
  if (!text || text.trim() === "" || boxWidthPx <= 0 || boxHeightPx <= 0) {
    return initialFontSize;
  }

  // Create (or reuse) an offscreen canvas for measurement
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return initialFontSize;

  const box: BoundingBox = { x: 0, y: 0, width: boxWidthPx, height: boxHeightPx };
  const { fontSize } = fitTextInBox(ctx, text, box, initialFontSize, fontFamily, fontWeight);
  return fontSize;
}
