import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BookForm } from '@/components/admin/BookForm';
import { getUploadLimits } from '@/lib/env';
import { getAdminCategories } from '@/lib/queries/admin';

export const dynamic = 'force-dynamic';

export default async function NewBookPage() {
  const categories = await getAdminCategories();
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
          Upload New Book
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Upload a PDF or EPUB book to cloud storage and publish it immediately to the Student Portal.
        </p>
      </div>

      {categories.length === 0 ? (
        <div className="academic-card p-8 text-center space-y-3">
          <p className="font-serif text-lg font-bold text-navy-900">
            Create a Category First
          </p>
          <p className="text-sm text-slate-600">
            At least one category must exist before publishing a book.
          </p>
          <Link href="/admin/categories" className="btn-primary">
            Go to Categories
          </Link>
        </div>
      ) : (
        <BookForm
          mode="create"
          categories={categories}
          maxBookMb={limits.maxBookMb}
          maxCoverMb={limits.maxCoverMb}
        />
      )}
    </div>
  );
}

