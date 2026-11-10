import Link from 'next/link';
import { BookOpen, Download, Eye, Lock } from 'lucide-react';
import { BookCover } from '@/components/shared/BookCover';
import { formatFileSize } from '@/lib/validation';
import type { BookWithCategory } from '@/types/library';

export function BookCard({ book }: { book: BookWithCategory }) {
  const formatLabel = book.file_type.toUpperCase();

  return (
    <article className="liquid-glass-hover group flex h-full flex-col overflow-hidden">
      {/* Cover Header */}
      <Link
        href={`/library/books/${book.id}`}
        className="relative block aspect-[3/4] w-full overflow-hidden border-b border-white/[0.1] bg-abyss-950/60"
      >
        <BookCover
          title={book.title}
          author={book.author}
          fileType={book.file_type}
          coverUrl={book.cover_url}
          subject={book.subject}
          className="h-full w-full"
        />

        {/* Format + Featured Glass Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
          <span className="inline-flex items-center rounded-full border border-white/25 bg-abyss-950/65 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-blue-200 backdrop-blur-xl shadow-sm">
            {formatLabel}
          </span>
          {book.is_featured && (
            <span className="inline-flex items-center rounded-full border border-rose-200/35 bg-gradient-to-r from-burgundy-700/80 to-amethyst-600/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-xl shadow-sm">
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
              className="inline-flex items-center rounded-full border border-white/[0.14] bg-white/[0.07] px-2.5 py-0.5 text-[11px] font-semibold text-slate-200 backdrop-blur-md transition-all hover:border-white/30 hover:bg-white/[0.14] hover:text-white"
            >
              {book.category.category_name}
            </Link>
          )}
          <span className="inline-flex items-center rounded-full border border-blue-400/20 bg-blue-500/15 px-2.5 py-0.5 text-[11px] font-medium text-blue-200">
            {book.subject}
          </span>
        </div>

        <Link href={`/library/books/${book.id}`} className="group/title">
          <h3 className="font-serif text-base font-bold leading-snug text-white line-clamp-2 transition-colors group-hover/title:text-amethyst-300">
            {book.title}
          </h3>
        </Link>

        <p className="mt-1 text-xs font-medium text-slate-300 line-clamp-1">
          by {book.author}
        </p>

        <p className="mt-2.5 text-xs leading-relaxed text-slate-300/85 line-clamp-2">
          {book.description}
        </p>

        <div className="mt-3 flex items-center justify-between border-t border-white/[0.09] pt-2.5 text-[11px] text-slate-400">
          <span className="font-mono text-slate-300">{formatFileSize(book.file_size)}</span>
          {book.allow_download ? (
            <span className="inline-flex items-center gap-1 font-medium text-emerald-300">
              <Download className="h-3 w-3" />
              Downloadable
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-medium text-rose-300">
              <Lock className="h-3 w-3" />
              Read Only
            </span>
          )}
        </div>

        {/* Transparent Glass Action Buttons */}
        <div className="mt-auto flex flex-col gap-2 pt-4">
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={`/library/books/${book.id}`}
              className="glass-btn px-2.5 py-2 text-xs"
            >
              <Eye className="h-3.5 w-3.5 text-slate-300" />
              Details
            </Link>
            <Link
              href={`/library/books/${book.id}/read`}
              className="glass-btn-primary px-2.5 py-2 text-xs"
            >
              <BookOpen className="h-3.5 w-3.5 text-amethyst-300" />
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
  );
}

