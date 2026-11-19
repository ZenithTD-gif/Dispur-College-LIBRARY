import {
  mapBookWithCategory,
  mapCategoriesWithCounts,
  type RawBookRow,
} from '@/lib/queries/mappers';
import { getSupabasePublicClient } from '@/lib/supabase/server';
import { sanitizeSearchTerm } from '@/lib/validation';
import type {
  BookWithCategory,
  CatalogQueryParams,
  CatalogResult,
  Category,
  CategoryWithCount,
} from '@/types/library';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

let categoriesCountCache: CacheEntry<{
  configured: boolean;
  categories: CategoryWithCount[];
}> | null = null;

let catalogFilterCache: CacheEntry<{
  categoriesList: Array<{ id: string; slug: string; category_name: string }>;
  subjects: string[];
}> | null = null;

const CACHE_TTL_MS = 60 * 1000; // 60-second in-memory cache

export function invalidateLibraryCache() {
  categoriesCountCache = null;
  catalogFilterCache = null;
}

export async function getCategoriesWithCounts(): Promise<{
  configured: boolean;
  categories: CategoryWithCount[];
}> {
  if (categoriesCountCache && Date.now() < categoriesCountCache.expiresAt) {
    return categoriesCountCache.data;
  }

  const supabase = getSupabasePublicClient();
  if (!supabase) {
    return { configured: false, categories: [] };
  }

  const [{ data: catRows, error: catErr }, { data: bookCategoryRows }] = await Promise.all([
    supabase.from('categories').select('*').order('category_name', { ascending: true }),
    supabase.from('books').select('category_id'),
  ]);

  if (catErr || !catRows) {
    return { configured: true, categories: [] };
  }

  const result = {
    configured: true,
    categories: mapCategoriesWithCounts(
      catRows as Category[],
      bookCategoryRows as Array<{ category_id: string | null }> | null
    ),
  };

  categoriesCountCache = {
    data: result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };

  return result;
}

export async function getLibraryHomeData(): Promise<{
  configured: boolean;
  totalBooks: number;
  totalCategories: number;
  featuredBooks: BookWithCategory[];
  recentBooks: BookWithCategory[];
  categories: CategoryWithCount[];
}> {
  const supabase = getSupabasePublicClient();
  if (!supabase) {
    return {
      configured: false,
      totalBooks: 0,
      totalCategories: 0,
      featuredBooks: [],
      recentBooks: [],
      categories: [],
    };
  }

  const [countRes, featuredRes, recentRes, categoriesRes] = await Promise.all([
    supabase.from('books').select('*', { count: 'exact', head: true }),
    supabase
      .from('books')
      .select('*, categories(id, category_name, slug, icon_name)')
      .eq('is_featured', true)
      .order('created_at', { ascending: false })
      .limit(4),
    supabase
      .from('books')
      .select('*, categories(id, category_name, slug, icon_name)')
      .order('created_at', { ascending: false })
      .limit(8),
    getCategoriesWithCounts(),
  ]);

  const featuredBooks = ((featuredRes.data as RawBookRow[] | null) ?? []).map(mapBookWithCategory);
  const recentBooks = ((recentRes.data as RawBookRow[] | null) ?? []).map(mapBookWithCategory);

  return {
    configured: true,
    totalBooks: countRes.count ?? recentBooks.length,
    totalCategories: categoriesRes.categories.length,
    featuredBooks,
    recentBooks,
    categories: categoriesRes.categories,
  };
}

export async function queryCatalogBooks(params: CatalogQueryParams): Promise<
  CatalogResult & { configured: boolean }
