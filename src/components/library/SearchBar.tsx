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
        className={`pointer-events-none absolute left-4 text-slate-400 ${
          variant === 'hero' ? 'h-5 w-5' : 'h-4 w-4'
        }`}
      />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        aria-label="Search departmental digital library"
        className={`w-full rounded-xl border bg-white text-navy-900 placeholder:text-slate-400 shadow-academic transition-all focus:outline-none focus:ring-2 focus:ring-gold-400 ${
          variant === 'hero'
            ? 'border-white/20 py-4 pl-12 pr-32 text-sm sm:text-base'
            : 'border-parchment-400 py-2.5 pl-10 pr-24 text-sm shadow-sm'
        }`}
      />
      <button
        type="submit"
        className={`absolute right-2 rounded-lg font-semibold text-white transition-colors ${
          variant === 'hero'
            ? 'bg-gold-500 px-5 py-2.5 text-sm hover:bg-gold-600'
            : 'bg-navy-900 px-3.5 py-1.5 text-xs hover:bg-navy-800'
        }`}
      >
        Search
      </button>
    </form>
  );
}

