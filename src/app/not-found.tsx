import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { LibraryFooter } from '@/components/library/LibraryFooter';
import { LibraryNavbar } from '@/components/library/LibraryNavbar';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <LibraryNavbar />
      <main className="flex flex-1 items-center justify-center px-4 py-20">
        <div className="liquid-glass max-w-md p-8 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-br from-blue-500/25 via-indigo-500/20 to-burgundy-700/25 text-amethyst-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]">
            <BookOpen className="h-6 w-6" />
          </div>
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-rose-300">
            404 — Resource Not Found
          </p>
          <h1 className="font-serif text-2xl font-bold text-white">
            Page or Book Unavailable
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
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

