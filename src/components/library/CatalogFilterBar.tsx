'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Filter, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import type { CatalogSortOption, CategoryWithCount } from '@/types/library';

interface CatalogFilterBarProps {
  categories: CategoryWithCount[];
  subjects: string[];
  initialValues: {
    q: string;
    category: string;
    subject: string;
    format: 'all' | 'pdf' | 'epub';
    downloadable: 'all' | 'true';
    sort: CatalogSortOption;
  };
  totalResults: number;
}

export function CatalogFilterBar({
  categories,
  subjects,
  initialValues,
  totalResults,
}: CatalogFilterBarProps) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState(initialValues.q);

  function pushParams(overrides: Partial<typeof initialValues>) {
    const merged = { ...initialValues, q: searchInput.trim(), ...overrides };
    const sp = new URLSearchParams();

    if (merged.q) sp.set('q', merged.q);
    if (merged.category && merged.category !== 'all') sp.set('category', merged.category);
    if (merged.subject && merged.subject !== 'all') sp.set('subject', merged.subject);
    if (merged.format && merged.format !== 'all') sp.set('format', merged.format);
    if (merged.downloadable === 'true') sp.set('downloadable', 'true');
    if (merged.sort && merged.sort !== 'newest') sp.set('sort', merged.sort);

    const qs = sp.toString();
    router.push(qs ? `/library/browse?${qs}` : '/library/browse');
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    pushParams({ q: searchInput.trim() });
  }

  function handleReset() {
    setSearchInput('');
    router.push('/library/browse');
  }

  const hasActiveFilters =
    Boolean(initialValues.q) ||
    initialValues.category !== 'all' ||
    initialValues.subject !== 'all' ||
    initialValues.format !== 'all' ||
    initialValues.downloadable === 'true' ||
    initialValues.sort !== 'newest';

  return (
    <div className="academic-card p-4 sm:p-6 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-2xl">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by title, author, subject, or category..."
            className="input-academic pl-10 pr-24"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md bg-navy-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-navy-800 transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex items-center justify-between gap-3 text-sm">
          <p className="text-slate-600 font-medium">
            Showing <span className="font-bold text-navy-900">{totalResults}</span>{' '}
            {totalResults === 1 ? 'resource' : 'resources'}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-lg border border-parchment-400 px-3 py-1.5 text-xs font-semibold text-navy-800 hover:bg-parchment-100 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Filters Row */}
      <div className="grid grid-cols-1 gap-3 pt-2 border-t border-parchment-200 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <Filter className="h-3 w-3" />
            Category
          </label>
          <select
            value={initialValues.category}
            onChange={(e) => pushParams({ category: e.target.value })}
            className="input-academic py-2 text-xs"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.slug}>
                {cat.category_name} ({cat.book_count})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <SlidersHorizontal className="h-3 w-3" />
            Subject
          </label>
          <select
            value={initialValues.subject}
            onChange={(e) => pushParams({ subject: e.target.value })}
            className="input-academic py-2 text-xs"
          >
            <option value="all">All Subjects</option>
            {subjects.map((subj) => (
              <option key={subj} value={subj}>
                {subj}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Format
          </label>
          <select
            value={initialValues.format}
            onChange={(e) =>
              pushParams({ format: e.target.value as 'all' | 'pdf' | 'epub' })
            }
            className="input-academic py-2 text-xs"
          >
            <option value="all">All Formats (PDF &amp; EPUB)</option>
            <option value="pdf">PDF Documents Only</option>
            <option value="epub">EPUB E-Books Only</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Download Permission
          </label>
          <select
            value={initialValues.downloadable}
            onChange={(e) =>
              pushParams({ downloadable: e.target.value as 'all' | 'true' })
            }
            className="input-academic py-2 text-xs"
          >
            <option value="all">All Books</option>
            <option value="true">Downloadable Only</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Sort Order
          </label>
          <select
            value={initialValues.sort}
            onChange={(e) =>
              pushParams({ sort: e.target.value as CatalogSortOption })
            }
            className="input-academic py-2 text-xs"
          >
            <option value="newest">Recently Uploaded</option>
            <option value="title_asc">Title (A – Z)</option>
            <option value="most_viewed">Most Read</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>
    </div>
  );
}

