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
        {/* Academic Hero Section */}
        <section className="relative overflow-hidden bg-navy-900 text-ivory-100">
          {/* Subtle architectural academic grid background */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'radial-gradient(#C6A45C 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
          <div className="pointer-events-none absolute -top-24 right-0 h-80 w-80 rounded-full bg-gold-500/10 blur-3xl" />

          <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
            <div className="max-w-3xl space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-gold-400/35 bg-white/5 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-gold-300 backdrop-blur-sm">
                <GraduationCap className="h-4 w-4 text-gold-400" />
                <span>Professional Studies Department • Dispur College, Assam</span>
              </div>

              <h1 className="font-serif text-3xl font-bold leading-tight text-white sm:text-5xl">
                Welcome to the Digital Library
              </h1>

              <p className="max-w-2xl text-base leading-relaxed text-ivory-200/85 sm:text-lg">
                Your centralized online repository for departmental textbooks,
                reference books, PDF study guides, and academic e-books curated
                by the Professional Studies Department.
              </p>

              <div className="pt-2">
                <SearchBar variant="hero" />
              </div>

              {/* Stats & Quick Actions */}
              <div className="flex flex-wrap items-center gap-4 pt-3 text-sm">
                <div className="inline-flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5">
                  <BookOpen className="h-4 w-4 text-gold-400" />
                  <div>
                    <span className="font-mono text-base font-bold text-white">
                      {totalBooks}
                    </span>
                    <span className="ml-1.5 text-xs text-ivory-200/75">
                      Available {totalBooks === 1 ? 'Book' : 'Books'}
                    </span>
                  </div>
                </div>

                <div className="inline-flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5">
                  <Layers className="h-4 w-4 text-gold-400" />
                  <div>
                    <span className="font-mono text-base font-bold text-white">
                      {totalCategories}
                    </span>
                    <span className="ml-1.5 text-xs text-ivory-200/75">
                      Subject {totalCategories === 1 ? 'Category' : 'Categories'}
                    </span>
                  </div>
                </div>

                <Link
                  href="/library/browse"
                  className="inline-flex items-center gap-2 rounded-xl bg-gold-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gold-600"
                >
                  Browse All Books
                  <ArrowRight className="h-4 w-4" />
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
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gold-600">
                  <Sparkles className="h-3.5 w-3.5" />
                  Department Picks
                </p>
                <h2 className="mt-1 font-serif text-2xl font-bold text-navy-900">
                  Featured Books
                </h2>
              </div>
              <Link
                href="/library/browse"
                className="inline-flex items-center gap-1 text-sm font-semibold text-navy-800 hover:text-gold-600 transition-colors"
              >
                View catalog
                <ArrowRight className="h-4 w-4" />
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
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gold-600">
                <FileText className="h-3.5 w-3.5" />
                Latest Additions
              </p>
              <h2 className="mt-1 font-serif text-2xl font-bold text-navy-900">
                Recently Added Books
              </h2>
            </div>
            <Link
              href="/library/browse?sort=newest"
              className="inline-flex items-center gap-1 text-sm font-semibold text-navy-800 hover:text-gold-600 transition-colors"
            >
              See all recent
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {recentBooks.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {recentBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          ) : (
            <div className="academic-card p-10 text-center space-y-3">
              <BookOpen className="mx-auto h-10 w-10 text-gold-500/80" />
              <h3 className="font-serif text-lg font-bold text-navy-900">
                No Books Published Yet
              </h3>
              <p className="mx-auto max-w-md text-sm text-slate-600">
                Departmental books uploaded by authorized administrators will
                appear here immediately for online reading and permitted downloads.
              </p>
            </div>
          )}
        </section>

        {/* Browse by Category */}
        <section
          id="categories"
          className="border-t border-parchment-300 bg-parchment-100/70 py-14"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gold-600">
                  <FolderOpen className="h-3.5 w-3.5" />
                  Academic Disciplines
                </p>
                <h2 className="mt-1 font-serif text-2xl font-bold text-navy-900">
                  Browse by Category
                </h2>
              </div>
              <p className="text-sm text-slate-600">
                Explore study materials organized by departmental subjects.
              </p>
            </div>

            {categories.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/library/browse?category=${encodeURIComponent(cat.slug)}`}
                    className="academic-card-hover group flex flex-col justify-between p-5"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900/5 text-navy-900 group-hover:bg-navy-900 group-hover:text-gold-300 transition-colors">
                          <CategoryIcon name={cat.icon_name} className="h-5 w-5" />
                        </div>
                        <span className="rounded-full bg-parchment-200 px-2.5 py-0.5 font-mono text-xs font-semibold text-navy-800">
                          {cat.book_count}{' '}
                          {cat.book_count === 1 ? 'book' : 'books'}
                        </span>
                      </div>
                      <h3 className="mt-4 font-serif text-base font-bold text-navy-900 group-hover:text-gold-600 transition-colors">
                        {cat.category_name}
                      </h3>
                      {cat.description && (
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-600 line-clamp-2">
                          {cat.description}
                        </p>
                      )}
                    </div>
                    <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-navy-800 group-hover:text-gold-600">
                      Browse category
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="academic-card p-8 text-center text-sm text-slate-600">
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

