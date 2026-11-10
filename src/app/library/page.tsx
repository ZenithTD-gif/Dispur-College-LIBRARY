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
import { BookCover } from '@/components/shared/BookCover';
import { CategoryIcon } from '@/components/shared/CategoryIcon';
import { DispurCollegeLogo } from '@/components/shared/DispurCollegeLogo';
import { LiquidTiltCard } from '@/components/shared/LiquidTiltCard';
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

  const spotlightBook = featuredBooks[0] || recentBooks[0] || null;

  return (
    <div className="flex min-h-screen flex-col">
      <LibraryNavbar />

      <main className="flex-1 animate-page-enter">
        {/* Mac-Inspired 3D Liquid Glass Hero Section */}
        <section className="relative overflow-hidden border-b border-offwhite-100/[0.09] bg-gradient-to-b from-charcoal-900/80 via-maroon-950/60 to-transparent">
          {/* Layered Ambient Depth Orbs (Charcoal -> Deep Maroon -> Burgundy -> Champagne) */}
          <div className="pointer-events-none absolute -top-28 -left-20 h-96 w-96 animate-float-slow rounded-full bg-maroon-700/35 blur-3xl" />
          <div className="pointer-events-none absolute -top-20 right-10 h-80 w-80 rounded-full bg-burgundy-600/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 right-1/4 h-72 w-72 rounded-full bg-champagne-400/10 blur-3xl" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-12 lg:px-8">
            <div className="space-y-6 lg:col-span-7">
              <div className="glass-pill border-champagne-300/30 bg-gradient-to-r from-maroon-900/60 to-burgundy-800/50 px-4 py-1.5 text-xs font-semibold tracking-wide text-champagne-200">
                <GraduationCap className="h-4 w-4 text-champagne-300" />
                <span>Professional Studies Department • Dispur College, Assam</span>
              </div>

              <h1 className="font-serif text-3xl font-bold leading-tight text-offwhite-50 sm:text-5xl">
                Welcome to the{' '}
                <span className="bg-gradient-to-r from-offwhite-50 via-champagne-200 to-rose-200 bg-clip-text text-transparent">
                  Digital Library
                </span>
              </h1>

              <p className="max-w-2xl text-base leading-relaxed text-offwhite-200/85 sm:text-lg">
                Your centralized online repository for departmental textbooks,
                reference books, PDF study guides, and academic e-books curated
                by the Professional Studies Department.
              </p>

              <div className="pt-1">
                <SearchBar variant="hero" />
              </div>

              {/* Frosted Glass KPI Pills & Actions */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2 text-sm">
                <div className="inline-flex items-center gap-2.5 rounded-full border border-offwhite-100/[0.16] bg-offwhite-100/[0.06] px-4 py-2.5 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(250,247,242,0.18)]">
                  <BookOpen className="h-4 w-4 text-champagne-300" />
                  <div>
                    <span className="font-mono text-base font-bold text-offwhite-50">
                      {totalBooks}
                    </span>
                    <span className="ml-1.5 text-xs text-offwhite-300">
                      Available {totalBooks === 1 ? 'Book' : 'Books'}
                    </span>
                  </div>
                </div>

                <div className="inline-flex items-center gap-2.5 rounded-full border border-offwhite-100/[0.16] bg-offwhite-100/[0.06] px-4 py-2.5 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(250,247,242,0.18)]">
                  <Layers className="h-4 w-4 text-rose-200" />
                  <div>
                    <span className="font-mono text-base font-bold text-offwhite-50">
                      {totalCategories}
                    </span>
                    <span className="ml-1.5 text-xs text-offwhite-300">
                      Subject {totalCategories === 1 ? 'Category' : 'Categories'}
                    </span>
                  </div>
                </div>

                <Link
                  href="/library/browse"
                  className="glass-btn-accent group px-5 py-2.5 text-sm"
                >
                  Browse All Books
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>
            </div>

            {/* Lightweight 3D Floating Mac Glass Showcase */}
            <div className="hidden lg:block lg:col-span-5">
              <LiquidTiltCard className="rounded-3xl" maxTilt={6}>
                <div className="liquid-glass p-6">
                  {spotlightBook ? (
                    <div className="group flex items-center gap-5">
                      <Link
                        href={`/library/books/${spotlightBook.id}`}
                        className="perspective-stage shrink-0"
                      >
                        <div className="book-3d-cover h-52 w-36 overflow-hidden rounded-2xl border border-champagne-200/30 shadow-book-3d">
                          <BookCover
                            title={spotlightBook.title}
                            author={spotlightBook.author}
                            fileType={spotlightBook.file_type}
                            coverUrl={spotlightBook.cover_url}
                            subject={spotlightBook.subject}
                            className="h-full w-full"
                          />
                        </div>
                      </Link>
                      <div className="min-w-0 flex-1 space-y-3">
                        <span className="glass-pill border-champagne-300/35 bg-gradient-to-r from-burgundy-800/70 to-wine-700/70 text-[11px] font-semibold text-champagne-200">
                          <Sparkles className="h-3 w-3" />
                          {spotlightBook.is_featured ? 'Featured Resource' : 'Latest Upload'}
                        </span>
                        <h2 className="font-serif text-lg font-bold leading-snug text-offwhite-50 line-clamp-2">
                          {spotlightBook.title}
                        </h2>
                        <p className="text-xs text-offwhite-300 line-clamp-1">
                          by {spotlightBook.author}
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Link
                            href={`/library/books/${spotlightBook.id}/read`}
                            className="glass-btn-primary px-4 py-2 text-xs"
                          >
                            Read Online
                          </Link>
                          <Link
                            href={`/library/books/${spotlightBook.id}`}
                            className="glass-btn px-3.5 py-2 text-xs"
                          >
                            Details
                          </Link>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="flex items-center gap-3.5">
                        <DispurCollegeLogo size="lg" />
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-widest text-champagne-300">
                            Dispur College • Est. 1978
                          </p>
                          <h2 className="font-serif text-lg font-bold text-offwhite-50">
                            Departmental Academic Vault
                          </h2>
                        </div>
                      </div>
                      <p className="text-xs leading-relaxed text-offwhite-200/85">
                        Integrated online browser reader for departmental PDFs and EPUB study materials, synchronized directly with cloud storage.
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="liquid-well p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-offwhite-300/75">
                            Formats Supported
                          </p>
                          <p className="mt-1 font-mono text-sm font-bold text-champagne-200">
                            PDF &amp; EPUB
                          </p>
                        </div>
                        <div className="liquid-well p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-offwhite-300/75">
                            Portal Access
                          </p>
                          <p className="mt-1 font-mono text-sm font-bold text-rose-200">
                            24/7 Cloud
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </LiquidTiltCard>
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
                <h2 className="mt-1 font-serif text-2xl font-bold text-offwhite-50">
                  Featured Books
                </h2>
              </div>
              <Link
                href="/library/browse"
                className="glass-btn group px-4 py-2 text-xs"
              >
                View catalog
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
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
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-champagne-300">
                <FileText className="h-3.5 w-3.5" />
                Latest Additions
              </p>
              <h2 className="mt-1 font-serif text-2xl font-bold text-offwhite-50">
                Recently Added Books
              </h2>
            </div>
            <Link
              href="/library/browse?sort=newest"
              className="glass-btn group px-4 py-2 text-xs"
            >
              See all recent
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
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
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-champagne-300/30 bg-gradient-to-br from-maroon-800/70 to-burgundy-800/60">
                <BookOpen className="h-6 w-6 text-champagne-300" />
              </div>
              <h3 className="font-serif text-lg font-bold text-offwhite-50">
                No Books Published Yet
              </h3>
              <p className="mx-auto max-w-md text-sm text-offwhite-300">
                Departmental books uploaded by authorized administrators will
                appear here immediately for online reading and permitted downloads.
              </p>
            </div>
          )}
        </section>

        {/* Browse by Category */}
        <section
          id="categories"
          className="border-t border-offwhite-100/[0.08] bg-gradient-to-b from-offwhite-100/[0.02] to-maroon-950/35 py-14"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-rose-300">
                  <FolderOpen className="h-3.5 w-3.5" />
                  Academic Disciplines
                </p>
                <h2 className="mt-1 font-serif text-2xl font-bold text-offwhite-50">
                  Browse by Category
                </h2>
              </div>
              <p className="text-sm text-offwhite-300">
                Explore study materials organized by departmental subjects.
              </p>
            </div>

            {categories.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {categories.map((cat) => (
                  <LiquidTiltCard key={cat.id} className="h-full rounded-3xl" maxTilt={4}>
                    <Link
                      href={`/library/browse?category=${encodeURIComponent(cat.slug)}`}
                      className="liquid-glass-hover group flex h-full flex-col justify-between p-5"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-champagne-300/25 bg-gradient-to-br from-maroon-800/75 via-burgundy-700/65 to-wine-600/65 text-champagne-200 transition-all duration-300 group-hover:scale-105 group-hover:border-champagne-200/45 group-hover:text-white">
                            <CategoryIcon name={cat.icon_name} className="h-5 w-5" />
                          </div>
                          <span className="glass-pill font-mono text-xs font-semibold text-champagne-200">
                            {cat.book_count}{' '}
                            {cat.book_count === 1 ? 'book' : 'books'}
                          </span>
                        </div>
                        <h3 className="mt-4 font-serif text-base font-bold text-offwhite-50 transition-colors group-hover:text-champagne-200">
                          {cat.category_name}
                        </h3>
                        {cat.description && (
                          <p className="mt-1.5 text-xs leading-relaxed text-offwhite-300/80 line-clamp-2">
                            {cat.description}
                          </p>
                        )}
                      </div>
                      <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-rose-200 transition-colors group-hover:text-champagne-200">
                        Browse category
                        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                      </span>
                    </Link>
                  </LiquidTiltCard>
                ))}
              </div>
            ) : (
              <div className="liquid-glass p-8 text-center text-sm text-offwhite-300">
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

