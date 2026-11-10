import { NextResponse } from 'next/server';
import { isSupabaseAdminConfigured } from '@/lib/env';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { BOOK_FILES_BUCKET } from '@/lib/supabase/storage';
import { isValidUuid, sanitizeStorageFilename } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid book identifier.' }, { status: 400 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: 'Cloud storage is not configured yet.' },
      { status: 503 }
    );
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Storage client unavailable.' }, { status: 503 });
  }

  const { data: book, error: bookError } = await adminClient
    .from('books')
    .select('id, title, file_storage_path, file_name, file_type, allow_download')
    .eq('id', id)
    .maybeSingle();

  if (bookError || !book) {
    return NextResponse.json({ error: 'Book not found.' }, { status: 404 });
  }

  if (!book.allow_download) {
    return NextResponse.json(
      {
        error:
          'Downloads are disabled for this book by the Professional Studies Department. You may read it online in the library reader.',
      },
      { status: 403 }
    );
  }

  const cleanFileName = sanitizeStorageFilename(
    book.file_name || `${book.title}.${book.file_type}`
  );

  const { data: signed, error: signError } = await adminClient.storage
    .from(BOOK_FILES_BUCKET)
    .createSignedUrl(book.file_storage_path, 60, {
      download: cleanFileName,
    });

  if (signError || !signed?.signedUrl) {
    console.error('Failed to generate signed download URL:', signError?.message);
    return NextResponse.json(
      { error: 'Unable to prepare file download from cloud storage.' },
      { status: 502 }
    );
  }

  // Record download metric asynchronously (non-blocking)
  await adminClient.rpc('increment_book_metric', {
    p_book_id: book.id,
    p_metric: 'download',
  });

  return NextResponse.redirect(signed.signedUrl, { status: 302 });
}

