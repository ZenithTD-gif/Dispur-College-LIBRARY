import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  BookMarked,
  BookOpen,
  BookText,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  HardDrive,
  Lock,
  PlusCircle,
} from 'lucide-react';
import { BookCover } from '@/components/shared/BookCover';
import { getAdminOverviewData, getRentalOverviewSummary } from '@/lib/queries/admin';
import { formatFileSize } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const [{ stats, recentBooks, recentLogs }, rentalSummary] = await Promise.all([
    getAdminOverviewData(),
    getRentalOverviewSummary(),
  ]);

  const kpis = [
    {
      label: 'Total Books',
      value: stats.totalBooks,
      sub: `${stats.downloadableBooks} downloadable`,
      icon: BookOpen,
      tone: 'border-champagne-300/30 bg-gradient-to-br from-maroon-800/80 to-burgundy-700/75 text-champagne-200',
    },
    {
      label: 'Total PDFs',
      value: stats.totalPdfs,
      sub: 'PDF study materials',
      icon: FileText,
      tone: 'border-rose-300/30 bg-gradient-to-br from-burgundy-800/80 to-wine-600/75 text-rose-100',
    },
    {
      label: 'Total E-Books',
      value: stats.totalEpubs,
      sub: 'EPUB digital books',
      icon: BookText,
      tone: 'border-champagne-200/35 bg-gradient-to-br from-rose-300/20 to-champagne-300/25 text-champagne-100',
    },
    {
      label: 'Total Categories',
      value: stats.totalCategories,
      sub: `${formatFileSize(stats.totalStorageBytes)} cloud storage`,
      icon: FolderOpen,
      tone: 'border-offwhite-100/20 bg-offwhite-100/[0.09] text-offwhite-50',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-offwhite-50 sm:text-3xl">
            Library Dashboard
          </h1>
          <p className="mt-1 text-sm text-offwhite-300">
            Overview of departmental digital books, formats, categories, and recent uploads.
          </p>
        </div>

        <Link href="/admin/books/new" className="glass-btn-primary px-5 py-2.5">
          <PlusCircle className="h-4 w-4 text-champagne-200" />
          Upload New Book
        </Link>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="liquid-glass-hover p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-offwhite-300/75">
                    {kpi.label}
                  </p>
                  <p className="mt-2 font-serif text-3xl font-bold text-offwhite-50">
                    {kpi.value}
                  </p>
                </div>
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl border backdrop-blur-xl ${kpi.tone}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-xs text-offwhite-300/80">{kpi.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Student & Book Rental Management Section */}
      <section className="liquid-panel p-6 sm:p-7 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-offwhite-100/[0.1] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="glass-pill border-champagne-300/35 bg-maroon-900/60 px-2.5 py-0.5 text-[11px] font-semibold text-champagne-200">
                Department Management
              </span>
            </div>
            <h2 className="mt-1 font-serif text-xl font-bold text-offwhite-50 sm:text-2xl">
              Student & Book Rental Management
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-offwhite-300">
              Track 7-day free borrowing periods, issue books, record returns, calculate late fines, and manage registered students.
            </p>
          </div>

          <Link
            href="/admin/rentals"
            className="glass-btn-accent px-4 py-2 text-xs self-start md:self-auto shrink-0"
          >
            <BookMarked className="h-4 w-4 text-champagne-100" />
            <span>Manage Students & Rentals</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-4">
          <div className="liquid-well p-3.5">
            <span className="text-[11px] uppercase font-semibold text-offwhite-400 block">
              Active Issues
            </span>
            <p className="font-mono text-2xl font-bold text-offwhite-50 mt-1">
              {rentalSummary.activeRentals}
            </p>
            <span className="text-[10px] text-offwhite-400">Books currently borrowed</span>
          </div>

          <div className="liquid-well p-3.5">
            <span className="text-[11px] uppercase font-semibold text-offwhite-400 block">
              Overdue Loans
            </span>
            <p
              className={`font-mono text-2xl font-bold mt-1 ${
                rentalSummary.overdueRentals > 0 ? 'text-rose-300' : 'text-offwhite-50'
              }`}
            >
              {rentalSummary.overdueRentals}
            </p>
            <span className="text-[10px] text-rose-300/80">Past 7-day free deadline</span>
          </div>

          <div className="liquid-well p-3.5">
            <span className="text-[11px] uppercase font-semibold text-offwhite-400 block">
              Registered Students
            </span>
            <p className="font-mono text-2xl font-bold text-champagne-200 mt-1">
              {rentalSummary.totalStudents}
            </p>
            <span className="text-[10px] text-offwhite-400">Student library accounts</span>
          </div>

          <div className="liquid-well p-3.5">
            <span className="text-[11px] uppercase font-semibold text-offwhite-400 block">
              Outstanding Fines
            </span>
            <p className="font-mono text-2xl font-bold text-champagne-100 mt-1">
              ₹{rentalSummary.outstandingFines.toFixed(2)}
            </p>
            <span className="text-[10px] text-champagne-300/80">Late return penalties</span>
          </div>
        </div>
      </section>

      {/* Main Content Split */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Recently Uploaded Books */}
        <section className="liquid-glass lg:col-span-8 overflow-hidden">
          <div className="flex items-center justify-between border-b border-offwhite-100/[0.09] px-6 py-4">
            <h2 className="font-serif text-lg font-bold text-offwhite-50">
              Recently Uploaded Books
            </h2>
            <Link
              href="/admin/books"
              className="glass-btn px-3 py-1.5 text-xs"
            >
              Manage all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentBooks.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <BookOpen className="mx-auto h-9 w-9 text-champagne-300" />
              <p className="text-sm font-semibold text-offwhite-50">
                No books uploaded yet
              </p>
              <p className="text-xs text-offwhite-300">
                Click &ldquo;Upload New Book&rdquo; above to add your first PDF or EPUB resource.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-offwhite-100/[0.08]">
              {recentBooks.map((book) => (
                <div
                  key={book.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-offwhite-100/[0.04]"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="h-14 w-10 shrink-0 overflow-hidden rounded-lg border border-champagne-300/25">
                      <BookCover
                        title={book.title}
                        author={book.author}
                        fileType={book.file_type}
                        coverUrl={book.cover_url}
                        className="h-full w-full"
                      />
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/admin/books/${book.id}/edit`}
                        className="font-serif text-sm font-bold text-offwhite-50 hover:text-champagne-200 line-clamp-1 transition-colors"
                      >
                        {book.title}
                      </Link>
                      <p className="text-xs text-offwhite-300 line-clamp-1">
                        {book.author} • {book.category?.category_name || book.subject}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[11px]">
                        <span className="rounded-full border border-champagne-300/30 bg-offwhite-100/[0.08] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-champagne-200">
                          {book.file_type}
                        </span>
                        <span className="font-mono text-offwhite-300/75">
                          {formatFileSize(book.file_size)}
                        </span>
                        {book.allow_download ? (
                          <span className="inline-flex items-center gap-1 text-champagne-200 font-medium">
                            <Download className="h-3 w-3 text-champagne-300" /> Downloadable
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-200 font-medium">
                            <Lock className="h-3 w-3 text-rose-300" /> Read Only
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/library/books/${book.id}/read`}
                      target="_blank"
                      className="glass-btn px-3 py-1.5 text-xs"
                    >
                      Preview
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                    <Link
                      href={`/admin/books/${book.id}/edit`}
                      className="glass-btn px-3 py-1.5 text-xs"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Cloud Storage & Audit Activity */}
        <section className="space-y-6 lg:col-span-4">
          <div className="liquid-glass p-6 space-y-3">
            <div className="flex items-center gap-2 text-offwhite-50">
              <HardDrive className="h-4 w-4 text-champagne-300" />
              <h2 className="font-serif text-base font-bold">Cloud Storage Health</h2>
            </div>
            <p className="text-xs leading-relaxed text-offwhite-300">
              All uploaded PDFs, EPUBs, and cover images are stored securely in
              Supabase Cloud Storage buckets with Row Level Security.
            </p>
            <div className="liquid-well p-3.5 flex items-center justify-between text-xs">
              <span className="font-medium text-offwhite-300">Stored Book Volume</span>
              <span className="font-mono font-bold text-champagne-200">
                {formatFileSize(stats.totalStorageBytes)}
              </span>
            </div>
          </div>

          <div className="liquid-glass overflow-hidden">
            <div className="flex items-center gap-2 border-b border-offwhite-100/[0.09] px-5 py-3.5">
              <Activity className="h-4 w-4 text-rose-300" />
              <h2 className="font-serif text-base font-bold text-offwhite-50">
                Recent Admin Activity
              </h2>
            </div>
            {recentLogs.length === 0 ? (
              <p className="p-5 text-xs text-offwhite-300/75">
                No administrative actions recorded yet.
              </p>
            ) : (
              <ul className="divide-y divide-offwhite-100/[0.08] text-xs">
                {recentLogs.map((log) => (
                  <li key={log.id} className="px-5 py-3 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-semibold text-champagne-200">
                        {log.action}
                      </span>
                      <span className="text-[11px] text-offwhite-400">
                        {new Date(log.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>
                    </div>
                    <p className="truncate text-offwhite-300/75">
                      {log.actor_email || 'System'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

