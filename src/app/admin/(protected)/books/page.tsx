import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { AdminBooksManager } from '@/components/admin/AdminBooksManager';
import { getCurrentAdmin } from '@/lib/auth/admin';
import { getAdminBooks, getAdminCategories } from '@/lib/queries/admin';

export const dynamic = 'force-dynamic';

export default async function AdminBooksPage() {
  const [auth, books, categories] = await Promise.all([
    getCurrentAdmin(),
    getAdminBooks(),
    getAdminCategories(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-white sm:text-3xl">
            Manage Books
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            Edit book details, toggle student download permissions, replace files, or remove resources.
          </p>
        </div>

        <Link href="/admin/books/new" className="glass-btn-primary">
          <PlusCircle className="h-4 w-4 text-amethyst-300" />
          Upload New Book
        </Link>
      </div>

      <AdminBooksManager
        initialBooks={books}
        categories={categories}
        currentRole={auth?.admin.role || 'editor'}
      />
    </div>
  );
}

