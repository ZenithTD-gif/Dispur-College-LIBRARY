import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  FileText,
  FolderOpen,
  GraduationCap,
  Layers,
  Sparkles,
} from 'lucide-react';
import { BookCard } from '@/components/library/BookCard';
import { LibraryFooter } from '@/components/library/LibraryFooter';
import { LibraryNavbar } from '@/components/library/LibraryNavbar';
import { SearchBar } from '@/components/library/SearchBar';
import { CategoryIcon } from '@/components/shared/CategoryIcon';
import { SetupNotice } from '@/components/shared/SetupNotice';
import { getLibraryHomeData } from '@/lib/queries/library';

export const dynamic = 'force-dynamic';

export default async function LibraryHomePage() {
  const {
    configured,
    totalBooks,
    totalCategories,
    featuredBooks,
    recentBooks,
    categories,
  } = await getLibraryHomeData();

  return (
    <div className="flex min-h-screen flex-col">
      <LibraryNavbar />

      <main className="flex-1">
        {/* Liquid Glass Hero Section */}
        <section className="relative overflow-hidden border-b border-white/[0.08] bg-gradient-to-b from-abyss-900/60 via-abyss-950/40 to-transparent">
          {/* Atmospheric Deep Blue, Amethyst & Burgundy Glass Orbs */}
          <div className="pointer-events-none absolute -top-28 -left-16 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
          <div className="pointer-events-none absolute -top-24 right-8 h-80 w-80 rounded-full bg-amethyst-600/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 right-1/4 h-72 w-72 rounded-full bg-burgundy-700/20 blur-3xl" />

          <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
            <div className="max-w-3xl space-y-6">
              <div className="glass-pill border-white/20 bg-white/[0.07] px-4 py-1.5 text-xs font-semibold tracking-wide text-slate-100">
                <GraduationCap className="h-4 w-4 text-amethyst-300" />
                <span>Professional Studies Department • Dispur College, Assam</span>
              </div>

              <h1 className="font-serif text-3xl font-bold leading-tight text-white sm:text-5xl">
                Welcome to the Digital Library
              </h1>

              <p className="max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
                Your centralized online repository for departmental textbooks,
                reference books, PDF study guides, and academic e-books curated
                by the Professional Studies Department.
              </p>

              <div className="pt-2">
                <SearchBar variant="hero" />
              </div>

              {/* Glass Stats & Quick Actions */}
              <div className="flex flex-wrap items-center gap-3.5 pt-3 text-sm">
                <div className="inline-flex items-center gap-2.5 rounded-full border border-white/[0.15] bg-white/[0.06] px-4 py-2.5 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                  <BookOpen className="h-4 w-4 text-blue-300" />
                  <div>
                    <span className="font-mono text-base font-bold text-white">
                      {totalBooks}
                    </span>
                    <span className="ml-1.5 text-xs text-slate-300">
                      Available {totalBooks === 1 ? 'Book' : 'Books'}
                    </span>
                  </div>
                </div>

                <div className="inline-flex items-center gap-2.5 rounded-full border border-white/[0.15] bg-white/[0.06] px-4 py-2.5 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                  <Layers className="h-4 w-4 text-amethyst-300" />
                  <div>
                    <span className="font-mono text-base font-bold text-white">
                      {totalCategories}
                    </span>
                    <span className="ml-1.5 text-xs text-slate-300">
                      Subject {totalCategories === 1 ? 'Category' : 'Categories'}
                    </span>
                  </div>
                </div>

                <Link
                  href="/library/browse"
                  className="glass-btn-accent group px-5 py-2.5 text-sm"
                >
                  Browse All Books
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {!configured && (
          <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
            <SetupNotice context="library" />
          </section>
        )}

        {/* Featured Books */}
        {featuredBooks.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-rose-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  Department Picks
                </p>
                <h2 className="mt-1 font-serif text-2xl font-bold text-white">
                  Featured Books
                </h2>
              </div>
              <Link
                href="/library/browse"
                className="glass-btn group px-4 py-2 text-xs"
              >
                View catalog
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featuredBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </section>
        )}

        {/* Recently Added Books */}
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-amethyst-300">
                <FileText className="h-3.5 w-3.5" />
                Latest Additions
              </p>
              <h2 className="mt-1 font-serif text-2xl font-bold text-white">
                Recently Added Books
              </h2>
            </div>
            <Link
              href="/library/browse?sort=newest"
              className="glass-btn group px-4 py-2 text-xs"
            >
              See all recent
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </div>

          {recentBooks.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {recentBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          ) : (
            <div className="liquid-glass p-10 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06]">
                <BookOpen className="h-6 w-6 text-amethyst-300" />
              </div>
              <h3 className="font-serif text-lg font-bold text-white">
                No Books Published Yet
              </h3>
              <p className="mx-auto max-w-md text-sm text-slate-300">
                Departmental books uploaded by authorized administrators will
                appear here immediately for online reading and permitted downloads.
              </p>
            </div>
          )}
        </section>

        {/* Browse by Category */}
        <section
          id="categories"
          className="border-t border-white/[0.08] bg-white/[0.02] py-14"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-rose-300">
                  <FolderOpen className="h-3.5 w-3.5" />
                  Academic Disciplines
                </p>
                <h2 className="mt-1 font-serif text-2xl font-bold text-white">
                  Browse by Category
                </h2>
              </div>
              <p className="text-sm text-slate-300">
                Explore study materials organized by departmental subjects.
              </p>
            </div>

            {categories.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/library/browse?category=${encodeURIComponent(cat.slug)}`}
                    className="liquid-glass-hover group flex flex-col justify-between p-5"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-blue-500/20 via-amethyst-500/15 to-burgundy-700/25 text-blue-200 transition-all duration-300 group-hover:scale-105 group-hover:border-white/30 group-hover:text-white">
                          <CategoryIcon name={cat.icon_name} className="h-5 w-5" />
                        </div>
                        <span className="glass-pill font-mono text-xs font-semibold text-slate-200">
                          {cat.book_count}{' '}
                          {cat.book_count === 1 ? 'book' : 'books'}
                        </span>
                      </div>
                      <h3 className="mt-4 font-serif text-base font-bold text-white transition-colors group-hover:text-amethyst-300">
                        {cat.category_name}
                      </h3>
                      {cat.description && (
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-300/85 line-clamp-2">
                          {cat.description}
                        </p>
                      )}
                    </div>
                    <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-blue-200 transition-colors group-hover:text-white">
                      Browse category
                      <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="liquid-glass p-8 text-center text-sm text-slate-300">
                Categories will appear here once configured in the cloud database.
              </div>
            )}
          </div>
        </section>
      </main>

      <LibraryFooter />
    </div>
  );
}

