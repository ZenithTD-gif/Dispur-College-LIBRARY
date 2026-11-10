'use client';

import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import type { BookFileType } from '@/types/library';

interface BookCoverProps {
  title: string;
  author: string;
  fileType: BookFileType;
  coverUrl: string | null;
  subject?: string;
  className?: string;
  sizes?: string;
}

export function BookCover({
  title,
  author,
  fileType,
  coverUrl,
  subject,
  className = '',
}: BookCoverProps) {
  const [imgFailed, setImgFailed] = useState(false);

  if (coverUrl && !imgFailed) {
    return (
      <div
        className={`relative overflow-hidden bg-charcoal-900/80 ${className}`}
      >
        <img
          src={coverUrl}
          alt={`Cover of ${title}`}
          className="h-full w-full object-cover transition-transform duration-500 ease-liquid group-hover:scale-[1.04]"
          onError={() => setImgFailed(true)}
          loading="lazy"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-charcoal-950/65 via-transparent to-offwhite-50/[0.06]" />
      </div>
    );
  }

  return (
    <div
      className={`relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-charcoal-900 via-maroon-950 to-burgundy-900 p-4 text-offwhite-100 select-none ${className}`}
    >
      {/* Subtle 3D Book Spine & Champagne Edge Highlight */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-champagne-400/55 via-wine-600/60 to-transparent" />
      <div className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-wine-600/25 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 left-4 h-24 w-24 rounded-full bg-champagne-400/15 blur-2xl" />
      <div className="pointer-events-none absolute inset-2.5 rounded-xl border border-champagne-200/20 bg-offwhite-100/[0.03]" />

      <div className="relative z-10 flex items-center justify-between gap-2 pl-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-champagne-300/30 bg-offwhite-100/10 px-2.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-champagne-200 backdrop-blur-md">
          {fileType}
        </span>
        <BookOpen className="h-4 w-4 text-champagne-300/85 shrink-0" />
      </div>

      <div className="relative z-10 my-auto pl-2 pr-1 py-2">
        {subject && (
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-rose-200/90 line-clamp-1">
            {subject}
          </p>
        )}
        <h4 className="font-serif text-sm font-bold leading-snug text-offwhite-50 line-clamp-4">
          {title}
        </h4>
      </div>

      <div className="relative z-10 border-t border-offwhite-100/15 pt-2 pl-2">
        <p className="text-[11px] text-offwhite-200/90 line-clamp-1">{author}</p>
        <p className="mt-0.5 text-[9px] uppercase tracking-wider text-champagne-300/80">
          Dispur College
        </p>
      </div>
    </div>
  );
}

