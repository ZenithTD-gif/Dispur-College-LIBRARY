import Link from 'next/link';
import { BookMarked, Mail, MapPin, ShieldCheck } from 'lucide-react';

export function LibraryFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto relative border-t border-white/[0.1] bg-abyss-950/70 backdrop-blur-2xl text-slate-300">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amethyst-400/35 to-rose-400/25" />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-br from-blue-500/25 via-amethyst-500/20 to-burgundy-700/30 text-amethyst-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]">
                <BookMarked className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-white">
                  Digital Library
                </h3>
                <p className="text-xs text-rose-300/90">
                  Professional Studies Department
                </p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-slate-300/85 max-w-sm">
              Centralized online repository of departmental books, e-books, PDFs,
              and academic study materials for students of Dispur College.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-amethyst-300">
              Library Navigation
            </h4>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>
                <Link href="/library" className="hover:text-white transition-colors">
                  Library Homepage
                </Link>
              </li>
              <li>
                <Link href="/library/browse" className="hover:text-white transition-colors">
                  Browse Full Catalog
                </Link>
              </li>
              <li>
                <Link
                  href="/library/browse?format=pdf"
                  className="hover:text-white transition-colors"
                >
                  PDF Textbooks &amp; Notes
                </Link>
              </li>
              <li>
                <Link
                  href="/library/browse?format=epub"
                  className="hover:text-white transition-colors"
                >
                  EPUB E-Books
                </Link>
              </li>
              <li className="pt-1">
                <Link
                  href="/admin"
                  className="glass-btn px-3 py-1.5 text-xs text-rose-200 hover:text-white"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-rose-300" />
                  Administrator Portal
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-amethyst-300">
              Institution
            </h4>
            <div className="space-y-2.5 text-sm text-slate-300">
              <p className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-rose-300 shrink-0 mt-0.5" />
                <span>
                  Dispur College, Ganeshguri, Guwahati – 781006, Assam, India
                </span>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-amethyst-300 shrink-0" />
                <span>Department of Professional Studies</span>
              </p>
            </div>
            <p className="pt-2 text-xs text-slate-400 leading-relaxed">
              Digital materials are curated exclusively for academic reading and
              departmental coursework.
            </p>
          </div>
        </div>

        <div className="mt-10 border-t border-white/[0.08] pt-6 flex flex-col gap-2 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {currentYear} Professional Studies Department, Dispur College. All rights reserved.
          </p>
          <p className="text-slate-400">Cloud Academic Digital Repository</p>
        </div>
      </div>
    </footer>
  );
}

