import { getPublicCoverUrl } from '@/lib/supabase/storage';
import type { Book, BookWithCategory, Category } from '@/types/library';

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

