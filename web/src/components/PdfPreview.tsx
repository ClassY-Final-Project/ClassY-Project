"use client";

import { useEffect, useRef, useState } from "react";

export default function PdfPreview({ file }: { file: File }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    (async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (cancelled) return;

        const page = await pdf.getPage(1);
        if (cancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const viewport = page.getViewport({ scale: 1 });
        const containerWidth = canvas.parentElement?.clientWidth ?? 400;
        const scale = containerWidth / viewport.width;
        const scaled = page.getViewport({ scale });

        canvas.width = scaled.width;
        canvas.height = scaled.height;

        await page.render({ canvasContext: canvas.getContext("2d")!, viewport: scaled }).promise;
        if (!cancelled) setLoading(false);
      } catch {
        if (!cancelled) { setLoading(false); setError(true); }
      }
    })();

    return () => { cancelled = true; };
  }, [file]);

  if (error) return null;

  return (
    <div className="relative mt-4 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-sm bg-zinc-100 dark:bg-zinc-800">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      )}
      <canvas ref={canvasRef} className={`w-full transition-opacity duration-300 ${loading ? "opacity-0" : "opacity-100"}`} />
      <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
      <span className="absolute bottom-2 right-3 text-[10px] text-white/80 font-medium">1. sayfa önizleme</span>
    </div>
  );
}
