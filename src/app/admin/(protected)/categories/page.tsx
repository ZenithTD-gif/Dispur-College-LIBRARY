import { CategoriesManager } from '@/components/admin/CategoriesManager';
import { getCurrentAdmin } from '@/lib/auth/admin';
import { getAdminCategories } from '@/lib/queries/admin';

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
  const [auth, categories] = await Promise.all([
    getCurrentAdmin(),
    getAdminCategories(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-offwhite-50 sm:text-3xl">
          Manage Categories
        </h1>
        <p className="mt-1 text-sm text-offwhite-300">
          Create, edit, or organize subject categories displayed across the Student Portal.
        </p>
      </div>

      <CategoriesManager
        initialCategories={categories}
        currentRole={auth?.admin.role || 'editor'}
      />
    </div>
  );
}