> {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(48, Math.max(1, Number(params.limit) || 12));
  const offset = (page - 1) * limit;

  const supabase = getSupabasePublicClient();
  if (!supabase) {
    return {
      configured: false,
      books: [],
      total: 0,
      page,
      limit,
      totalPages: 1,
      subjects: [],
    };
  }

  // Resolve category slug or UUID if provided, and gather distinct subjects + search matching categories
  const cleanSearch = params.q ? sanitizeSearchTerm(params.q) : '';

  let categoriesList: Array<{ id: string; slug: string; category_name: string }>;
  let subjects: string[];

  if (catalogFilterCache && Date.now() < catalogFilterCache.expiresAt) {
    categoriesList = catalogFilterCache.data.categoriesList;
    subjects = catalogFilterCache.data.subjects;
  } else {
    const [allCategoriesRes, allSubjectsRes] = await Promise.all([
      supabase.from('categories').select('id, slug, category_name'),
      supabase.from('books').select('subject').order('subject', { ascending: true }),
    ]);

    categoriesList = (allCategoriesRes.data ?? []) as Array<{
      id: string;
      slug: string;
      category_name: string;
    }>;

    const subjectSet = new Set<string>();
    for (const row of allSubjectsRes.data ?? []) {
      if (row.subject && typeof row.subject === 'string') {
        subjectSet.add(row.subject.trim());
      }
    }
    subjects = Array.from(subjectSet);

    catalogFilterCache = {
      data: { categoriesList, subjects },
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
  }

  let query = supabase
    .from('books')
    .select('*, categories(id, category_name, slug, icon_name)', { count: 'exact' });

  if (params.category && params.category !== 'all') {
    const matchedCat = categoriesList.find(
      (c) => c.slug === params.category || c.id === params.category
    );
    if (matchedCat) {
      query = query.eq('category_id', matchedCat.id);
    } else {
      // Unknown category filter -> zero results
      return {
        configured: true,
        books: [],
        total: 0,
        page,
        limit,
        totalPages: 1,
        subjects,
      };
    }
  }

  if (params.subject && params.subject !== 'all') {
    query = query.ilike('subject', params.subject.trim());
  }

  if (params.format === 'pdf' || params.format === 'epub') {
    query = query.eq('file_type', params.format);
  }

  if (params.downloadable === 'true') {
    query = query.eq('allow_download', true);
  }

  if (cleanSearch) {
    const lowerSearch = cleanSearch.toLowerCase();
    const matchingCategoryIds = categoriesList
      .filter((c) => c.category_name.toLowerCase().includes(lowerSearch))
      .map((c) => c.id);

    const orClauses = [
      `title.ilike.%${cleanSearch}%`,
      `author.ilike.%${cleanSearch}%`,
      `subject.ilike.%${cleanSearch}%`,
      `description.ilike.%${cleanSearch}%`,
      `publisher.ilike.%${cleanSearch}%`,
    ];

    if (matchingCategoryIds.length > 0) {
      orClauses.push(`category_id.in.(${matchingCategoryIds.join(',')})`);
    }

    query = query.or(orClauses.join(','));
  }

  switch (params.sort) {
    case 'oldest':
      query = query.order('created_at', { ascending: true });
      break;
    case 'title_asc':
      query = query.order('title', { ascending: true });
      break;
    case 'most_viewed':
      query = query.order('view_count', { ascending: false }).order('created_at', { ascending: false });
      break;
    case 'newest':
    default:
      query = query.order('created_at', { ascending: false });
      break;
  }

  const { data, count, error } = await query.range(offset, offset + limit - 1);

  if (error) {
    console.error('Catalog query error:', error.message);
    return {
      configured: true,
      books: [],
      total: 0,
      page,
      limit,
      totalPages: 1,
      subjects,
    };
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    configured: true,
    books: ((data as RawBookRow[] | null) ?? []).map(mapBookWithCategory),
    total,
    page,
    limit,
    totalPages,
    subjects,
  };
}

export async function getBookById(id: string): Promise<{
  configured: boolean;
  book: BookWithCategory | null;
}> {
  const supabase = getSupabasePublicClient();
  if (!supabase) {
    return { configured: false, book: null };
  }

  const { data, error } = await supabase
    .from('books')
    .select('*, categories(id, category_name, slug, icon_name)')
    .eq('id', id)
    .maybeSingle<RawBookRow>();

  if (error || !data) {
    return { configured: true, book: null };
  }

  return { configured: true, book: mapBookWithCategory(data) };
}

export async function getRelatedBooks(
  book: BookWithCategory,
  limit = 4
): Promise<BookWithCategory[]> {
  const supabase = getSupabasePublicClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from('books')
    .select('*, categories(id, category_name, slug, icon_name)')
    .eq('category_id', book.category_id)
    .neq('id', book.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  return ((data as RawBookRow[] | null) ?? []).map(mapBookWithCategory);
}

