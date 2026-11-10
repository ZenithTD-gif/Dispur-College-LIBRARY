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
    <div ref={shellRef} className="flex h-screen flex-col bg-abyss-950 text-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.1] bg-abyss-900/75 px-3 py-2.5 backdrop-blur-2xl backdrop-saturate-150 sm:px-5">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href={`/library/books/${bookId}`}
            className="glass-btn px-3 py-1.5 text-xs shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Back to Book</span>
          </Link>
          <button
            type="button"
            onClick={() => setTocOpen((p) => !p)}
            className="glass-btn px-3 py-1.5 text-xs shrink-0"
          >
            <List className="h-3.5 w-3.5 text-amethyst-300" />
            <span className="hidden sm:inline">Chapters</span>
          </button>
          <div className="min-w-0">
            <h1 className="truncate font-serif text-sm font-bold text-white sm:text-base">
              {title}
            </h1>
            <p className="truncate text-[11px] text-slate-400">
              {author} {chapterLabel ? `• ${chapterLabel}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Font & Theme Glass Controls */}
          <div className="hidden md:flex items-center gap-1 rounded-full border border-white/[0.14] bg-white/[0.06] px-2 py-1 backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setFontSize((s) => Math.max(80, s - 10))}
              className="rounded-full px-2 py-0.5 text-xs font-semibold transition-colors hover:bg-white/[0.12]"
              title="Decrease text size"
            >
              A-
            </button>
            <span className="font-mono text-[11px] px-1 text-slate-200">{fontSize}%</span>
            <button
              type="button"
              onClick={() => setFontSize((s) => Math.min(160, s + 10))}
              className="rounded-full px-2 py-0.5 text-xs font-semibold transition-colors hover:bg-white/[0.12]"
              title="Increase text size"
            >
              A+
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1 rounded-full border border-white/[0.14] bg-white/[0.06] px-1.5 py-1 backdrop-blur-xl">
            {(['light', 'sepia', 'night'] as ReaderTheme[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={`rounded-full px-2.5 py-0.5 text-[11px] capitalize font-medium transition-all ${
                  theme === t
                    ? 'border border-white/25 bg-gradient-to-r from-blue-500/45 to-amethyst-600/45 text-white'
                    : 'text-slate-300 hover:bg-white/[0.1]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="glass-btn p-2 text-xs"
            aria-label="Toggle fullscreen"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          {allowDownload ? (
            <a
              href={downloadUrl}
              className="glass-btn-accent px-3.5 py-1.5 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Download EPUB</span>
            </a>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/30 bg-burgundy-800/35 px-3 py-1.5 text-[11px] font-medium text-rose-200 backdrop-blur-xl">
              <Lock className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Read Only</span>
            </span>
          )}
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Frosted Glass Chapters Drawer */}
        {tocOpen && (
          <aside className="z-20 w-72 shrink-0 overflow-y-auto border-r border-white/[0.1] bg-abyss-900/85 p-4 backdrop-blur-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-amethyst-300">
                Table of Contents
              </h2>
              <button
                type="button"
                onClick={() => setTocOpen(false)}
                className="rounded-full p-1 text-slate-300 hover:bg-white/[0.1] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {toc.length === 0 ? (
              <p className="text-xs text-slate-400">No chapter index found in EPUB.</p>
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
                      className="w-full rounded-xl px-3 py-2 text-left text-xs text-slate-200 transition-colors hover:bg-white/[0.1] hover:text-white"
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
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-abyss-950/90 backdrop-blur-md">
              <Loader2 className="h-8 w-8 animate-spin text-amethyst-400" />
              <p className="text-sm text-slate-100">Opening EPUB e-book...</p>
            </div>
          )}

          {error && !loading && (
            <div className="liquid-glass max-w-md border-rose-400/35 bg-burgundy-900/75 p-6 text-center text-rose-100">
              <p className="font-serif text-base font-bold">Could Not Open EPUB</p>
              <p className="mt-2 text-xs text-rose-200/80">{error}</p>
            </div>
          )}

          <button
            type="button"
            onClick={prevPage}
            aria-label="Previous section"
            className="hidden sm:flex h-12 w-10 items-center justify-center rounded-full border border-white/20 bg-abyss-950/60 text-slate-100 backdrop-blur-xl transition-all hover:bg-abyss-900/85 hover:scale-105 mr-2 shrink-0"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div
            ref={viewerRef}
            className="h-full w-full max-w-4xl overflow-hidden rounded-2xl shadow-lg"
          />

          <button
            type="button"
            onClick={nextPage}
            aria-label="Next section"
            className="hidden sm:flex h-12 w-10 items-center justify-center rounded-full border border-white/20 bg-abyss-950/60 text-slate-100 backdrop-blur-xl transition-all hover:bg-abyss-900/85 hover:scale-105 ml-2 shrink-0"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </main>
      </div>

      {/* Mobile Glass Bottom Page Turn Bar */}
      <div className="flex items-center justify-between border-t border-white/[0.1] bg-abyss-900/80 px-4 py-2 backdrop-blur-2xl sm:hidden">
        <button
          type="button"
          onClick={prevPage}
          className="glass-btn px-3.5 py-1.5 text-xs"
        >
          <ChevronLeft className="h-4 w-4" /> Prev
        </button>
        <button
          type="button"
          onClick={nextPage}
          className="glass-btn px-3.5 py-1.5 text-xs"
        >
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

