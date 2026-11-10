import { NextRequest, NextResponse } from 'next/server';
import { recordAuditLog, requireAdminApi } from '@/lib/auth/admin';
import { getUploadLimits } from '@/lib/env';
import { getAdminBooks } from '@/lib/queries/admin';
import { mapBookWithCategory, type RawBookRow } from '@/lib/queries/mappers';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  BOOK_COVERS_BUCKET,
  BOOK_FILES_BUCKET,
  safeRemoveStorageFile,
} from '@/lib/supabase/storage';
import { createBookSchema, isValidStoragePath } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const books = await getAdminBooks({
    q: searchParams.get('q') || undefined,
    categoryId: searchParams.get('categoryId') || undefined,
    format: searchParams.get('format') || undefined,
  });

  return NextResponse.json({ books });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const parsed = createBookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Validation failed.' },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const limits = getUploadLimits();

  if (!isValidStoragePath(data.file_storage_path, 'books/')) {
    return NextResponse.json({ error: 'Invalid book storage path.' }, { status: 400 });
  }

  if (data.file_size > limits.maxBookBytes) {
    return NextResponse.json(
      { error: `Book file exceeds maximum limit of ${limits.maxBookMb} MB.` },
      { status: 400 }
    );
  }

  if (data.cover_image_path && !isValidStoragePath(data.cover_image_path, 'covers/')) {
    return NextResponse.json({ error: 'Invalid cover image storage path.' }, { status: 400 });
  }

  if (
    data.cover_image_path &&
    data.cover_file_size &&
    data.cover_file_size > limits.maxCoverBytes
  ) {
    return NextResponse.json(
      { error: `Cover image exceeds maximum limit of ${limits.maxCoverMb} MB.` },
      { status: 400 }
    );
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Database admin client unavailable.' }, { status: 503 });
  }

  const insertPayload = {
    title: data.title,
    author: data.author,
    description: data.description,
    subject: data.subject,
    category_id: data.category_id,
    publisher: data.publisher || null,
    publication_year: data.publication_year ?? null,
    isbn: data.isbn || null,
    language: data.language || 'English',
    page_count: data.page_count ?? null,
    cover_image_path: data.cover_image_path || null,
    file_storage_path: data.file_storage_path,
    file_name: data.file_name,
    file_type: data.file_type,
    mime_type: data.mime_type,
    file_size: data.file_size,
    allow_download: data.allow_download,
    is_featured: data.is_featured,
    uploaded_by: auth.admin.id,
  };

  const { data: createdBook, error: insertError } = await adminClient
    .from('books')
    .insert(insertPayload)
    .select('*, categories(id, category_name, slug, icon_name)')
    .single();

  if (insertError || !createdBook) {
    // Roll back cloud files if DB insert fails so storage stays synchronized
    await safeRemoveStorageFile(adminClient, BOOK_FILES_BUCKET, data.file_storage_path);
    if (data.cover_image_path) {
      await safeRemoveStorageFile(adminClient, BOOK_COVERS_BUCKET, data.cover_image_path);
    }

    return NextResponse.json(
      { error: insertError?.message || 'Failed to save book record.' },
      { status: 400 }
    );
  }

  const assetsToInsert: Array<{
    book_id: string;
    asset_kind: 'book_file' | 'cover_image';
    bucket_name: string;
    storage_path: string;
    original_filename: string;
    mime_type: string;
    size_bytes: number;
    uploaded_by: string;
  }> = [
    {
      book_id: createdBook.id,
      asset_kind: 'book_file',
      bucket_name: BOOK_FILES_BUCKET,
      storage_path: data.file_storage_path,
      original_filename: data.file_name,
      mime_type: data.mime_type,
      size_bytes: data.file_size,
      uploaded_by: auth.admin.id,
    },
  ];

  if (data.cover_image_path) {
    assetsToInsert.push({
      book_id: createdBook.id,
      asset_kind: 'cover_image',
      bucket_name: BOOK_COVERS_BUCKET,
      storage_path: data.cover_image_path,
      original_filename: data.cover_original_name || 'cover-image',
      mime_type: data.cover_mime_type || 'image/jpeg',
      size_bytes: data.cover_file_size || 1,
      uploaded_by: auth.admin.id,
    });
  }

  await adminClient.from('storage_assets').insert(assetsToInsert);

  await recordAuditLog({
    actorId: auth.admin.id,
    actorEmail: auth.admin.email,
    action: 'book.created',
    targetType: 'book',
    targetId: createdBook.id,
    details: { title: createdBook.title, file_type: createdBook.file_type },
  });

  return NextResponse.json(
    {
      book: mapBookWithCategory(createdBook as RawBookRow),
    },
    { status: 201 }
  );
}
