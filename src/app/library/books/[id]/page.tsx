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

      <main className="flex-1">
        {/* Glass Breadcrumb */}
        <div className="border-b border-white/[0.08] bg-white/[0.025] backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3 text-xs text-slate-400 sm:px-6 lg:px-8">
            <Link href="/library" className="hover:text-white transition-colors">
              Digital Library
            </Link>
            <span>/</span>
            <Link href="/library/browse" className="hover:text-white transition-colors">
              Catalog
            </Link>
            {book.category && (
              <>
                <span>/</span>
                <Link
                  href={`/library/browse?category=${encodeURIComponent(book.category.slug)}`}
                  className="hover:text-white transition-colors"
                >
                  {book.category.category_name}
                </Link>
              </>
            )}
            <span>/</span>
            <span className="font-semibold text-slate-100 truncate max-w-xs sm:max-w-md">
              {book.title}
            </span>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/library/browse"
            className="glass-btn group mb-6 px-3.5 py-1.5 text-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
            Back to Catalog
          </Link>

          <div className="liquid-glass overflow-hidden p-6 sm:p-8 lg:p-10">
            <div className="grid gap-8 lg:grid-cols-12">
              {/* Left Cover Column */}
              <div className="lg:col-span-4">
                <div className="mx-auto max-w-[300px] overflow-hidden rounded-3xl border border-white/[0.16] shadow-academic aspect-[3/4]">
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
                        className="glass-pill hover:border-white/30 hover:bg-white/[0.12] hover:text-white"
                      >
                        {book.category.category_name}
                      </Link>
                    )}
                    <span className="inline-flex items-center rounded-full border border-blue-400/25 bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-200">
                      {book.subject}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-white/20 bg-white/[0.08] px-3 py-1 font-mono text-[11px] font-semibold text-amethyst-300">
                      {formatLabel}
                    </span>
                    {book.is_featured && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-rose-300/30 bg-gradient-to-r from-burgundy-700/60 to-amethyst-600/60 px-3 py-1 text-xs font-semibold text-white">
                        <Sparkles className="h-3 w-3" />
                        Featured
                      </span>
                    )}
                  </div>

                  <div>
                    <h1 className="font-serif text-2xl font-bold leading-snug text-white sm:text-3xl lg:text-4xl">
                      {book.title}
                    </h1>
                    <p className="mt-2 text-base font-medium text-slate-300">
                      By <span className="text-white font-semibold">{book.author}</span>
                    </p>
                  </div>

                  <div className="border-y border-white/[0.1] py-5">
                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-amethyst-300">
                      Synopsis &amp; Overview
                    </h2>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200/90 sm:text-base">
                      {book.description}
                    </p>
                  </div>

                  {/* Metadata Glass Well Grid */}
                  <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
                    <div className="liquid-well p-3.5">
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        <FileType className="h-3.5 w-3.5 text-amethyst-300" />
                        Format
                      </p>
                      <p className="mt-1 font-mono text-sm font-semibold text-white">
                        {formatLabel}
                      </p>
                    </div>

                    <div className="liquid-well p-3.5">
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        <HardDrive className="h-3.5 w-3.5 text-amethyst-300" />
                        File Size
                      </p>
                      <p className="mt-1 font-mono text-sm font-semibold text-white">
                        {formatFileSize(book.file_size)}
                      </p>
                    </div>

                    <div className="liquid-well p-3.5">
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        <Globe className="h-3.5 w-3.5 text-amethyst-300" />
                        Language
                      </p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        {book.language || 'English'}
                      </p>
                    </div>

                    {book.publisher && (
                      <div className="liquid-well p-3.5">
                        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          <Building2 className="h-3.5 w-3.5 text-rose-300" />
                          Publisher
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {book.publisher}
                        </p>
                      </div>
                    )}

                    {book.publication_year && (
                      <div className="liquid-well p-3.5">
                        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          <Calendar className="h-3.5 w-3.5 text-rose-300" />
                          Published
                        </p>
                        <p className="mt-1 font-mono text-sm font-semibold text-white">
                          {book.publication_year}
                        </p>
                      </div>
                    )}

                    {book.isbn && (
                      <div className="liquid-well p-3.5">
                        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          <Hash className="h-3.5 w-3.5 text-rose-300" />
                          ISBN
                        </p>
                        <p className="mt-1 font-mono text-sm font-semibold text-white">
                          {book.isbn}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Transparent Glass Action Bar */}
                <div className="space-y-3 pt-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href={`/library/books/${book.id}/read`}
                      className="glass-btn-primary px-6 py-3 text-sm sm:text-base"
                    >
                      <BookOpen className="h-4 w-4 text-amethyst-300" />
                      Read Online
                    </Link>

                    {book.allow_download ? (
                      <a
                        href={`/api/books/${book.id}/download`}
                        className="glass-btn-accent px-6 py-3 text-sm sm:text-base"
                      >
                        <Download className="h-4 w-4" />
                        Download {formatLabel}
                      </a>
                    ) : (
                      <div className="inline-flex items-center gap-2 rounded-full border border-rose-400/30 bg-burgundy-800/30 px-4 py-2.5 text-xs font-medium text-rose-200 backdrop-blur-xl">
                        <Lock className="h-4 w-4 shrink-0 text-rose-300" />
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
              <h2 className="mb-5 font-serif text-xl font-bold text-white">
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

