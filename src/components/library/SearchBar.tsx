'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

interface SearchBarProps {
  initialQuery?: string;
  placeholder?: string;
  variant?: 'hero' | 'compact';
}

export function SearchBar({
  initialQuery = '',
  placeholder = 'Search by book title, author, subject, or category...',
  variant = 'hero',
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/library/browse?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push('/library/browse');
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`relative flex w-full items-center ${
        variant === 'hero' ? 'max-w-2xl' : 'max-w-xl'
      }`}
      role="search"
    >
      <Search
        className={`pointer-events-none absolute left-4 z-10 text-amethyst-300/80 ${
          variant === 'hero' ? 'h-5 w-5' : 'h-4 w-4'
        }`}
      />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        aria-label="Search departmental digital library"
        className={`w-full rounded-full border border-white/[0.18] bg-white/[0.07] text-white placeholder:text-slate-300/75 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_14px_40px_-10px_rgba(2,6,23,0.7),inset_0_1px_0_rgba(255,255,255,0.22)] transition-all duration-300 ease-liquid focus:border-amethyst-400/60 focus:bg-white/[0.11] focus:outline-none focus:ring-2 focus:ring-amethyst-500/30 ${
          variant === 'hero'
            ? 'py-4 pl-12 pr-32 text-sm sm:text-base'
            : 'py-2.5 pl-10 pr-24 text-sm'
        }`}
      />
      <button
        type="submit"
        className={`glass-btn-primary absolute right-1.5 ${
          variant === 'hero' ? 'px-5 py-2.5 text-sm' : 'px-3.5 py-1.5 text-xs'
        }`}
      >
        Search
      </button>
    </form>
  );
}

