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
        className={`relative overflow-hidden bg-abyss-900/80 ${className}`}
      >
        <img
          src={coverUrl}
          alt={`Cover of ${title}`}
          className="h-full w-full object-cover transition-transform duration-500 ease-liquid group-hover:scale-[1.04]"
          onError={() => setImgFailed(true)}
          loading="lazy"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-abyss-950/60 via-transparent to-white/[0.06]" />
      </div>
    );
  }

  return (
    <div
      className={`relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-abyss-800 via-[#111E45] to-[#26091E] p-4 text-slate-100 select-none ${className}`}
    >
      {/* Subtle Liquid Glass spine & specular refraction */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-2.5 bg-gradient-to-b from-blue-400/50 via-amethyst-500/45 to-burgundy-600/60" />
      <div className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-amethyst-500/20 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 left-4 h-24 w-24 rounded-full bg-burgundy-600/20 blur-2xl" />
      <div className="pointer-events-none absolute inset-2.5 rounded-xl border border-white/[0.12] bg-white/[0.02]" />

      <div className="relative z-10 flex items-center justify-between gap-2 pl-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-blue-200 backdrop-blur-md">
          {fileType}
        </span>
        <BookOpen className="h-4 w-4 text-amethyst-300/80 shrink-0" />
      </div>

      <div className="relative z-10 my-auto pl-2 pr-1 py-2">
        {subject && (
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-rose-300/90 line-clamp-1">
            {subject}
          </p>
        )}
        <h4 className="font-serif text-sm font-bold leading-snug text-white line-clamp-4">
          {title}
        </h4>
      </div>

      <div className="relative z-10 border-t border-white/15 pt-2 pl-2">
        <p className="text-[11px] text-slate-200/90 line-clamp-1">{author}</p>
        <p className="mt-0.5 text-[9px] uppercase tracking-wider text-amethyst-300/80">
          Dispur College
        </p>
      </div>
    </div>
  );
}

