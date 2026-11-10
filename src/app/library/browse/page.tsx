import Link from 'next/link';
import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { BookCard } from '@/components/library/BookCard';
import { CatalogFilterBar } from '@/components/library/CatalogFilterBar';
import { LibraryFooter } from '@/components/library/LibraryFooter';
import { LibraryNavbar } from '@/components/library/LibraryNavbar';
import { SetupNotice } from '@/components/shared/SetupNotice';
import { getCategoriesWithCounts, queryCatalogBooks } from '@/lib/queries/library';
import type { CatalogSortOption } from '@/types/library';

export const dynamic = 'force-dynamic';

function readParam(val: string | string[] | undefined): string {
  return Array.isArray(val) ? val[0] || '' : val || '';
}

export default async function BrowseLibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = readParam(sp.q).trim();
  const category = readParam(sp.category).trim() || 'all';
  const subject = readParam(sp.subject).trim() || 'all';
  const formatRaw = readParam(sp.format);
  const format: 'all' | 'pdf' | 'epub' =
    formatRaw === 'pdf' || formatRaw === 'epub' ? formatRaw : 'all';
  const downloadable: 'all' | 'true' = readParam(sp.downloadable) === 'true' ? 'true' : 'all';
  const sortRaw = readParam(sp.sort);
  const validSorts: CatalogSortOption[] = ['newest', 'oldest', 'title_asc', 'most_viewed'];
  const sort: CatalogSortOption = validSorts.includes(sortRaw as CatalogSortOption)
    ? (sortRaw as CatalogSortOption)
    : 'newest';
  const page = Math.max(1, parseInt(readParam(sp.page) || '1', 10) || 1);

  const [{ categories }, catalog] = await Promise.all([
    getCategoriesWithCounts(),
    queryCatalogBooks({
      q,
      category,
      subject,
      format,
      downloadable,
      sort,
      page,
      limit: 12,
    }),
  ]);

  function pageHref(targetPage: number): string {
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (category !== 'all') next.set('category', category);
    if (subject !== 'all') next.set('subject', subject);
    if (format !== 'all') next.set('format', format);
    if (downloadable === 'true') next.set('downloadable', 'true');
    if (sort !== 'newest') next.set('sort', sort);
    if (targetPage > 1) next.set('page', String(targetPage));
    const qs = next.toString();
    return qs ? `/library/browse?${qs}` : '/library/browse';
  }

  return (
    <div className="flex min-h-screen flex-col">
      <LibraryNavbar />

      <main className="flex-1 bg-ivory-100">
        <div className="border-b border-parchment-300 bg-navy-900 py-10 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-gold-300">
              Professional Studies Department • Dispur College
            </p>
            <h1 className="mt-1 font-serif text-2xl font-bold sm:text-3xl">
              Digital Book Catalog
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-ivory-200/80">
              Search and filter departmental books, reference textbooks, PDFs, and
              EPUB study materials.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
          {!catalog.configured && <SetupNotice context="library" />}

          <CatalogFilterBar
            categories={categories}
            subjects={catalog.subjects}
            initialValues={{ q, category, subject, format, downloadable, sort }}
            totalResults={catalog.total}
          />

          {catalog.books.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {catalog.books.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>

              {/* Pagination */}
              {catalog.totalPages > 1 && (
                <nav
                  aria-label="Catalog pagination"
                  className="flex items-center justify-between border-t border-parchment-300 pt-6"
                >
                  <Link
                    href={pageHref(Math.max(1, catalog.page - 1))}
                    aria-disabled={catalog.page <= 1}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors ${
                      catalog.page <= 1
                        ? 'pointer-events-none border-parchment-300 bg-white/60 text-slate-400'
                        : 'border-parchment-400 bg-white text-navy-900 hover:bg-parchment-100'
                    }`}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Link>

                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: catalog.totalPages }, (_, i) => i + 1)
                      .filter(
                        (p) =>
                          p === 1 ||
                          p === catalog.totalPages ||
                          Math.abs(p - catalog.page) <= 2
                      )
                      .map((p) => (
                        <Link
                          key={p}
                          href={pageHref(p)}
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                            p === catalog.page
                              ? 'bg-navy-900 text-white'
                              : 'border border-parchment-300 bg-white text-navy-900 hover:bg-parchment-100'
                          }`}
                        >
                          {p}
                        </Link>
                      ))}
                  </div>

                  <Link
                    href={pageHref(Math.min(catalog.totalPages, catalog.page + 1))}
                    aria-disabled={catalog.page >= catalog.totalPages}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors ${
                      catalog.page >= catalog.totalPages
                        ? 'pointer-events-none border-parchment-300 bg-white/60 text-slate-400'
                        : 'border-parchment-400 bg-white text-navy-900 hover:bg-parchment-100'
                    }`}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </nav>
              )}
            </>
          ) : (
            <div className="academic-card p-12 text-center space-y-3">
              <BookOpen className="mx-auto h-10 w-10 text-gold-500/80" />
              <h2 className="font-serif text-lg font-bold text-navy-900">
                No Matching Books Found
              </h2>
              <p className="mx-auto max-w-md text-sm text-slate-600">
                No books matched your current search or filter criteria. Try
                clearing filters or searching with another title, author, or subject.
              </p>
              <Link href="/library/browse" className="btn-secondary mt-2">
                Reset All Filters
              </Link>
            </div>
          )}
        </div>
      </main>

      <LibraryFooter />
    </div>
  );
}

