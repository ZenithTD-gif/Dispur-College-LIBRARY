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
          className="glass-btn group mb-4 px-3.5 py-1.5 text-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
          Back to Books
        </Link>
        <h1 className="font-serif text-2xl font-bold text-offwhite-50 sm:text-3xl">
          Upload New Book
        </h1>
        <p className="mt-1 text-sm text-offwhite-300">
          Upload a PDF or EPUB book to cloud storage and publish it immediately to the Student Portal.
        </p>
      </div>

      {categories.length === 0 ? (
        <div className="liquid-glass p-8 text-center space-y-3">
          <p className="font-serif text-lg font-bold text-offwhite-50">
            Create a Category First
          </p>
          <p className="text-sm text-offwhite-300">
            At least one category must exist before publishing a book.
          </p>
          <Link href="/admin/categories" className="glass-btn-primary">
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

