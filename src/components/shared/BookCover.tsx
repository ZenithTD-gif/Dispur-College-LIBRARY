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
        className={`relative overflow-hidden bg-parchment-200 ${className}`}
      >
        <img
          src={coverUrl}
          alt={`Cover of ${title}`}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          onError={() => setImgFailed(true)}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 p-4 text-ivory-100 select-none ${className}`}
    >
      {/* Subtle academic spine accent */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-gold-500/80 to-gold-400/20" />
      <div className="pointer-events-none absolute inset-2 border border-gold-400/25 rounded" />

      <div className="relative z-10 flex items-center justify-between gap-2 pl-2">
        <span className="inline-flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-gold-300">
          {fileType}
        </span>
        <BookOpen className="h-4 w-4 text-gold-400/70 shrink-0" />
      </div>

      <div className="relative z-10 my-auto pl-2 pr-1 py-2">
        {subject && (
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gold-300/90 line-clamp-1">
            {subject}
          </p>
        )}
        <h4 className="font-serif text-sm font-bold leading-snug text-ivory-50 line-clamp-4">
          {title}
        </h4>
      </div>

      <div className="relative z-10 border-t border-white/10 pt-2 pl-2">
        <p className="text-[11px] text-ivory-200/80 line-clamp-1">{author}</p>
        <p className="mt-0.5 text-[9px] uppercase tracking-wider text-gold-300/70">
          Dispur College
        </p>
      </div>
    </div>
  );
}

