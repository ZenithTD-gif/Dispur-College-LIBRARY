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
          className="glass-btn group mb-4 px-3.5 py-1.5 text-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
          Back to Books
        </Link>
        <h1 className="font-serif text-2xl font-bold text-white sm:text-3xl">
          Edit Book
        </h1>
        <p className="mt-1 text-sm text-slate-300">
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

