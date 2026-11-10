import { NextResponse } from 'next/server';
import { getSupabasePublicClient } from '@/lib/supabase/server';
import { isValidUuid } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid book identifier.' }, { status: 400 });
  }

  const supabase = getSupabasePublicClient();
  if (!supabase) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  await supabase.rpc('increment_book_metric', {
    p_book_id: id,
    p_metric: 'view',
  });

  return NextResponse.json({ ok: true });
}

