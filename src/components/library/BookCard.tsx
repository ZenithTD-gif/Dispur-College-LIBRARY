import Link from 'next/link';
import { BookOpen, Download, Eye, Lock } from 'lucide-react';
import { BookCover } from '@/components/shared/BookCover';
import { LiquidTiltCard } from '@/components/shared/LiquidTiltCard';
import { formatFileSize } from '@/lib/validation';
import type { BookWithCategory } from '@/types/library';

export function BookCard({ book }: { book: BookWithCategory }) {
  const formatLabel = book.file_type.toUpperCase();

  return (
    <LiquidTiltCard className="h-full rounded-3xl" maxTilt={4.5}>
      <article className="liquid-glass-hover group flex h-full flex-col overflow-hidden">
        {/* 3D Perspective Cover Stage */}
        <Link
          href={`/library/books/${book.id}`}
          className="perspective-stage relative block w-full overflow-hidden border-b border-offwhite-100/[0.1] bg-gradient-to-br from-charcoal-900 via-maroon-950/75 to-charcoal-950 p-4"
        >
          <div className="book-3d-cover relative mx-auto aspect-[3/4] w-full overflow-hidden rounded-2xl border border-champagne-200/20 shadow-book-3d">
            <BookCover
              title={book.title}
              author={book.author}
              fileType={book.file_type}
              coverUrl={book.cover_url}
              subject={book.subject}
              className="h-full w-full"
            />
          </div>

          {/* Format + Featured Glass Badges */}
          <div className="absolute top-6 left-6 right-6 flex items-center justify-between gap-2 pointer-events-none">
            <span className="inline-flex items-center rounded-full border border-champagne-300/35 bg-charcoal-950/75 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-champagne-200 backdrop-blur-xl shadow-sm">
              {formatLabel}
            </span>
            {book.is_featured && (
              <span className="inline-flex items-center rounded-full border border-rose-200/35 bg-gradient-to-r from-burgundy-700/90 to-wine-600/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-offwhite-50 backdrop-blur-xl shadow-sm">
                Featured
              </span>
            )}
          </div>
        </Link>

        {/* Book Information */}
        <div className="flex flex-1 flex-col p-4 sm:p-5">
          <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
            {book.category && (
              <Link
                href={`/library/browse?category=${encodeURIComponent(book.category.slug)}`}
                className="inline-flex items-center rounded-full border border-offwhite-100/[0.16] bg-offwhite-100/[0.07] px-2.5 py-0.5 text-[11px] font-semibold text-offwhite-200 backdrop-blur-md transition-all hover:border-champagne-300/40 hover:bg-offwhite-100/[0.14] hover:text-white"
              >
                {book.category.category_name}
              </Link>
            )}
            <span className="inline-flex items-center rounded-full border border-rose-300/25 bg-wine-700/20 px-2.5 py-0.5 text-[11px] font-medium text-rose-200">
              {book.subject}
            </span>
          </div>

          <Link href={`/library/books/${book.id}`} className="group/title">
            <h3 className="font-serif text-base font-bold leading-snug text-offwhite-50 line-clamp-2 transition-colors group-hover/title:text-champagne-200">
              {book.title}
            </h3>
          </Link>

          <p className="mt-1 text-xs font-medium text-offwhite-300 line-clamp-1">
            by {book.author}
          </p>

          <p className="mt-2.5 text-xs leading-relaxed text-offwhite-300/80 line-clamp-2">
            {book.description}
          </p>

          <div className="mt-3 flex items-center justify-between border-t border-offwhite-100/[0.09] pt-2.5 text-[11px] text-offwhite-300/80">
            <span className="font-mono text-offwhite-200">{formatFileSize(book.file_size)}</span>
            {book.allow_download ? (
              <span className="inline-flex items-center gap-1 font-medium text-champagne-200">
                <Download className="h-3 w-3 text-champagne-300" />
                Downloadable
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-medium text-rose-200">
                <Lock className="h-3 w-3 text-rose-300" />
                Read Only
              </span>
            )}
          </div>

          {/* Transparent Mac Glass Action Buttons */}
          <div className="mt-auto flex flex-col gap-2 pt-4">
            <div className="grid grid-cols-2 gap-2">
              <Link
                href={`/library/books/${book.id}`}
                className="glass-btn px-2.5 py-2 text-xs"
              >
                <Eye className="h-3.5 w-3.5 text-offwhite-300" />
                Details
              </Link>
              <Link
                href={`/library/books/${book.id}/read`}
                className="glass-btn-primary px-2.5 py-2 text-xs"
              >
                <BookOpen className="h-3.5 w-3.5 text-champagne-200" />
                Read Online
              </Link>
            </div>

            {book.allow_download && (
              <a
                href={`/api/books/${book.id}/download`}
                className="glass-btn-accent w-full px-3 py-2 text-xs"
              >
                <Download className="h-3.5 w-3.5" />
                Download {formatLabel}
              </a>
            )}
          </div>
        </div>
      </article>
    </LiquidTiltCard>
  );
}

