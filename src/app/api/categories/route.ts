import { NextResponse } from 'next/server';
import { getCategoriesWithCounts } from '@/lib/queries/library';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await getCategoriesWithCounts();
  if (!result.configured) {
    return NextResponse.json(
      { error: 'Cloud database is not configured yet.', categories: [] },
      { status: 503 }
    );
  }
  return NextResponse.json({ categories: result.categories });
}

