import { NextRequest, NextResponse } from 'next/server';
import { queryCatalogBooks } from '@/lib/queries/library';
import type { CatalogSortOption } from '@/types/library';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const sortParam = searchParams.get('sort') || 'newest';
  const validSorts: CatalogSortOption[] = ['newest', 'oldest', 'title_asc', 'most_viewed'];
  const sort: CatalogSortOption = validSorts.includes(sortParam as CatalogSortOption)
    ? (sortParam as CatalogSortOption)
    : 'newest';

  const formatParam = searchParams.get('format') || 'all';
  const format = formatParam === 'pdf' || formatParam === 'epub' ? formatParam : 'all';

  const downloadable = searchParams.get('downloadable') === 'true' ? 'true' : 'all';

  const result = await queryCatalogBooks({
    q: searchParams.get('q') || undefined,
    category: searchParams.get('category') || undefined,
    subject: searchParams.get('subject') || undefined,
    format,
    downloadable,
    sort,
    page: Number(searchParams.get('page')) || 1,
    limit: Number(searchParams.get('limit')) || 12,
  });

  if (!result.configured) {
    return NextResponse.json(
      { error: 'Cloud database is not configured yet.', ...result },
      { status: 503 }
    );
  }

  return NextResponse.json(result);
}

