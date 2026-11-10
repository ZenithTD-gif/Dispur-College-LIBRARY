'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  List,
  Loader2,
  Lock,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react';
import type { NavItem, Rendition } from 'epubjs';

interface EpubReaderProps {
  bookId: string;
  title: string;
  author: string;
  streamUrl: string;
  downloadUrl: string;
  allowDownload: boolean;
}

type ReaderTheme = 'light' | 'sepia' | 'night';

const THEME_STYLES: Record<ReaderTheme, { bg: string; color: string }> = {
  light: { bg: '#FCFBF8', color: '#0F213B' },
  sepia: { bg: '#F4ECD8', color: '#3B2F1E' },
  night: { bg: '#0F172A', color: '#E2E8F0' },
};

export function EpubReader({
  bookId,
  title,
  author,
  streamUrl,
  downloadUrl,
  allowDownload,
}: EpubReaderProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const renditionRef = useRef<Rendition | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toc, setToc] = useState<NavItem[]>([]);
  const [tocOpen, setTocOpen] = useState(false);
  const [fontSize, setFontSize] = useState(105);
  const [theme, setTheme] = useState<ReaderTheme>('light');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chapterLabel, setChapterLabel] = useState<string>('');

  useEffect(() => {
    let destroyed = false;
    let bookInstance: { destroy?: () => void } | null = null;

    async function initEpub() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(streamUrl, { cache: 'no-store' });
        if (!res.ok) {
          throw new Error(`Failed to fetch EPUB file (${res.status})`);
        }
        const buffer = await res.arrayBuffer();
        if (destroyed || !viewerRef.current) return;

        const [{ default: JSZip }, { default: ePub }] = await Promise.all([
          import('jszip'),
          import('epubjs'),
        ]);

        // epubjs expects global JSZip in bundled environments
        (window as unknown as { JSZip: typeof JSZip }).JSZip = JSZip;

        const book = ePub(buffer);
        bookInstance = book;

        const rendition = book.renderTo(viewerRef.current, {
          width: '100%',
          height: '100%',
          spread: 'none',
        });

        renditionRef.current = rendition;

        Object.entries(THEME_STYLES).forEach(([key, vals]) => {
          rendition.themes.register(key, {
            body: {
              background: `${vals.bg} !important`,
              color: `${vals.color} !important`,
              'font-family': 'Georgia, "Merriweather", serif !important',
              'line-height': '1.75 !important',
              padding: '20px 24px !important',
            },
          });
        });

        rendition.themes.select(theme);
        rendition.themes.fontSize(`${fontSize}%`);

        rendition.on('relocated', (loc: { start?: { href?: string } }) => {
          if (loc?.start?.href) {
            setChapterLabel(loc.start.href.split('/').pop() || '');
          }
        });

        await rendition.display();

        const nav = await book.loaded.navigation;
        if (!destroyed) {
          setToc(nav?.toc || []);
          setLoading(false);
        }
      } catch (err) {
        if (!destroyed) {
          console.error('EPUB load error:', err);
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to open this EPUB e-book.'
          );
          setLoading(false);
        }
      }
    }

    initEpub();

    return () => {
      destroyed = true;
      if (bookInstance?.destroy) {
        bookInstance.destroy();
      }
      renditionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamUrl]);

  useEffect(() => {
    if (renditionRef.current) {
      renditionRef.current.themes.select(theme);
    }
  }, [theme]);

  useEffect(() => {
    if (renditionRef.current) {
      renditionRef.current.themes.fontSize(`${fontSize}%`);
    }
  }, [fontSize]);

  const prevPage = useCallback(() => {
    renditionRef.current?.prev();
  }, []);

  const nextPage = useCallback(() => {
    renditionRef.current?.next();
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

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') nextPage();
      if (e.key === 'ArrowLeft') prevPage();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [nextPage, prevPage]);

  return (
    <div ref={shellRef} className="flex h-screen flex-col bg-navy-950 text-ivory-100">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-navy-900 px-3 py-2.5 sm:px-5">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/library/books/${bookId}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-ivory-100 hover:bg-white/10 shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Back to Book</span>
          </Link>
          <button
            type="button"
            onClick={() => setTocOpen((p) => !p)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-ivory-100 hover:bg-white/10"
          >
            <List className="h-3.5 w-3.5 text-gold-300" />
            <span className="hidden sm:inline">Chapters</span>
          </button>
          <div className="min-w-0">
            <h1 className="truncate font-serif text-sm font-bold text-white sm:text-base">
              {title}
            </h1>
            <p className="truncate text-[11px] text-ivory-200/70">
              {author} {chapterLabel ? `• ${chapterLabel}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Font & Theme */}
          <div className="hidden md:flex items-center gap-1 rounded-lg bg-navy-950/70 px-2 py-1 border border-white/10">
            <button
              type="button"
              onClick={() => setFontSize((s) => Math.max(80, s - 10))}
              className="rounded px-1.5 py-0.5 text-xs font-semibold hover:bg-white/10"
              title="Decrease text size"
            >
              A-
            </button>
            <span className="font-mono text-[11px] px-1">{fontSize}%</span>
            <button
              type="button"
              onClick={() => setFontSize((s) => Math.min(160, s + 10))}
              className="rounded px-1.5 py-0.5 text-xs font-semibold hover:bg-white/10"
              title="Increase text size"
            >
              A+
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1 rounded-lg bg-navy-950/70 px-1.5 py-1 border border-white/10">
            {(['light', 'sepia', 'night'] as ReaderTheme[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={`rounded px-2 py-0.5 text-[11px] capitalize font-medium transition-colors ${
                  theme === t ? 'bg-gold-500 text-white' : 'text-ivory-200 hover:bg-white/10'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="rounded-lg border border-white/15 bg-white/5 p-2 text-ivory-100 hover:bg-white/10"
            aria-label="Toggle fullscreen"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          {allowDownload ? (
            <a
              href={downloadUrl}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gold-600"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Download EPUB</span>
            </a>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-medium text-amber-200">
              <Lock className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Read Only</span>
            </span>
          )}
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Chapters Drawer */}
        {tocOpen && (
          <aside className="z-20 w-72 shrink-0 overflow-y-auto border-r border-white/10 bg-navy-900 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gold-300">
                Table of Contents
              </h2>
              <button
                type="button"
                onClick={() => setTocOpen(false)}
                className="rounded p-1 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {toc.length === 0 ? (
              <p className="text-xs text-ivory-200/60">No chapter index found in EPUB.</p>
            ) : (
              <ul className="space-y-1">
                {toc.map((item) => (
                  <li key={item.id || item.href}>
                    <button
                      type="button"
                      onClick={() => {
                        renditionRef.current?.display(item.href);
                        setTocOpen(false);
                      }}
                      className="w-full rounded-lg px-2.5 py-2 text-left text-xs text-ivory-100 hover:bg-white/10 transition-colors"
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        )}

        {/* Main EPUB Viewport */}
        <main
          className="relative flex min-h-0 flex-1 overflow-hidden items-center justify-center p-2 sm:p-6"
          style={{ backgroundColor: THEME_STYLES[theme].bg }}
          onContextMenu={(e) => {
            if (!allowDownload) e.preventDefault();
          }}
        >
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-navy-950/90">
              <Loader2 className="h-8 w-8 animate-spin text-gold-400" />
              <p className="text-sm text-ivory-100">Opening EPUB e-book...</p>
            </div>
          )}

          {error && !loading && (
            <div className="max-w-md rounded-xl border border-red-400/30 bg-red-950/80 p-6 text-center text-red-100">
              <p className="font-serif text-base font-bold">Could Not Open EPUB</p>
              <p className="mt-2 text-xs text-red-200/80">{error}</p>
            </div>
          )}

          <button
            type="button"
            onClick={prevPage}
            aria-label="Previous section"
            className="hidden sm:flex h-12 w-10 items-center justify-center rounded-lg bg-navy-900/15 text-navy-900 hover:bg-navy-900/25 mr-2 shrink-0"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div
            ref={viewerRef}
            className="h-full w-full max-w-4xl overflow-hidden rounded-lg shadow-sm"
          />

          <button
            type="button"
            onClick={nextPage}
            aria-label="Next section"
            className="hidden sm:flex h-12 w-10 items-center justify-center rounded-lg bg-navy-900/15 text-navy-900 hover:bg-navy-900/25 ml-2 shrink-0"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </main>
      </div>

      {/* Mobile Bottom Page Turn Bar */}
      <div className="flex items-center justify-between border-t border-white/10 bg-navy-900 px-4 py-2 sm:hidden">
        <button
          type="button"
          onClick={prevPage}
          className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium"
        >
          <ChevronLeft className="h-4 w-4" /> Prev
        </button>
        <button
          type="button"
          onClick={nextPage}
          className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium"
        >
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

