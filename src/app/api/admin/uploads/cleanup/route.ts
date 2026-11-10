import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminApi } from '@/lib/auth/admin';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  BOOK_COVERS_BUCKET,
  BOOK_FILES_BUCKET,
  safeRemoveStorageFile,
} from '@/lib/supabase/storage';
import { isValidStoragePath } from '@/lib/validation';

export const dynamic = 'force-dynamic';

const cleanupSchema = z.object({
  bucket: z.enum([BOOK_FILES_BUCKET, BOOK_COVERS_BUCKET]),
  path: z.string().trim().min(5).max(500),
});

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const parsed = cleanupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid cleanup payload.' }, { status: 400 });
  }

  const { bucket, path } = parsed.data;
  const expectedPrefix = bucket === BOOK_FILES_BUCKET ? 'books/' : 'covers/';
  if (!isValidStoragePath(path, expectedPrefix)) {
    return NextResponse.json({ error: 'Invalid storage path.' }, { status: 400 });
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Storage client unavailable.' }, { status: 503 });
  }

  // Prevent deleting a storage object already referenced by a saved book
  const { data: linked } = await adminClient
    .from('storage_assets')
    .select('id')
    .eq('storage_path', path)
    .maybeSingle();

  if (linked) {
    return NextResponse.json(
      { error: 'Cannot clean up a file currently attached to a saved book.' },
      { status: 409 }
    );
  }

  await safeRemoveStorageFile(adminClient, bucket, path);
  return NextResponse.json({ ok: true });
}

