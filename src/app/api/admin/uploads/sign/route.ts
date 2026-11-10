import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/admin';
import { getUploadLimits } from '@/lib/env';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  BOOK_COVERS_BUCKET,
  BOOK_FILES_BUCKET,
  buildStoragePath,
} from '@/lib/supabase/storage';
import {
  signUploadSchema,
  validateBookUploadMeta,
  validateCoverUploadMeta,
} from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const parsed = signUploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid upload metadata.' },
      { status: 400 }
    );
  }

  const { kind, fileName, fileType, fileSize } = parsed.data;
  const limits = getUploadLimits();

  let bucket: typeof BOOK_FILES_BUCKET | typeof BOOK_COVERS_BUCKET;
  let normalizedFileType: 'pdf' | 'epub' | null = null;
  let resolvedMime: string;

  if (kind === 'book') {
    const check = validateBookUploadMeta(
      { fileName, fileType, fileSize },
      limits.maxBookBytes
    );
    if (!check.valid) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }
    bucket = BOOK_FILES_BUCKET;
    normalizedFileType = check.normalizedFileType;
    resolvedMime = check.mimeType;
  } else {
    const check = validateCoverUploadMeta(
      { fileName, fileType, fileSize },
      limits.maxCoverBytes
    );
    if (!check.valid) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }
    bucket = BOOK_COVERS_BUCKET;
    resolvedMime = check.mimeType;
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Storage admin client unavailable.' }, { status: 503 });
  }

  const storagePath = buildStoragePath(kind, fileName);
  const { data, error } = await adminClient.storage
    .from(bucket)
    .createSignedUploadUrl(storagePath);

  if (error || !data) {
    console.error('createSignedUploadUrl error:', error?.message);
    return NextResponse.json(
      {
        error:
          error?.message ||
          'Could not generate cloud upload URL. Ensure storage buckets exist in Supabase.',
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token: data.token,
    path: data.path,
    bucket,
    fileType: normalizedFileType,
    mimeType: resolvedMime,
  });
}

