import Link from 'next/link';
import { BookOpen, Download, Eye, Lock } from 'lucide-react';
import { BookCover } from '@/components/shared/BookCover';
import { formatFileSize } from '@/lib/validation';
import type { BookWithCategory } from '@/types/library';

export function BookCard({ book }: { book: BookWithCategory }) {
  const formatLabel = book.file_type.toUpperCase();

  return (
    <article className="academic-card-hover group flex h-full flex-col overflow-hidden">
      {/* Cover Header */}
      <Link
        href={`/library/books/${book.id}`}
        className="relative block aspect-[3/4] w-full overflow-hidden border-b border-parchment-200 bg-parchment-100"
      >
        <BookCover
          title={book.title}
          author={book.author}
          fileType={book.file_type}
          coverUrl={book.cover_url}
          subject={book.subject}
          className="h-full w-full"
        />

        {/* Format + Featured Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
          <span className="inline-flex items-center rounded-md bg-navy-900/90 px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-gold-300 backdrop-blur-sm shadow-sm">
            {formatLabel}
          </span>
          {book.is_featured && (
            <span className="inline-flex items-center rounded-md bg-gold-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
              Featured
            </span>
          )}
        </div>
      </Link>

      {/* Book Information */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {book.category && (
            <Link
              href={`/library/browse?category=${encodeURIComponent(book.category.slug)}`}
              className="inline-flex items-center rounded-full bg-parchment-200 px-2.5 py-0.5 text-[11px] font-semibold text-navy-800 hover:bg-parchment-300 transition-colors"
            >
              {book.category.category_name}
            </Link>
          )}
          <span className="inline-flex items-center rounded-full bg-navy-50 px-2.5 py-0.5 text-[11px] font-medium text-navy-700">
            {book.subject}
          </span>
        </div>

        <Link href={`/library/books/${book.id}`} className="group/title">
          <h3 className="font-serif text-base font-bold leading-snug text-navy-900 line-clamp-2 group-hover/title:text-gold-600 transition-colors">
            {book.title}
          </h3>
        </Link>

        <p className="mt-1 text-xs font-medium text-slate-600 line-clamp-1">
          by {book.author}
        </p>

        <p className="mt-2.5 text-xs leading-relaxed text-slate-600 line-clamp-2">
          {book.description}
        </p>

        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-parchment-200 pt-2.5">
          <span className="font-mono">{formatFileSize(book.file_size)}</span>
          {book.allow_download ? (
            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
              <Download className="h-3 w-3" />
              Downloadable
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
              <Lock className="h-3 w-3" />
              Read Only
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex flex-col gap-2 pt-1">
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={`/library/books/${book.id}`}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-parchment-400 bg-white px-3 py-2 text-xs font-semibold text-navy-900 transition-colors hover:bg-parchment-100"
            >
              <Eye className="h-3.5 w-3.5" />
              View Details
            </Link>
            <Link
              href={`/library/books/${book.id}/read`}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-navy-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-navy-800"
            >
              <BookOpen className="h-3.5 w-3.5 text-gold-300" />
              Read Online
            </Link>
          </div>

          {book.allow_download && (
            <a
              href={`/api/books/${book.id}/download`}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-gold-300 bg-gold-100/50 px-3 py-2 text-xs font-semibold text-gold-700 transition-colors hover:bg-gold-100"
            >
              <Download className="h-3.5 w-3.5" />
              Download {formatLabel}
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

