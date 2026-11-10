import { NextRequest, NextResponse } from 'next/server';
import { recordAuditLog, requireAdminApi } from '@/lib/auth/admin';
import { getUploadLimits } from '@/lib/env';
import { getAdminBookById } from '@/lib/queries/admin';
import { mapBookWithCategory, type RawBookRow } from '@/lib/queries/mappers';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  BOOK_COVERS_BUCKET,
  BOOK_FILES_BUCKET,
  safeRemoveStorageFile,
} from '@/lib/supabase/storage';
import { isValidStoragePath, isValidUuid, updateBookSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid book ID.' }, { status: 400 });
  }

  const book = await getAdminBookById(id);
  if (!book) {
    return NextResponse.json({ error: 'Book not found.' }, { status: 404 });
  }

  return NextResponse.json({ book });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid book ID.' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const parsed = updateBookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Validation failed.' },
      { status: 400 }
    );
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Database admin client unavailable.' }, { status: 503 });
  }

  const { data: existingBook, error: fetchErr } = await adminClient
    .from('books')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr || !existingBook) {
    return NextResponse.json({ error: 'Book not found.' }, { status: 404 });
  }

  const data = parsed.data;
  const limits = getUploadLimits();

  if (data.file_storage_path) {
    if (!isValidStoragePath(data.file_storage_path, 'books/')) {
      return NextResponse.json({ error: 'Invalid book storage path.' }, { status: 400 });
    }
    if (data.file_size && data.file_size > limits.maxBookBytes) {
      return NextResponse.json(
        { error: `Book file exceeds maximum limit of ${limits.maxBookMb} MB.` },
        { status: 400 }
      );
    }
  }

  if (data.cover_image_path) {
    if (!isValidStoragePath(data.cover_image_path, 'covers/')) {
      return NextResponse.json({ error: 'Invalid cover storage path.' }, { status: 400 });
    }
    if (data.cover_file_size && data.cover_file_size > limits.maxCoverBytes) {
      return NextResponse.json(
        { error: `Cover image exceeds maximum limit of ${limits.maxCoverMb} MB.` },
        { status: 400 }
      );
    }
  }

  const updateFields: Record<string, unknown> = {};
  if (data.title !== undefined) updateFields.title = data.title;
  if (data.author !== undefined) updateFields.author = data.author;
  if (data.description !== undefined) updateFields.description = data.description;
  if (data.subject !== undefined) updateFields.subject = data.subject;
  if (data.category_id !== undefined) updateFields.category_id = data.category_id;
  if (data.publisher !== undefined) updateFields.publisher = data.publisher || null;
  if (data.publication_year !== undefined)
    updateFields.publication_year = data.publication_year ?? null;
  if (data.isbn !== undefined) updateFields.isbn = data.isbn || null;
  if (data.language !== undefined) updateFields.language = data.language || 'English';
  if (data.page_count !== undefined) updateFields.page_count = data.page_count ?? null;
  if (data.allow_download !== undefined) updateFields.allow_download = data.allow_download;
  if (data.is_featured !== undefined) updateFields.is_featured = data.is_featured;

  const isReplacingBookFile =
    Boolean(data.file_storage_path) && data.file_storage_path !== existingBook.file_storage_path;

  if (isReplacingBookFile) {
    updateFields.file_storage_path = data.file_storage_path;
    updateFields.file_name = data.file_name || existingBook.file_name;
    updateFields.file_type = data.file_type || existingBook.file_type;
    updateFields.mime_type = data.mime_type || existingBook.mime_type;
    updateFields.file_size = data.file_size || existingBook.file_size;
  }

  const isRemovingCover = data.remove_cover === true;
  const isReplacingCover =
    Boolean(data.cover_image_path) && data.cover_image_path !== existingBook.cover_image_path;

  if (isRemovingCover) {
    updateFields.cover_image_path = null;
  } else if (isReplacingCover) {
    updateFields.cover_image_path = data.cover_image_path;
  }

  if (Object.keys(updateFields).length === 0) {
    return NextResponse.json({ error: 'No fields provided to update.' }, { status: 400 });
  }

  const { data: updatedBook, error: updateErr } = await adminClient
    .from('books')
    .update(updateFields)
    .eq('id', id)
    .select('*, categories(id, category_name, slug, icon_name)')
    .single();

  if (updateErr || !updatedBook) {
    return NextResponse.json(
      { error: updateErr?.message || 'Failed to update book.' },
      { status: 400 }
    );
  }

  const assetOps: Array<Promise<unknown>> = [];

  if (isReplacingBookFile && data.file_storage_path) {
    assetOps.push(
      Promise.resolve(
        adminClient
          .from('storage_assets')
          .delete()
          .eq('storage_path', existingBook.file_storage_path)
      ),
      Promise.resolve(
        adminClient.from('storage_assets').insert({
          book_id: id,
          asset_kind: 'book_file',
          bucket_name: BOOK_FILES_BUCKET,
          storage_path: data.file_storage_path,
          original_filename: data.file_name || existingBook.file_name,
          mime_type: data.mime_type || existingBook.mime_type,
          size_bytes: data.file_size || existingBook.file_size,
          uploaded_by: auth.admin.id,
        })
      ),
      safeRemoveStorageFile(adminClient, BOOK_FILES_BUCKET, existingBook.file_storage_path)
    );
  }

  if ((isReplacingCover || isRemovingCover) && existingBook.cover_image_path) {
    assetOps.push(
      Promise.resolve(
        adminClient
          .from('storage_assets')
          .delete()
          .eq('storage_path', existingBook.cover_image_path)
      ),
      safeRemoveStorageFile(adminClient, BOOK_COVERS_BUCKET, existingBook.cover_image_path)
    );
  }

  if (isReplacingCover && data.cover_image_path) {
    assetOps.push(
      Promise.resolve(
        adminClient.from('storage_assets').insert({
          book_id: id,
          asset_kind: 'cover_image',
          bucket_name: BOOK_COVERS_BUCKET,
          storage_path: data.cover_image_path,
          original_filename: data.cover_original_name || 'cover-image',
          mime_type: data.cover_mime_type || 'image/jpeg',
          size_bytes: data.cover_file_size || 1,
          uploaded_by: auth.admin.id,
        })
      )
    );
  }

  if (assetOps.length > 0) {
    await Promise.all(assetOps);
  }

  await recordAuditLog({
    actorId: auth.admin.id,
    actorEmail: auth.admin.email,
    action: 'book.updated',
    targetType: 'book',
    targetId: id,
    details: {
      title: updatedBook.title,
      replaced_file: isReplacingBookFile,
      replaced_cover: isReplacingCover,
    },
  });

  return NextResponse.json({
    book: mapBookWithCategory(updatedBook as RawBookRow),
  });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi(['super_admin', 'admin']);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid book ID.' }, { status: 400 });
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Database admin client unavailable.' }, { status: 503 });
  }

  const { data: existingBook, error: fetchErr } = await adminClient
    .from('books')
    .select('id, title, file_storage_path, cover_image_path')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr || !existingBook) {
    return NextResponse.json({ error: 'Book not found.' }, { status: 404 });
  }

  const { error: deleteErr } = await adminClient.from('books').delete().eq('id', id);
  if (deleteErr) {
    return NextResponse.json(
      { error: deleteErr.message || 'Failed to delete book.' },
      { status: 400 }
    );
  }

  await Promise.all([
    safeRemoveStorageFile(adminClient, BOOK_FILES_BUCKET, existingBook.file_storage_path),
    safeRemoveStorageFile(adminClient, BOOK_COVERS_BUCKET, existingBook.cover_image_path),
  ]);

  await recordAuditLog({
    actorId: auth.admin.id,
    actorEmail: auth.admin.email,
    action: 'book.deleted',
    targetType: 'book',
    targetId: id,
    details: { title: existingBook.title },
  });

  return NextResponse.json({ ok: true });
}

