import Link from 'next/link';
import { BookMarked, Mail, MapPin, ShieldCheck } from 'lucide-react';

export function LibraryFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-navy-800 bg-navy-900 text-ivory-200">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-gold-400">
                <BookMarked className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-white">
                  Digital Library
                </h3>
                <p className="text-xs text-gold-300">
                  Professional Studies Department
                </p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-ivory-200/75 max-w-sm">
              Centralized online repository of departmental books, e-books, PDFs,
              and academic study materials for students of Dispur College.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gold-400">
              Library Navigation
            </h4>
            <ul className="space-y-2 text-sm text-ivory-200/80">
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
              <li>
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-1.5 text-gold-300 hover:text-gold-200 transition-colors"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Administrator Portal
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gold-400">
              Institution
            </h4>
            <div className="space-y-2.5 text-sm text-ivory-200/80">
              <p className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gold-400 shrink-0 mt-0.5" />
                <span>
                  Dispur College, Ganeshguri, Guwahati – 781006, Assam, India
                </span>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gold-400 shrink-0" />
                <span>Department of Professional Studies</span>
              </p>
            </div>
            <p className="pt-2 text-xs text-ivory-200/60 leading-relaxed">
              Digital materials are curated exclusively for academic reading and
              departmental coursework.
            </p>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 flex flex-col gap-2 text-xs text-ivory-200/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {currentYear} Professional Studies Department, Dispur College. All rights reserved.
          </p>
          <p>Cloud Academic Digital Repository</p>
        </div>
      </div>
    </footer>
  );
}

