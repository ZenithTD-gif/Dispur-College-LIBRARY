import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { BookForm } from '@/components/admin/BookForm';
import { getUploadLimits } from '@/lib/env';
import { getAdminBookById, getAdminCategories } from '@/lib/queries/admin';
import { isValidUuid } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export default async function EditBookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isValidUuid(id)) {
    notFound();
  }

  const [book, categories] = await Promise.all([
    getAdminBookById(id),
    getAdminCategories(),
  ]);

  if (!book) {
    notFound();
  }

  const limits = getUploadLimits();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/books"
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-navy-800 hover:text-gold-600"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Books
        </Link>
        <h1 className="font-serif text-2xl font-bold text-navy-900 sm:text-3xl">
          Edit Book
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Update metadata, change student download permissions, or replace uploaded cloud files.
        </p>
      </div>

      <BookForm
        mode="edit"
        categories={categories}
        maxBookMb={limits.maxBookMb}
        maxCoverMb={limits.maxCoverMb}
        initialBook={book}
      />
    </div>
  );
}

