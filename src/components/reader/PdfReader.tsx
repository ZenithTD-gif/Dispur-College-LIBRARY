'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Lock,
  Maximize2,
  Minimize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';

interface PdfReaderProps {
  bookId: string;
  title: string;
  author: string;
  streamUrl: string;
  downloadUrl: string;
  allowDownload: boolean;
}

export function PdfReader({
  bookId,
  title,
  author,
  streamUrl,
  downloadUrl,
  allowDownload,
}: PdfReaderProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const viewportContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);

  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [scale, setScale] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadProgress, setLoadProgress] = useState<number>(0);

  // Load PDF Document via PDF.js
  useEffect(() => {
    let cancelled = false;
    let loadedDoc: PDFDocumentProxy | null = null;

    async function loadPdf() {
      setLoading(true);
      setError(null);
      setLoadProgress(0);

      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        const loadingTask = pdfjs.getDocument({
          url: streamUrl,
          withCredentials: false,
          rangeChunkSize: 65536 * 4,
        });

        loadingTask.onProgress = (progress: { loaded: number; total?: number }) => {
          if (!cancelled && progress.total && progress.total > 0) {
            setLoadProgress(
              Math.min(100, Math.round((progress.loaded / progress.total) * 100))
            );
          }
        };

        loadedDoc = await loadingTask.promise;
        if (cancelled) {
          await loadedDoc.destroy();
          return;
        }

        setPdfDoc(loadedDoc);
        setNumPages(loadedDoc.numPages);
        setCurrentPage(1);
        setPageInput('1');

        // Compute responsive initial Fit-Width scale
        const firstPage = await loadedDoc.getPage(1);
        const baseViewport = firstPage.getViewport({ scale: 1 });
        const containerWidth = viewportContainerRef.current?.clientWidth || 880;
        const padding = window.innerWidth < 640 ? 24 : 64;
        const computedFit = Math.min(
          Math.max((containerWidth - padding) / baseViewport.width, 0.55),
          1.5
        );
        setScale(Number(computedFit.toFixed(2)));
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          console.error('PDF loading failed:', err);
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load this PDF document. Please try again.'
          );
          setLoading(false);
        }
      }
    }

    loadPdf();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
      if (loadedDoc) {
        loadedDoc.destroy().catch(() => {});
      }
    };
  }, [streamUrl]);

  // Render active page onto HiDPI canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || scale === null) return;
    let cancelled = false;

    async function renderPage() {
      setRendering(true);
      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
          renderTaskRef.current = null;
        }

        const page = await pdfDoc!.getPage(currentPage);
        if (cancelled || !canvasRef.current) return;

        const viewport = page.getViewport({ scale: scale! });
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const renderContext = {
          canvasContext: ctx,
          viewport,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
        };

        const task = page.render(renderContext);
        renderTaskRef.current = task;
        await task.promise;
        renderTaskRef.current = null;
      } catch (err: unknown) {
        const name = (err as { name?: string })?.name;
        if (name !== 'RenderingCancelledException') {
          console.error('PDF page render error:', err);
        }
      } finally {
        if (!cancelled) setRendering(false);
      }
    }

    renderPage();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [pdfDoc, currentPage, scale]);

  const goToPage = useCallback(
    (target: number) => {
      if (!numPages) return;
      const clamped = Math.max(1, Math.min(target, numPages));
      setCurrentPage(clamped);
      setPageInput(String(clamped));
      viewportContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [numPages]
  );

  const handleFitWidth = useCallback(async () => {
    if (!pdfDoc || !viewportContainerRef.current) return;
    const page = await pdfDoc.getPage(currentPage);
    const baseViewport = page.getViewport({ scale: 1 });
    const containerWidth = viewportContainerRef.current.clientWidth;
    const padding = window.innerWidth < 640 ? 24 : 64;
    const fit = Math.min(Math.max((containerWidth - padding) / baseViewport.width, 0.5), 2.5);
    setScale(Number(fit.toFixed(2)));
  }, [pdfDoc, currentPage]);

  const zoomIn = useCallback(() => {
    setScale((prev) => Math.min(Number(((prev ?? 1) + 0.15).toFixed(2)), 2.75));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((prev) => Math.max(Number(((prev ?? 1) - 0.15).toFixed(2)), 0.5));
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!shellRef.current) return;
    if (!document.fullscreenElement) {
      await shellRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        goToPage(currentPage + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        goToPage(currentPage - 1);
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        zoomOut();
      } else if (!allowDownload && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [allowDownload, currentPage, goToPage, zoomIn, zoomOut]);

  function handlePageFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseInt(pageInput, 10);
    if (!Number.isNaN(parsed)) {
      goToPage(parsed);
    } else {
      setPageInput(String(currentPage));
    }
  }

  return (
    <div
      ref={shellRef}
      className="flex h-screen flex-col bg-navy-950 text-ivory-100 select-none"
    >
      {/* Top Academic Reader Toolbar */}
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-navy-900 px-3 py-2.5 sm:px-5">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/library/books/${bookId}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-ivory-100 hover:bg-white/10 transition-colors shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Back to Book</span>
          </Link>
          <div className="min-w-0">
            <h1 className="truncate font-serif text-sm font-bold text-white sm:text-base">
              {title}
            </h1>
            <p className="truncate text-[11px] text-ivory-200/70">{author}</p>
          </div>
        </div>

        {/* Center Page Controls */}
        <div className="flex items-center gap-1.5 rounded-lg bg-navy-950/70 px-2 py-1 border border-white/10">
          <button
            type="button"
            onClick={() => goToPage(currentPage - 1)}
            disabled={loading || currentPage <= 1}
            className="rounded p-1 text-ivory-100 hover:bg-white/10 disabled:opacity-35"
            aria-label="Previous page"
            title="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <form onSubmit={handlePageFormSubmit} className="flex items-center gap-1.5 text-xs">
            <input
              type="text"
              inputMode="numeric"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={handlePageFormSubmit}
              disabled={loading || numPages === 0}
              aria-label="Current page number"
              className="w-11 rounded border border-white/20 bg-navy-900 px-1.5 py-0.5 text-center font-mono text-xs text-white focus:border-gold-400 focus:outline-none"
            />
            <span className="font-mono text-ivory-200/75">/ {numPages || '—'}</span>
          </form>

          <button
            type="button"
            onClick={() => goToPage(currentPage + 1)}
            disabled={loading || currentPage >= numPages}
            className="rounded p-1 text-ivory-100 hover:bg-white/10 disabled:opacity-35"
            aria-label="Next page"
            title="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Right Zoom, Fullscreen, Download Controls */}
        <div className="flex items-center gap-1.5">
          <div className="hidden sm:flex items-center gap-1 rounded-lg bg-navy-950/70 px-1.5 py-1 border border-white/10">
            <button
              type="button"
              onClick={zoomOut}
              disabled={loading}
              className="rounded p-1 text-ivory-100 hover:bg-white/10 disabled:opacity-40"
              aria-label="Zoom out"
              title="Zoom out (-)"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="min-w-[44px] text-center font-mono text-xs text-ivory-100">
              {scale ? `${Math.round(scale * 100)}%` : '—'}
            </span>
            <button
              type="button"
              onClick={zoomIn}
              disabled={loading}
              className="rounded p-1 text-ivory-100 hover:bg-white/10 disabled:opacity-40"
              aria-label="Zoom in"
              title="Zoom in (+)"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleFitWidth}
              disabled={loading}
              className="rounded px-2 py-0.5 text-[11px] font-medium text-gold-300 hover:bg-white/10"
              title="Fit to screen width"
            >
              Fit
            </button>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="rounded-lg border border-white/15 bg-white/5 p-2 text-ivory-100 hover:bg-white/10 transition-colors"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>

          {allowDownload ? (
            <a
              href={downloadUrl}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gold-600 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Download PDF</span>
            </a>
          ) : (
            <span
              className="inline-flex items-center gap-1 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-medium text-amber-200"
              title="Downloading disabled by department"
            >
              <Lock className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Read Only</span>
            </span>
          )}
        </div>
      </header>

      {/* Mobile Zoom Strip */}
      <div className="flex items-center justify-between border-b border-white/10 bg-navy-900/80 px-3 py-1.5 sm:hidden">
        <span className="text-[11px] text-ivory-200/75">Zoom Controls</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={zoomOut}
            className="rounded bg-white/10 p-1 text-white"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="font-mono text-xs">
            {scale ? `${Math.round(scale * 100)}%` : '—'}
          </span>
          <button
            type="button"
            onClick={zoomIn}
            className="rounded bg-white/10 p-1 text-white"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleFitWidth}
            className="rounded bg-white/10 px-2 py-0.5 text-[11px] text-gold-300"
          >
            Fit
          </button>
        </div>
      </div>

      {/* Main Scrollable Document Stage */}
      <div
        ref={viewportContainerRef}
        onContextMenu={(e) => {
          if (!allowDownload) e.preventDefault();
        }}
        className="relative flex-1 overflow-auto bg-[#1b2432] p-3 sm:p-6 lg:p-8"
      >
        {loading && (
          <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-3 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-gold-400" />
            <p className="text-sm font-medium text-ivory-100">
              Loading document from cloud library
              {loadProgress > 0 ? ` (${loadProgress}%)` : '...'}
            </p>
            <p className="text-xs text-ivory-200/60">
              Dispur College — Professional Studies Department
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="mx-auto mt-12 max-w-md rounded-xl border border-red-400/30 bg-red-950/40 p-6 text-center space-y-3">
            <p className="font-serif text-base font-bold text-red-200">
              Could Not Open Document
            </p>
            <p className="text-xs text-red-200/80 leading-relaxed">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reload Reader
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="mx-auto flex justify-center">
            <div className="relative rounded-md bg-white shadow-2xl overflow-hidden">
              {rendering && (
                <div className="pointer-events-none absolute top-3 right-3 z-10 rounded-full bg-navy-900/80 px-2.5 py-1 text-[11px] font-medium text-gold-300 backdrop-blur">
                  Rendering...
                </div>
              )}
              <canvas ref={canvasRef} className="block max-w-none" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

