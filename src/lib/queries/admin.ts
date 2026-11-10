import {
  mapBookWithCategory,
  mapCategoriesWithCounts,
  type RawBookRow,
} from '@/lib/queries/mappers';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { sanitizeSearchTerm } from '@/lib/validation';
import type {
  AdminOverviewStats,
  AdminUser,
  AuditLog,
  BookWithCategory,
  Category,
  CategoryWithCount,
} from '@/types/library';

export async function getAdminOverviewData(): Promise<{
  stats: AdminOverviewStats;
  recentBooks: BookWithCategory[];
  recentLogs: AuditLog[];
}> {
  const emptyStats: AdminOverviewStats = {
    totalBooks: 0,
    totalPdfs: 0,
    totalEpubs: 0,
    totalCategories: 0,
    downloadableBooks: 0,
    totalStorageBytes: 0,
  };

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return { stats: emptyStats, recentBooks: [], recentLogs: [] };
  }

  const [booksMetaRes, catCountRes, recentBooksRes, logsRes] = await Promise.all([
    adminClient.from('books').select('file_type, file_size, allow_download'),
    adminClient.from('categories').select('*', { count: 'exact', head: true }),
    adminClient
      .from('books')
      .select('*, categories(id, category_name, slug, icon_name)')
      .order('created_at', { ascending: false })
      .limit(6),
    adminClient
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  const rows = (booksMetaRes.data ?? []) as Array<{
    file_type: 'pdf' | 'epub';
    file_size: number;
    allow_download: boolean;
  }>;

  const stats: AdminOverviewStats = {
    totalBooks: rows.length,
    totalPdfs: rows.filter((r) => r.file_type === 'pdf').length,
    totalEpubs: rows.filter((r) => r.file_type === 'epub').length,
    totalCategories: catCountRes.count ?? 0,
    downloadableBooks: rows.filter((r) => r.allow_download).length,
    totalStorageBytes: rows.reduce((sum, r) => sum + (Number(r.file_size) || 0), 0),
  };

  return {
    stats,
    recentBooks: ((recentBooksRes.data as RawBookRow[] | null) ?? []).map(mapBookWithCategory),
    recentLogs: (logsRes.data as AuditLog[] | null) ?? [],
  };
}

export async function getAdminBooks(params?: {
  q?: string;
  categoryId?: string;
  format?: string;
}): Promise<BookWithCategory[]> {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) return [];

  let query = adminClient
    .from('books')
    .select('*, categories(id, category_name, slug, icon_name)')
    .order('created_at', { ascending: false });

  if (params?.categoryId && params.categoryId !== 'all') {
    query = query.eq('category_id', params.categoryId);
  }

  if (params?.format && (params.format === 'pdf' || params.format === 'epub')) {
    query = query.eq('file_type', params.format);
  }

  const clean = params?.q ? sanitizeSearchTerm(params.q) : '';
  if (clean) {
    query = query.or(
      `title.ilike.%${clean}%,author.ilike.%${clean}%,subject.ilike.%${clean}%`
    );
  }

  const { data } = await query;
  return ((data as RawBookRow[] | null) ?? []).map(mapBookWithCategory);
}

export async function getAdminBookById(id: string): Promise<BookWithCategory | null> {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) return null;

  const { data } = await adminClient
    .from('books')
    .select('*, categories(id, category_name, slug, icon_name)')
    .eq('id', id)
    .maybeSingle<RawBookRow>();

  return data ? mapBookWithCategory(data) : null;
}

export async function getAdminCategories(): Promise<CategoryWithCount[]> {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) return [];

  const [{ data: categories }, { data: books }] = await Promise.all([
    adminClient.from('categories').select('*').order('category_name', { ascending: true }),
    adminClient.from('books').select('category_id'),
  ]);

  return mapCategoriesWithCounts(
    (categories as Category[] | null) ?? [],
    books as Array<{ category_id: string | null }> | null
  );
}

export async function getAdminTeam(): Promise<AdminUser[]> {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) return [];

  const { data } = await adminClient
    .from('admin_users')
    .select('*')
    .order('created_at', { ascending: true });

  return (data as AdminUser[] | null) ?? [];
}

