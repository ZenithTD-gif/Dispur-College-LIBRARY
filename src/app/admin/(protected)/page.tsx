import Link from 'next/link';
import {
  Activity,
  ArrowRight,
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
import { getAdminOverviewData } from '@/lib/queries/admin';
import { formatFileSize } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const { stats, recentBooks, recentLogs } = await getAdminOverviewData();

  const kpis = [
    {
      label: 'Total Books',
      value: stats.totalBooks,
      sub: `${stats.downloadableBooks} downloadable`,
      icon: BookOpen,
      tone: 'bg-navy-900 text-gold-300',
    },
    {
      label: 'Total PDFs',
      value: stats.totalPdfs,
      sub: 'PDF study materials',
      icon: FileText,
      tone: 'bg-gold-500 text-white',
    },
    {
      label: 'Total E-Books',
      value: stats.totalEpubs,
      sub: 'EPUB digital books',
      icon: BookText,
      tone: 'bg-navy-700 text-ivory-50',
    },
    {
      label: 'Total Categories',
      value: stats.totalCategories,
      sub: `${formatFileSize(stats.totalStorageBytes)} cloud storage`,
      icon: FolderOpen,
      tone: 'bg-parchment-300 text-navy-900',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-navy-900 sm:text-3xl">
            Library Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Overview of departmental digital books, formats, categories, and recent uploads.
          </p>
        </div>

        <Link href="/admin/books/new" className="btn-primary px-5 py-2.5">
          <PlusCircle className="h-4 w-4 text-gold-300" />
          Upload New Book
        </Link>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="academic-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {kpi.label}
                  </p>
                  <p className="mt-2 font-serif text-3xl font-bold text-navy-900">
                    {kpi.value}
                  </p>
                </div>
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${kpi.tone}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500">{kpi.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Main Content Split */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Recently Uploaded Books */}
        <section className="academic-card lg:col-span-8 overflow-hidden">
          <div className="flex items-center justify-between border-b border-parchment-200 px-6 py-4">
            <h2 className="font-serif text-lg font-bold text-navy-900">
              Recently Uploaded Books
            </h2>
            <Link
              href="/admin/books"
              className="inline-flex items-center gap-1 text-xs font-semibold text-navy-800 hover:text-gold-600"
            >
              Manage all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentBooks.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <BookOpen className="mx-auto h-9 w-9 text-gold-500/80" />
              <p className="text-sm font-semibold text-navy-900">
                No books uploaded yet
              </p>
              <p className="text-xs text-slate-500">
                Click &ldquo;Upload New Book&rdquo; above to add your first PDF or EPUB resource.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-parchment-200">
              {recentBooks.map((book) => (
                <div
                  key={book.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 hover:bg-ivory-200/60 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="h-14 w-10 shrink-0 overflow-hidden rounded border border-parchment-300">
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
                        className="font-serif text-sm font-bold text-navy-900 hover:text-gold-600 line-clamp-1"
                      >
                        {book.title}
                      </Link>
                      <p className="text-xs text-slate-600 line-clamp-1">
                        {book.author} • {book.category?.category_name || book.subject}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[11px]">
                        <span className="rounded bg-navy-900 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-gold-300">
                          {book.file_type}
                        </span>
                        <span className="font-mono text-slate-500">
                          {formatFileSize(book.file_size)}
                        </span>
                        {book.allow_download ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            <Download className="h-3 w-3" /> Downloadable
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                            <Lock className="h-3 w-3" /> Read Only
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/library/books/${book.id}/read`}
                      target="_blank"
                      className="inline-flex items-center gap-1 rounded-lg border border-parchment-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-navy-900 hover:bg-parchment-100"
                    >
                      Preview
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                    <Link
                      href={`/admin/books/${book.id}/edit`}
                      className="rounded-lg border border-parchment-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-navy-900 hover:bg-parchment-100"
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
          <div className="academic-card p-6 space-y-3">
            <div className="flex items-center gap-2 text-navy-900">
              <HardDrive className="h-4 w-4 text-gold-600" />
              <h2 className="font-serif text-base font-bold">Cloud Storage Health</h2>
            </div>
            <p className="text-xs leading-relaxed text-slate-600">
              All uploaded PDFs, EPUBs, and cover images are stored securely in
              Supabase Cloud Storage buckets with Row Level Security.
            </p>
            <div className="rounded-lg bg-parchment-100 p-3 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600">Stored Book Volume</span>
              <span className="font-mono font-bold text-navy-900">
                {formatFileSize(stats.totalStorageBytes)}
              </span>
            </div>
          </div>

          <div className="academic-card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-parchment-200 px-5 py-3.5">
              <Activity className="h-4 w-4 text-gold-600" />
              <h2 className="font-serif text-base font-bold text-navy-900">
                Recent Admin Activity
              </h2>
            </div>
            {recentLogs.length === 0 ? (
              <p className="p-5 text-xs text-slate-500">
                No administrative actions recorded yet.
              </p>
            ) : (
              <ul className="divide-y divide-parchment-200 text-xs">
                {recentLogs.map((log) => (
                  <li key={log.id} className="px-5 py-3 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-semibold text-navy-900">
                        {log.action}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(log.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>
                    </div>
                    <p className="truncate text-slate-500">
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

