import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  Building2,
  Calendar,
  Download,
  FileType,
  Globe,
  Hash,
  HardDrive,
  Lock,
  Sparkles,
} from 'lucide-react';
import { BookCard } from '@/components/library/BookCard';
import { LibraryFooter } from '@/components/library/LibraryFooter';
import { LibraryNavbar } from '@/components/library/LibraryNavbar';
import { BookCover } from '@/components/shared/BookCover';
import { SetupNotice } from '@/components/shared/SetupNotice';
import { getBookById, getRelatedBooks } from '@/lib/queries/library';
import { formatFileSize, isValidUuid } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export default async function BookDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isValidUuid(id)) {
    notFound();
  }

  const { configured, book } = await getBookById(id);

  if (!configured) {
    return (
      <div className="flex min-h-screen flex-col">
        <LibraryNavbar />
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12">
          <SetupNotice context="library" />
        </main>
        <LibraryFooter />
      </div>
    );
  }

  if (!book) {
    notFound();
  }

  const relatedBooks = await getRelatedBooks(book, 4);
  const formatLabel = book.file_type.toUpperCase();

  return (
    <div className="flex min-h-screen flex-col">
      <LibraryNavbar />

      <main className="flex-1 bg-ivory-100">
        {/* Breadcrumb */}
        <div className="border-b border-parchment-300 bg-parchment-100/70">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3 text-xs text-slate-600 sm:px-6 lg:px-8">
            <Link href="/library" className="hover:text-navy-900">
              Digital Library
            </Link>
            <span>/</span>
            <Link href="/library/browse" className="hover:text-navy-900">
              Catalog
            </Link>
            {book.category && (
              <>
                <span>/</span>
                <Link
                  href={`/library/browse?category=${encodeURIComponent(book.category.slug)}`}
                  className="hover:text-navy-900"
                >
                  {book.category.category_name}
                </Link>
              </>
            )}
            <span>/</span>
            <span className="font-semibold text-navy-900 truncate max-w-xs sm:max-w-md">
              {book.title}
            </span>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/library/browse"
            className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-navy-800 hover:text-gold-600 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Catalog
          </Link>

          <div className="academic-card overflow-hidden p-6 sm:p-8 lg:p-10">
            <div className="grid gap-8 lg:grid-cols-12">
              {/* Left Cover Column */}
              <div className="lg:col-span-4">
                <div className="mx-auto max-w-[300px] overflow-hidden rounded-xl border border-parchment-300 shadow-academic aspect-[3/4]">
                  <BookCover
                    title={book.title}
                    author={book.author}
                    fileType={book.file_type}
                    coverUrl={book.cover_url}
                    subject={book.subject}
                    className="h-full w-full"
                  />
                </div>
              </div>

              {/* Right Details Column */}
              <div className="lg:col-span-8 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {book.category && (
                      <Link
                        href={`/library/browse?category=${encodeURIComponent(book.category.slug)}`}
                        className="inline-flex items-center rounded-full bg-parchment-200 px-3 py-1 text-xs font-semibold text-navy-900 hover:bg-parchment-300 transition-colors"
                      >
                        {book.category.category_name}
                      </Link>
                    )}
                    <span className="inline-flex items-center rounded-full bg-navy-50 px-3 py-1 text-xs font-semibold text-navy-800">
                      {book.subject}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-navy-900 px-2.5 py-1 font-mono text-[11px] font-semibold text-gold-300">
                      {formatLabel}
                    </span>
                    {book.is_featured && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gold-100 px-2.5 py-1 text-xs font-semibold text-gold-700">
                        <Sparkles className="h-3 w-3" />
                        Featured
                      </span>
                    )}
                  </div>

                  <div>
                    <h1 className="font-serif text-2xl font-bold leading-snug text-navy-900 sm:text-3xl lg:text-4xl">
                      {book.title}
                    </h1>
                    <p className="mt-2 text-base font-medium text-slate-700">
                      By <span className="text-navy-900 font-semibold">{book.author}</span>
                    </p>
                  </div>

                  <div className="border-y border-parchment-200 py-5">
                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Synopsis &amp; Overview
                    </h2>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700 sm:text-base">
                      {book.description}
                    </p>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border border-parchment-200 bg-ivory-200/60 p-3">
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <FileType className="h-3.5 w-3.5 text-gold-600" />
                        Format
                      </p>
                      <p className="mt-1 font-mono text-sm font-semibold text-navy-900">
                        {formatLabel}
                      </p>
                    </div>

                    <div className="rounded-lg border border-parchment-200 bg-ivory-200/60 p-3">
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <HardDrive className="h-3.5 w-3.5 text-gold-600" />
                        File Size
                      </p>
                      <p className="mt-1 font-mono text-sm font-semibold text-navy-900">
                        {formatFileSize(book.file_size)}
                      </p>
                    </div>

                    <div className="rounded-lg border border-parchment-200 bg-ivory-200/60 p-3">
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <Globe className="h-3.5 w-3.5 text-gold-600" />
                        Language
                      </p>
                      <p className="mt-1 text-sm font-semibold text-navy-900">
                        {book.language || 'English'}
                      </p>
                    </div>

                    {book.publisher && (
                      <div className="rounded-lg border border-parchment-200 bg-ivory-200/60 p-3">
                        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          <Building2 className="h-3.5 w-3.5 text-gold-600" />
                          Publisher
                        </p>
                        <p className="mt-1 text-sm font-semibold text-navy-900">
                          {book.publisher}
                        </p>
                      </div>
                    )}

                    {book.publication_year && (
                      <div className="rounded-lg border border-parchment-200 bg-ivory-200/60 p-3">
                        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          <Calendar className="h-3.5 w-3.5 text-gold-600" />
                          Published
                        </p>
                        <p className="mt-1 font-mono text-sm font-semibold text-navy-900">
                          {book.publication_year}
                        </p>
                      </div>
                    )}

                    {book.isbn && (
                      <div className="rounded-lg border border-parchment-200 bg-ivory-200/60 p-3">
                        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          <Hash className="h-3.5 w-3.5 text-gold-600" />
                          ISBN
                        </p>
                        <p className="mt-1 font-mono text-sm font-semibold text-navy-900">
                          {book.isbn}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Bar */}
                <div className="space-y-3 pt-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href={`/library/books/${book.id}/read`}
                      className="btn-primary px-6 py-3 text-sm sm:text-base"
                    >
                      <BookOpen className="h-4 w-4 text-gold-300" />
                      Read Online
                    </Link>

                    {book.allow_download ? (
                      <a
                        href={`/api/books/${book.id}/download`}
                        className="btn-gold px-6 py-3 text-sm sm:text-base"
                      >
                        <Download className="h-4 w-4" />
                        Download {formatLabel}
                      </a>
                    ) : (
                      <div className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-800">
                        <Lock className="h-4 w-4 shrink-0" />
                        <span>
                          Online reading only — downloading is disabled for this title.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Related Books */}
          {relatedBooks.length > 0 && (
            <section className="mt-12">
              <h2 className="mb-5 font-serif text-xl font-bold text-navy-900">
                More in {book.category?.category_name || 'This Category'}
              </h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {relatedBooks.map((item) => (
                  <BookCard key={item.id} book={item} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <LibraryFooter />
    </div>
  );
}

