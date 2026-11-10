import { getPublicCoverUrl } from '@/lib/supabase/storage';
import type {
  Book,
  BookWithCategory,
  Category,
  CategoryWithCount,
} from '@/types/library';

export interface RawBookRow extends Book {
  categories: Pick<Category, 'id' | 'category_name' | 'slug' | 'icon_name'> | null;
}

export function mapBookWithCategory(row: RawBookRow): BookWithCategory {
  const { categories, ...book } = row;
  return {
    ...book,
    category: categories ?? null,
    cover_url: getPublicCoverUrl(book.cover_image_path),
  };
}

/**
 * Attaches aggregated book counts to category rows without duplicate loops.
 */
export function mapCategoriesWithCounts(
  categories: Category[] | null,
  bookCategoryRows: Array<{ category_id: string | null }> | null
): CategoryWithCount[] {
  const counts = new Map<string, number>();
  for (const row of bookCategoryRows ?? []) {
    if (row.category_id) {
      counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
    }
  }

  return (categories ?? []).map((cat) => ({
    ...cat,
    book_count: counts.get(cat.id) ?? 0,
  }));
}

