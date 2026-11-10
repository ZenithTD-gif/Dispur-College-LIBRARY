import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getPublicEnv, isSupabaseConfigured } from '@/lib/env';
import { sanitizeStorageFilename } from '@/lib/validation';

export const BOOK_FILES_BUCKET = 'book-files';
export const BOOK_COVERS_BUCKET = 'book-covers';

export function buildStoragePath(kind: 'book' | 'cover', originalFileName: string): string {
  const year = new Date().getUTCFullYear();
  const safeName = sanitizeStorageFilename(originalFileName);
  const id = randomUUID();
  const prefix = kind === 'book' ? 'books' : 'covers';
  return `${prefix}/${year}/${id}-${safeName}`;
}

export function getPublicCoverUrl(coverImagePath: string | null | undefined): string | null {
  if (!coverImagePath || !isSupabaseConfigured()) {
    return null;
  }
  const { supabaseUrl } = getPublicEnv();
  const cleanPath = coverImagePath.replace(/^\/+/, '');
  return `${supabaseUrl}/storage/v1/object/public/${BOOK_COVERS_BUCKET}/${cleanPath}`;
}

export async function safeRemoveStorageFile(
  adminClient: SupabaseClient,
  bucket: typeof BOOK_FILES_BUCKET | typeof BOOK_COVERS_BUCKET,
  storagePath: string | null | undefined
): Promise<void> {
  if (!storagePath) return;
  try {
    await adminClient.storage.from(bucket).remove([storagePath]);
  } catch (error) {
    console.error(`Failed to remove storage file ${bucket}/${storagePath}:`, error);
  }
}

