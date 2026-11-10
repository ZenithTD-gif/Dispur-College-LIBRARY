'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  BookOpen,
  Download,
  Edit,
  ExternalLink,
  Loader2,
  Lock,
  PlusCircle,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { BookCover } from '@/components/shared/BookCover';
import { canDeleteBooks, formatFileSize } from '@/lib/validation';
import type { AdminRole, BookWithCategory, Category } from '@/types/library';

interface AdminBooksManagerProps {
  initialBooks: BookWithCategory[];
  categories: Category[];
  currentRole: AdminRole;
}

export function AdminBooksManager({
  initialBooks,
  categories,
  currentRole,
}: AdminBooksManagerProps) {
  const router = useRouter();
  const [books, setBooks] = useState<BookWithCategory[]>(initialBooks);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [formatFilter, setFormatFilter] = useState('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteBook, setConfirmDeleteBook] = useState<BookWithCategory | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const allowDelete = canDeleteBooks(currentRole);

  const filteredBooks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return books.filter((book) => {
      if (categoryFilter !== 'all' && book.category_id !== categoryFilter) {
        return false;
      }
      if (formatFilter !== 'all' && book.file_type !== formatFilter) {
        return false;
      }
      if (q) {
        const hay = `${book.title} ${book.author} ${book.subject} ${book.category?.category_name || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [books, search, categoryFilter, formatFilter]);

  async function togglePermission(
    book: BookWithCategory,
    field: 'allow_download' | 'is_featured'
  ) {
    setBusyId(book.id);
    setErrorMsg(null);
    const nextValue = !book[field];

    try {
      const res = await fetch(`/api/admin/books/${book.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: nextValue }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to update setting.');
      }

      setBooks((prev) =>
        prev.map((item) => (item.id === book.id ? { ...item, [field]: nextValue } : item))
      );
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setBusyId(null);
    }
  }

  async function executeDelete() {
    if (!confirmDeleteBook) return;
    const target = confirmDeleteBook;
    setBusyId(target.id);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/admin/books/${target.id}`, {
        method: 'DELETE',
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to delete book.');
      }
      setBooks((prev) => prev.filter((item) => item.id !== target.id));
      setConfirmDeleteBook(null);
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      {errorMsg && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Search & Filters */}
      <div className="academic-card p-4 grid gap-3 sm:grid-cols-4">
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter books by title, author, or subject..."
            className="input-academic pl-9"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="input-academic"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.category_name}
            </option>
          ))}
        </select>

        <select
          value={formatFilter}
          onChange={(e) => setFormatFilter(e.target.value)}
          className="input-academic"
        >
          <option value="all">All Formats</option>
          <option value="pdf">PDF Only</option>
          <option value="epub">EPUB Only</option>
        </select>
      </div>

      {/* Books Table */}
      {filteredBooks.length === 0 ? (
        <div className="academic-card p-12 text-center space-y-3">
          <BookOpen className="mx-auto h-10 w-10 text-gold-500/80" />
          <h3 className="font-serif text-lg font-bold text-navy-900">
            {books.length === 0 ? 'No Books Uploaded Yet' : 'No Books Match Your Filter'}
          </h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            {books.length === 0
              ? 'Upload your first departmental PDF or EPUB textbook to make it available in the Student Portal.'
              : 'Adjust your search query or filters to view matching books.'}
          </p>
          {books.length === 0 && (
            <Link href="/admin/books/new" className="btn-primary mt-2">
              <PlusCircle className="h-4 w-4 text-gold-300" />
              Upload First Book
            </Link>
          )}
        </div>
      ) : (
        <div className="academic-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-parchment-300 bg-parchment-100/80 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-4 py-3.5">Book</th>
                  <th className="px-4 py-3.5">Category &amp; Subject</th>
                  <th className="px-4 py-3.5">File</th>
                  <th className="px-4 py-3.5">Student Download</th>
                  <th className="px-4 py-3.5">Featured</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-parchment-200">
                {filteredBooks.map((book) => {
                  const isBusy = busyId === book.id;
                  return (
                    <tr key={book.id} className="hover:bg-ivory-200/70 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3 min-w-[220px]">
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
                            <p className="font-serif font-bold text-navy-900 line-clamp-1">
                              {book.title}
                            </p>
                            <p className="text-xs text-slate-600 line-clamp-1">
                              {book.author}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <p className="text-xs font-semibold text-navy-900">
                          {book.category?.category_name || 'Uncategorized'}
                        </p>
                        <p className="text-xs text-slate-500">{book.subject}</p>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="inline-flex rounded bg-navy-900 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-gold-300">
                          {book.file_type}
                        </span>
                        <p className="mt-1 font-mono text-[11px] text-slate-500">
                          {formatFileSize(book.file_size)}
                        </p>
                      </td>

                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => togglePermission(book, 'allow_download')}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                            book.allow_download
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                          }`}
                        >
                          {book.allow_download ? (
                            <>
                              <Download className="h-3 w-3" />
                              Allowed
                            </>
                          ) : (
                            <>
                              <Lock className="h-3 w-3" />
                              Read Only
                            </>
                          )}
                        </button>
                      </td>

                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => togglePermission(book, 'is_featured')}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                            book.is_featured
                              ? 'bg-gold-100 text-gold-700 hover:bg-gold-200'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <Sparkles className="h-3 w-3" />
                          {book.is_featured ? 'Featured' : 'Standard'}
                        </button>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/library/books/${book.id}/read`}
                            target="_blank"
                            className="rounded-lg border border-parchment-300 bg-white p-2 text-navy-800 hover:bg-parchment-100"
                            title="Preview in online reader"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>

                          <Link
                            href={`/admin/books/${book.id}/edit`}
                            className="rounded-lg border border-parchment-300 bg-white p-2 text-navy-800 hover:bg-parchment-100"
                            title="Edit book & files"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Link>

                          {allowDelete && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setConfirmDeleteBook(book)}
                              className="rounded-lg border border-red-200 bg-white p-2 text-red-700 hover:bg-red-50 disabled:opacity-40"
                              title="Delete book & cloud files"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-parchment-300 bg-white p-6 shadow-2xl space-y-4">
            <h3 className="font-serif text-lg font-bold text-navy-900">
              Delete Book &amp; Cloud Files?
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              This will permanently remove{' '}
              <span className="font-semibold text-navy-900">
                &ldquo;{confirmDeleteBook.title}&rdquo;
              </span>{' '}
              from the digital library database and delete its uploaded{' '}
              {confirmDeleteBook.file_type.toUpperCase()} and cover image from
              cloud storage. This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={busyId === confirmDeleteBook.id}
                onClick={() => setConfirmDeleteBook(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId === confirmDeleteBook.id}
                onClick={executeDelete}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {busyId === confirmDeleteBook.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete Permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

