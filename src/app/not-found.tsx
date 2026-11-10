import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { LibraryFooter } from '@/components/library/LibraryFooter';
import { LibraryNavbar } from '@/components/library/LibraryNavbar';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <LibraryNavbar />
      <main className="flex flex-1 items-center justify-center px-4 py-20">
        <div className="academic-card max-w-md p-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-navy-900 text-gold-300">
            <BookOpen className="h-6 w-6" />
          </div>
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-gold-600">
            404 — Resource Not Found
          </p>
          <h1 className="font-serif text-2xl font-bold text-navy-900">
            Page or Book Unavailable
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            The requested book or page could not be found in the Professional
            Studies Department Digital Library.
          </p>
          <div className="pt-2">
            <Link href="/library" className="btn-primary">
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

