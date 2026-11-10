'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Loader2,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { formatFileSize } from '@/lib/validation';
import type { BookWithCategory, Category } from '@/types/library';

interface BookFormProps {
  mode: 'create' | 'edit';
  categories: Category[];
  maxBookMb: number;
  maxCoverMb: number;
  initialBook?: BookWithCategory;
}

interface UploadedFileState {
  path: string;
  fileName: string;
  fileType: 'pdf' | 'epub';
  mimeType: string;
  fileSize: number;
}

interface UploadedCoverState {
  path: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  previewUrl: string;
}

function uploadWithProgress(
  signedUrl: string,
  file: File,
  onProgress: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('cacheControl', '3600');
    formData.append('', file);

    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl, true);
    xhr.setRequestHeader('x-upsert', 'false');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new Error(`Cloud upload failed with status ${xhr.status}.`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error occurred while uploading to cloud storage.'));
    };

    xhr.send(formData);
  });
}

export function BookForm({
  mode,
  categories,
  maxBookMb,
  maxCoverMb,
  initialBook,
}: BookFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(initialBook?.title || '');
  const [author, setAuthor] = useState(initialBook?.author || '');
  const [subject, setSubject] = useState(initialBook?.subject || '');
  const [categoryId, setCategoryId] = useState(
    initialBook?.category_id || categories[0]?.id || ''
  );
  const [description, setDescription] = useState(initialBook?.description || '');
  const [publisher, setPublisher] = useState(initialBook?.publisher || '');
  const [publicationYear, setPublicationYear] = useState(
    initialBook?.publication_year ? String(initialBook.publication_year) : ''
  );
  const [isbn, setIsbn] = useState(initialBook?.isbn || '');
  const [language, setLanguage] = useState(initialBook?.language || 'English');
  const [pageCount, setPageCount] = useState(
    initialBook?.page_count ? String(initialBook.page_count) : ''
  );
  const [allowDownload, setAllowDownload] = useState(
    initialBook ? initialBook.allow_download : true
  );
  const [isFeatured, setIsFeatured] = useState(
    initialBook ? initialBook.is_featured : false
  );

  // Book document upload state
  const [uploadedBook, setUploadedBook] = useState<UploadedFileState | null>(null);
  const [bookUploadProgress, setBookUploadProgress] = useState<number | null>(null);
  const [bookUploadError, setBookUploadError] = useState<string | null>(null);

  // Cover upload state
  const [uploadedCover, setUploadedCover] = useState<UploadedCoverState | null>(null);
  const [coverUploadProgress, setCoverUploadProgress] = useState<number | null>(null);
  const [coverUploadError, setCoverUploadError] = useState<string | null>(null);
  const [removeExistingCover, setRemoveExistingCover] = useState(false);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  async function cleanupUnlinkedUpload(bucket: 'book-files' | 'book-covers', path: string) {
    try {
      await fetch('/api/admin/uploads/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucket, path }),
      });
    } catch {
      // Non-fatal cleanup
    }
  }

  async function handleBookFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setBookUploadError(null);
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (ext !== 'pdf' && ext !== 'epub') {
      setBookUploadError('Unsupported file format. Please upload a .pdf or .epub file.');
      return;
    }

    const maxBytes = maxBookMb * 1024 * 1024;
    if (file.size > maxBytes) {
      setBookUploadError(
        `File is too large (${formatFileSize(file.size)}). Maximum allowed size is ${maxBookMb} MB.`
      );
      return;
    }

    // Remove previous uncommitted upload if replacing before submit
    if (uploadedBook) {
      await cleanupUnlinkedUpload('book-files', uploadedBook.path);
    }

    setBookUploadProgress(1);
    try {
      const signRes = await fetch('/api/admin/uploads/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'book',
          fileName: file.name,
          fileType: file.type || (ext === 'pdf' ? 'application/pdf' : 'application/epub+zip'),
          fileSize: file.size,
        }),
      });

      const signData = await signRes.json();
      if (!signRes.ok) {
        throw new Error(signData.error || 'Could not initiate book upload.');
      }

      await uploadWithProgress(signData.signedUrl, file, (pct) => {
        setBookUploadProgress(pct);
      });

      setUploadedBook({
        path: signData.path,
        fileName: file.name,
        fileType: signData.fileType,
        mimeType: signData.mimeType,
        fileSize: file.size,
      });
    } catch (err) {
      setBookUploadError(
        err instanceof Error ? err.message : 'Book file upload failed.'
      );
    } finally {
      setBookUploadProgress(null);
      e.target.value = '';
    }
  }

  async function handleCoverFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setCoverUploadError(null);
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.type.toLowerCase())) {
      setCoverUploadError('Cover image must be JPG, PNG, or WebP.');
      return;
    }

    const maxBytes = maxCoverMb * 1024 * 1024;
    if (file.size > maxBytes) {
      setCoverUploadError(
        `Cover image exceeds ${maxCoverMb} MB limit (${formatFileSize(file.size)}).`
      );
      return;
    }

    if (uploadedCover) {
      await cleanupUnlinkedUpload('book-covers', uploadedCover.path);
    }

    setCoverUploadProgress(1);
    try {
      const signRes = await fetch('/api/admin/uploads/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'cover',
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        }),
      });

      const signData = await signRes.json();
      if (!signRes.ok) {
        throw new Error(signData.error || 'Could not initiate cover image upload.');
      }

      await uploadWithProgress(signData.signedUrl, file, (pct) => {
        setCoverUploadProgress(pct);
      });

      const previewUrl = URL.createObjectURL(file);
      setUploadedCover({
        path: signData.path,
        fileName: file.name,
        mimeType: signData.mimeType,
        fileSize: file.size,
        previewUrl,
      });
      setRemoveExistingCover(false);
    } catch (err) {
      setCoverUploadError(
        err instanceof Error ? err.message : 'Cover upload failed.'
      );
    } finally {
      setCoverUploadProgress(null);
      e.target.value = '';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (bookUploadProgress !== null || coverUploadProgress !== null) {
      setFormError('Please wait for active file uploads to complete before saving.');
      return;
    }

    if (mode === 'create' && !uploadedBook) {
      setFormError('Please upload a PDF or EPUB book file before publishing.');
      return;
    }

    if (!categoryId) {
      setFormError('Please select a category. Create a category first if none exist.');
      return;
    }

    setSaving(true);
    try {
      const parsedYear = publicationYear.trim()
        ? parseInt(publicationYear.trim(), 10)
        : null;
      const parsedPages = pageCount.trim() ? parseInt(pageCount.trim(), 10) : null;

      const payload: Record<string, unknown> = {
        title: title.trim(),
        author: author.trim(),
        subject: subject.trim(),
        category_id: categoryId,
        description: description.trim(),
        publisher: publisher.trim() || null,
        publication_year: Number.isNaN(parsedYear) ? null : parsedYear,
        isbn: isbn.trim() || null,
        language: language.trim() || 'English',
        page_count: Number.isNaN(parsedPages) ? null : parsedPages,
        allow_download: allowDownload,
        is_featured: isFeatured,
      };

      if (uploadedBook) {
        payload.file_storage_path = uploadedBook.path;
        payload.file_name = uploadedBook.fileName;
        payload.file_type = uploadedBook.fileType;
        payload.mime_type = uploadedBook.mimeType;
        payload.file_size = uploadedBook.fileSize;
      }

      if (uploadedCover) {
        payload.cover_image_path = uploadedCover.path;
        payload.cover_mime_type = uploadedCover.mimeType;
        payload.cover_file_size = uploadedCover.fileSize;
        payload.cover_original_name = uploadedCover.fileName;
      } else if (mode === 'edit' && removeExistingCover) {
        payload.remove_cover = true;
      }

      const endpoint =
        mode === 'create'
          ? '/api/admin/books'
          : `/api/admin/books/${initialBook?.id}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to save book details.');
      }

      setFormSuccess(
        mode === 'create'
          ? 'Book uploaded to cloud storage and published to the Student Library!'
          : 'Book information and files updated successfully!'
      );

      router.push('/admin/books');
      router.refresh();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Unable to save book.'
      );
    } finally {
      setSaving(false);
    }
  }

  const activeCoverPreview =
    uploadedCover?.previewUrl ||
    (!removeExistingCover ? initialBook?.cover_url : null);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {formError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-2xl border border-rose-400/35 bg-rose-500/15 p-4 text-sm text-rose-200 backdrop-blur-xl"
        >
          <AlertCircle className="h-5 w-5 text-rose-300 shrink-0 mt-0.5" />
          <span>{formError}</span>
        </div>
      )}

      {formSuccess && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-400/35 bg-emerald-500/15 p-4 text-sm text-emerald-200 backdrop-blur-xl">
          <CheckCircle2 className="h-5 w-5 text-emerald-300 shrink-0 mt-0.5" />
          <span>{formSuccess}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Metadata Form */}
        <div className="lg:col-span-7 space-y-5">
          <div className="liquid-glass p-6 space-y-4">
            <h2 className="font-serif text-lg font-bold text-white border-b border-white/[0.1] pb-3">
              Book Information
            </h2>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Book Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Principles of Financial Management"
                className="liquid-input"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Author Name *
                </label>
                <input
                  type="text"
                  required
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="e.g. Dr. A. K. Sharma"
                  className="liquid-input"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Corporate Finance"
                  className="liquid-input"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Category *
                </label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="liquid-input"
                >
                  {categories.length === 0 ? (
                    <option value="">No categories created yet</option>
                  ) : (
                    categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.category_name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Language
                </label>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="English"
                  className="liquid-input"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Description / Overview *
              </label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Summarize the scope, syllabus coverage, and topics covered in this resource..."
                className="liquid-input resize-y"
              />
            </div>
          </div>

          {/* Publication Info & Permissions */}
          <div className="liquid-glass p-6 space-y-4">
            <h2 className="font-serif text-lg font-bold text-white border-b border-white/[0.1] pb-3">
              Publication Details &amp; Access Controls
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Publisher
                </label>
                <input
                  type="text"
                  value={publisher}
                  onChange={(e) => setPublisher(e.target.value)}
                  placeholder="e.g. Oxford Academic / Dept. Press"
                  className="liquid-input"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Publication Year
                </label>
                <input
                  type="number"
                  min={1400}
                  max={2100}
                  value={publicationYear}
                  onChange={(e) => setPublicationYear(e.target.value)}
                  placeholder="e.g. 2024"
                  className="liquid-input"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  ISBN (Optional)
                </label>
                <input
                  type="text"
                  value={isbn}
                  onChange={(e) => setIsbn(e.target.value)}
                  placeholder="978-0-12-345678-9"
                  className="liquid-input font-mono"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Page Count (Optional)
                </label>
                <input
                  type="number"
                  min={1}
                  max={20000}
                  value={pageCount}
                  onChange={(e) => setPageCount(e.target.value)}
                  placeholder="e.g. 320"
                  className="liquid-input"
                />
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-white/[0.1]">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowDownload}
                  onChange={(e) => setAllowDownload(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-white/30 bg-abyss-950/70 text-amethyst-500 focus:ring-amethyst-400"
                />
                <div>
                  <span className="block text-sm font-semibold text-white">
                    Allow Student Downloads
                  </span>
                  <span className="block text-xs text-slate-400">
                    When disabled, students can only read this book online in the integrated browser reader.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-white/30 bg-abyss-950/70 text-amethyst-500 focus:ring-amethyst-400"
                />
                <div>
                  <span className="block text-sm font-semibold text-white">
                    Feature on Library Homepage
                  </span>
                  <span className="block text-xs text-slate-400">
                    Highlight this title in the Featured Books showcase on /library.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Cloud Storage Upload Column */}
        <div className="lg:col-span-5 space-y-5">
          {/* Book Document Upload */}
          <div className="liquid-glass p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.1] pb-3">
              <h2 className="font-serif text-lg font-bold text-white">
                Book Document (PDF / EPUB) {mode === 'create' ? '*' : ''}
              </h2>
              <span className="glass-pill font-mono text-[11px] font-semibold text-blue-200">
                Max {maxBookMb} MB
              </span>
            </div>

            {mode === 'edit' && initialBook && !uploadedBook && (
              <div className="liquid-well p-3.5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="h-5 w-5 text-amethyst-300 shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-white">
                        {initialBook.file_name}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400">
                        {initialBook.file_type.toUpperCase()} •{' '}
                        {formatFileSize(initialBook.file_size)}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/library/books/${initialBook.id}/read`}
                    target="_blank"
                    className="glass-btn px-2.5 py-1 text-[11px] shrink-0"
                  >
                    Preview
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )}

            {uploadedBook && (
              <div className="rounded-2xl border border-emerald-400/35 bg-emerald-500/15 p-3.5 space-y-1.5 backdrop-blur-xl">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />
                    <span className="truncate text-xs font-semibold text-emerald-100">
                      {uploadedBook.fileName}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-emerald-200 shrink-0">
                    {uploadedBook.fileType.toUpperCase()} •{' '}
                    {formatFileSize(uploadedBook.fileSize)}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-200/80">
                  Uploaded securely to private cloud storage bucket.
                </p>
              </div>
            )}

            {bookUploadProgress !== null && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-medium text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-amethyst-300" />
                    Uploading to Supabase Storage...
                  </span>
                  <span className="font-mono">{bookUploadProgress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.1]">
                  <div
                    className="h-full bg-gradient-to-r from-blue-400 via-amethyst-400 to-rose-400 transition-all duration-150"
                    style={{ width: `${bookUploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {bookUploadError && (
              <p className="rounded-2xl border border-rose-400/35 bg-rose-500/15 p-3 text-xs text-rose-200">
                {bookUploadError}
              </p>
            )}

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/25 bg-abyss-950/45 p-6 text-center transition-all duration-300 hover:border-amethyst-400/60 hover:bg-white/[0.06]">
              <UploadCloud className="h-8 w-8 text-amethyst-300 mb-2" />
              <span className="text-xs font-semibold text-white">
                {uploadedBook || mode === 'edit'
                  ? 'Click to replace PDF or EPUB file'
                  : 'Click to select PDF or EPUB file'}
              </span>
              <span className="mt-1 text-[11px] text-slate-400">
                Accepted formats: .pdf, .epub
              </span>
              <input
                type="file"
                accept=".pdf,.epub,application/pdf,application/epub+zip"
                onChange={handleBookFileSelect}
                disabled={bookUploadProgress !== null}
                className="sr-only"
              />
            </label>
          </div>

          {/* Book Cover Upload */}
          <div className="liquid-glass p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.1] pb-3">
              <h2 className="font-serif text-lg font-bold text-white">
                Book Cover Image
              </h2>
              <span className="glass-pill font-mono text-[11px] font-semibold text-blue-200">
                Max {maxCoverMb} MB
              </span>
            </div>

            {activeCoverPreview && (
              <div className="liquid-well flex items-start gap-4 p-3">
                <img
                  src={activeCoverPreview}
                  alt="Cover preview"
                  className="h-28 w-20 rounded-xl object-cover border border-white/20 shrink-0"
                />
                <div className="flex-1 min-w-0 space-y-2">
                  <p className="text-xs font-semibold text-white truncate">
                    {uploadedCover ? uploadedCover.fileName : 'Current Cover Image'}
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      if (uploadedCover) {
                        await cleanupUnlinkedUpload('book-covers', uploadedCover.path);
                        setUploadedCover(null);
                      } else {
                        setRemoveExistingCover(true);
                      }
                    }}
                    className="glass-btn-danger px-3 py-1 text-[11px]"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove Cover
                  </button>
                </div>
              </div>
            )}

            {coverUploadProgress !== null && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-medium text-slate-200">
                  <span>Uploading cover image...</span>
                  <span className="font-mono">{coverUploadProgress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.1]">
                  <div
                    className="h-full bg-gradient-to-r from-blue-400 to-amethyst-400 transition-all duration-150"
                    style={{ width: `${coverUploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {coverUploadError && (
              <p className="rounded-2xl border border-rose-400/35 bg-rose-500/15 p-3 text-xs text-rose-200">
                {coverUploadError}
              </p>
            )}

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/25 bg-abyss-950/45 p-5 text-center transition-all duration-300 hover:border-amethyst-400/60 hover:bg-white/[0.06]">
              <ImageIcon className="h-7 w-7 text-amethyst-300 mb-1.5" />
              <span className="text-xs font-semibold text-white">
                {activeCoverPreview ? 'Replace cover image' : 'Upload cover image (optional)'}
              </span>
              <span className="mt-1 text-[11px] text-slate-400">
                JPG, PNG, or WebP • Clean academic fallback shown if omitted
              </span>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={handleCoverFileSelect}
                disabled={coverUploadProgress !== null}
                className="sr-only"
              />
            </label>
          </div>

          {/* Submit Bar */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <Link href="/admin/books" className="glass-btn">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || bookUploadProgress !== null || coverUploadProgress !== null}
              className="glass-btn-primary px-6"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <BookOpen className="h-4 w-4 text-amethyst-300" />
                  {mode === 'create' ? 'Publish Book to Library' : 'Save Book Changes'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

