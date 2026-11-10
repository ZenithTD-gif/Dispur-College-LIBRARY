import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseAdminConfigured } from '@/lib/env';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { BOOK_FILES_BUCKET } from '@/lib/supabase/storage';
import { isValidUuid, sanitizeStorageFilename } from '@/lib/validation';

export const dynamic = 'force-dynamic';

async function handleStream(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
  isHead: boolean
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
    .select('id, file_storage_path, file_name, mime_type, file_size')
    .eq('id', id)
    .maybeSingle();

  if (bookError || !book) {
    return NextResponse.json({ error: 'Book not found.' }, { status: 404 });
  }

  const { data: signed, error: signError } = await adminClient.storage
    .from(BOOK_FILES_BUCKET)
    .createSignedUrl(book.file_storage_path, 120);

  if (signError || !signed?.signedUrl) {
    console.error('Failed to create signed stream URL:', signError?.message);
    return NextResponse.json(
      { error: 'Unable to access book file in cloud storage.' },
      { status: 502 }
    );
  }

  const rangeHeader = request.headers.get('range');
  const upstreamHeaders: HeadersInit = {
    'Accept-Encoding': 'identity',
  };
  if (rangeHeader) {
    upstreamHeaders.Range = rangeHeader;
  }

  const upstreamRes = await fetch(signed.signedUrl, {
    method: isHead ? 'HEAD' : 'GET',
    headers: upstreamHeaders,
    cache: 'no-store',
  });

  if (!upstreamRes.ok && upstreamRes.status !== 206) {
    return NextResponse.json(
      { error: 'Failed to stream resource from cloud storage.' },
      { status: 502 }
    );
  }

  const responseHeaders = new Headers();
  const safeName = sanitizeStorageFilename(book.file_name || 'book.pdf');

  responseHeaders.set('Content-Type', book.mime_type || 'application/pdf');
  responseHeaders.set('Content-Disposition', `inline; filename="${safeName}"`);
  responseHeaders.set('Accept-Ranges', 'bytes');
  responseHeaders.set('Cache-Control', 'private, no-store, max-age=0');
  responseHeaders.set('X-Content-Type-Options', 'nosniff');

  const contentLength = upstreamRes.headers.get('content-length');
  if (contentLength) {
    responseHeaders.set('Content-Length', contentLength);
  } else if (!rangeHeader && book.file_size) {
    responseHeaders.set('Content-Length', String(book.file_size));
  }

  const contentRange = upstreamRes.headers.get('content-range');
  if (contentRange) {
    responseHeaders.set('Content-Range', contentRange);
  }

  return new NextResponse(isHead ? null : upstreamRes.body, {
    status: upstreamRes.status,
    headers: responseHeaders,
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleStream(request, context, false);
}

export async function HEAD(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleStream(request, context, true);
}

