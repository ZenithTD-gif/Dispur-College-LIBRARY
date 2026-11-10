import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { LibraryFooter } from '@/components/library/LibraryFooter';
import { LibraryNavbar } from '@/components/library/LibraryNavbar';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <LibraryNavbar />
      <main className="flex flex-1 items-center justify-center px-4 py-20 animate-page-enter">
        <div className="liquid-glass max-w-md p-8 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-champagne-300/30 bg-gradient-to-br from-maroon-800/80 via-burgundy-700/75 to-wine-600/70 text-champagne-200 shadow-[inset_0_1px_0_rgba(250,247,242,0.3)]">
            <BookOpen className="h-6 w-6" />
          </div>
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-champagne-300">
            404 — Resource Not Found
          </p>
          <h1 className="font-serif text-2xl font-bold text-offwhite-50">
            Page or Book Unavailable
          </h1>
          <p className="text-sm text-offwhite-200/85 leading-relaxed">
            The requested book or page could not be found in the Professional
            Studies Department Digital Library.
          </p>
          <div className="pt-2">
            <Link href="/library" className="glass-btn-primary">
              <ArrowLeft className="h-4 w-4" />
              Return to Digital Library
            </Link>
          </div>
        </div>
      </main>
      <LibraryFooter />
    </div>
  );
}

