import { NextResponse } from 'next/server';
import { getBookById } from '@/lib/queries/library';
import { isValidUuid } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid book identifier.' }, { status: 400 });
  }

  const result = await getBookById(id);
  if (!result.configured) {
    return NextResponse.json({ error: 'Cloud database is not configured yet.' }, { status: 503 });
  }

  if (!result.book) {
    return NextResponse.json({ error: 'Book not found.' }, { status: 404 });
  }

  return NextResponse.json({ book: result.book });
}

