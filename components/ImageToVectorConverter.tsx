"use client";

import React, { useState, useRef } from "react";
import { Upload, X, Wand2, Download, Save } from "lucide-react";
import { removeBackground, Config } from '@imgly/background-removal';
import { traceDataUrl, getSVG } from '@cadit-app/potrace-ts';
import { createClient } from "@/lib/supabase/client";
import { Button, IconButton } from "@/components/ui";

interface Props {
  onInsertSVG: (svgString: string) => void;
  onClose: () => void;
}

type ProcessStatus = "idle" | "loading-model" | "removing-bg" | "thresholding" | "vectorizing" | "success" | "error";

export default function ImageToVectorConverter({ onInsertSVG, onClose }: Props) {
  const [status, setStatus] = useState<ProcessStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [svgResult, setSvgResult] = useState<string | null>(null);
  const [threshold, setThreshold] = useState<number>(128);
  const [originalFile, setOriginalFile] = useState<File | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const processImage = async (file: File) => {
    try {
      setOriginalFile(file);
      setStatus("loading-model");
      
      // 1. Remove Background
      setStatus("removing-bg");
      const config: Config = {
        progress: (key: string, current: number, total: number) => {
          // If we want detailed progress we can log here
        }
      };
      const imageBlob = await removeBackground(file, config);
      
      setStatus("thresholding");
      
      // 2. Draw to Canvas and Threshold
      const url = URL.createObjectURL(imageBlob);
      const img = new Image();
      img.src = url;
      await new Promise((resolve) => { img.onload = resolve; });

      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas element missing");
      
      // Limit size to prevent lag (e.g. max 1000px)
      const MAX_SIZE = 1000;
      let w = img.width;
      let h = img.height;
      if (w > MAX_SIZE || h > MAX_SIZE) {
        if (w > h) {
          h = Math.floor((h / w) * MAX_SIZE);
          w = MAX_SIZE;
        } else {
          w = Math.floor((w / h) * MAX_SIZE);
          h = MAX_SIZE;
        }
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("Canvas context missing");

      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;

      let minX = w, minY = h, maxX = 0, maxY = 0;

      // Thresholding: making it pure black & white, and ignoring transparency
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const a = data[i + 3];
          // If pixel is transparent, make it white
          if (a < 50) {
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
            data[i + 3] = 255;
          } else {
            // Grayscale & Threshold
            const luminance = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
            const color = luminance < threshold ? 0 : 255;
            data[i] = color;
            data[i + 1] = color;
            data[i + 2] = color;
            data[i + 3] = 255; // make fully opaque

            if (color === 0) { // If it's a black pixel (object)
              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
            }
          }
        }
      }
      ctx.putImageData(imageData, 0, 0);

      setStatus("vectorizing");

      // 3. Vectorize with Potrace
      let dataUrl = canvas.toDataURL("image/png");
      
      // Auto-crop to exact bounding box of the object
      if (maxX >= minX && maxY >= minY) {
        // Add small padding (e.g. 2px) to prevent clipped edges in SVG
        const pad = 2;
        minX = Math.max(0, minX - pad);
        minY = Math.max(0, minY - pad);
        maxX = Math.min(w - 1, maxX + pad);
        maxY = Math.min(h - 1, maxY + pad);

        const cropW = maxX - minX + 1;
        const cropH = maxY - minY + 1;
        const cropCanvas = document.createElement("canvas");
        cropCanvas.width = cropW;
        cropCanvas.height = cropH;
        const cropCtx = cropCanvas.getContext("2d");
        if (cropCtx) {
          cropCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
          dataUrl = cropCanvas.toDataURL("image/png");
        }
      }

      const paths = traceDataUrl(dataUrl, { optcurve: true, opttolerance: 0.2 });
      const svgString = getSVG(paths, 1);
      
      setSvgResult(svgString);
      setStatus("success");
      
      // Save to Supabase Storage in the background
      saveToSupabase(file, svgString);

    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setErrorMsg(err.message || "Failed to process image.");
    }
  };

  const saveToSupabase = async (original: File, svg: string) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return; // not logged in

      const timestamp = Date.now();
      const safeName = original.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      
      // Upload SVG to bucket
      const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
      const svgPath = `${user.id}/vector_${timestamp}_${safeName}.svg`;
      const origPath = `${user.id}/orig_${timestamp}_${safeName}`;
      
      // We assume bucket 'user_assets' exists
      const { error: svgError } = await supabase.storage
        .from('user_assets')
        .upload(svgPath, svgBlob);
        
      if (svgError) {
        console.error("Failed to upload SVG to storage:", svgError);
        // Fallback: Just insert to DB without storage path
        await supabase.from('user_assets').insert({
          user_id: user.id,
          name: original.name,
          vector_svg: svg
        });
        return;
      }

      // Optionally upload original too
      await supabase.storage.from('user_assets').upload(origPath, original);

      // Insert record
      await supabase.from('user_assets').insert({
        user_id: user.id,
        name: original.name,
        original_path: origPath,
        vector_svg: svg // still saving svg string directly as requested by schema
      });

    } catch (e) {
      console.error("Background save to supabase error:", e);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImage(e.target.files[0]);
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "loading-model": return "Downloading AI Models (only once)...";
      case "removing-bg": return "Removing background magically...";
      case "thresholding": return "Applying B&W threshold...";
      case "vectorizing": return "Tracing into SVG lines...";
      case "error": return "Error: " + errorMsg;
      default: return "";
    }
  };

  const downloadSVG = () => {
    if (!svgResult) return;
    const blob = new Blob([svgResult], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vectorized.svg";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleInsert = () => {
    if (svgResult) {
      onInsertSVG(svgResult);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col relative">
        <IconButton onClick={onClose} className="absolute top-3 right-3" title="Tutup">
          <X size={18} />
        </IconButton>

        <div className="p-5 border-b border-stone-200">
          <h2 className="text-lg font-bold flex items-center gap-2 text-stone-900">
            <Wand2 className="text-brand-600" /> Image to Vector Magic
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Remove background and convert raster (JPG/PNG) to pure vector lines in your browser.
          </p>
        </div>

        <div className="p-5 flex flex-col items-center">

          {/* Hidden Canvas for processing */}
          <canvas ref={canvasRef} className="hidden"></canvas>

          {status === "idle" && (
            <label className="w-full h-48 border-2 border-dashed border-stone-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-stone-50 hover:border-brand-500 transition">
              <Upload className="w-8 h-8 text-stone-400 mb-2" />
              <span className="text-sm font-semibold text-stone-600">Click to upload JPG / PNG</span>
              <span className="text-xs text-stone-400 mt-1">Processed 100% locally</span>
              <input type="file" className="hidden" accept="image/jpeg, image/png, image/webp" onChange={handleFileChange} />
            </label>
          )}

          {["loading-model", "removing-bg", "thresholding", "vectorizing"].includes(status) && (
            <div className="w-full h-48 flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4"></div>
              <p className="text-sm font-bold text-stone-700">{getStatusText()}</p>
              <p className="text-xs text-stone-400 mt-1 max-w-xs text-center">
                Please wait, processing image entirely on your device...
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="w-full h-48 flex flex-col items-center justify-center text-rose-500 text-center">
              <X className="w-10 h-10 mb-2" />
              <p className="text-sm font-bold">{getStatusText()}</p>
              <Button variant="secondary" size="sm" className="mt-4" onClick={() => setStatus("idle")}>
                Try Again
              </Button>
            </div>
          )}

          {status === "success" && svgResult && (
            <div className="w-full flex flex-col items-center">
              <div className="w-48 h-48 border border-stone-200 rounded-lg p-2 bg-stone-50 flex items-center justify-center overflow-hidden checkerboard-bg">
                {/* Safe render of SVG using dangerouslySetInnerHTML since we generated it via potrace */}
                <div
                  className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
                  dangerouslySetInnerHTML={{ __html: svgResult }}
                />
              </div>

              <div className="w-full mt-4 flex gap-2">
                <Button variant="secondary" size="sm" className="flex-1" onClick={downloadSVG}>
                  <Download size={14} /> Download SVG
                </Button>
                <Button variant="primary" size="sm" className="flex-1" onClick={handleInsert}>
                  <Save size={14} /> Gunakan di Kanvas
                </Button>
              </div>
            </div>
          )}
        </div>

        {status === "success" && (
          <div className="p-3 bg-stone-50 border-t border-stone-200 flex justify-between items-center text-xs">
             <span className="text-stone-500 font-medium">B&W Threshold: {threshold}</span>
             <input
               type="range"
               min={10} max={240}
               value={threshold}
               onChange={(e) => {
                 setThreshold(parseInt(e.target.value));
               }}
               onMouseUp={() => {
                 if (originalFile) processImage(originalFile);
               }}
               className="w-32 accent-brand-600"
             />
          </div>
        )}
        
        <style dangerouslySetInnerHTML={{__html: `
          .checkerboard-bg {
            background-image: linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(135deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(135deg, transparent 75%, #ccc 75%);
            background-size: 10px 10px;
            background-position: 0 0, 5px 0, 5px -5px, 0px 5px;
          }
        `}} />
      </div>
    </div>
  );
}
