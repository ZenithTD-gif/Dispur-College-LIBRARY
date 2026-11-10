import { z } from 'zod';
import type { AdminRole, BookFileType } from '@/types/library';

export const ALLOWED_BOOK_MIME_TYPES: Record<string, BookFileType> = {
  'application/pdf': 'pdf',
  'application/epub+zip': 'epub',
};

export const ALLOWED_BOOK_EXTENSIONS: Record<string, BookFileType> = {
  pdf: 'pdf',
  epub: 'epub',
};

export const ALLOWED_COVER_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

export const ALLOWED_COVER_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);

const UUID_SCHEMA = z.string().uuid();

export function isValidUuid(value: string): boolean {
  return UUID_SCHEMA.safeParse(value).success;
}

export function slugifyCategory(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function sanitizeStorageFilename(filename: string): string {
  // Take only the final basename segment and strip leading dots/traversal markers
  const baseName = filename.split(/[/\\]+/).pop() || 'resource';
  const normalized = baseName
    .normalize('NFKD')
    .replace(/\.\.+/g, '.')
    .replace(/[^\w.\-]+/g, '-');
  const trimmed = normalized.replace(/-+/g, '-').replace(/^[.-]+|[.-]+$/g, '');
  return (trimmed || 'resource').slice(0, 100);
}

export function getFileExtension(filename: string): string {
  const parts = filename.trim().toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() || '' : '';
}

export function sanitizeSearchTerm(raw: string): string {
  // Strip PostgREST filter syntax characters to prevent filter injection in .or()
  return raw
    .replace(/[,()\\]/g, ' ')
    .replace(/[%_]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const val = bytes / Math.pow(1024, exp);
  return `${val >= 10 || exp === 0 ? val.toFixed(0) : val.toFixed(1)} ${units[exp]}`;
}

export function isValidStoragePath(path: string, expectedPrefix: 'books/' | 'covers/'): boolean {
  if (!path || path.includes('..') || path.startsWith('/') || path.includes('\\')) {
    return false;
  }
  return path.startsWith(expectedPrefix);
}

export function validateBookUploadMeta(
  input: { fileName: string; fileType: string; fileSize: number },
  maxBookBytes: number
): { valid: true; normalizedFileType: BookFileType; mimeType: string } | { valid: false; error: string } {
  const ext = getFileExtension(input.fileName);
  const extType = ALLOWED_BOOK_EXTENSIONS[ext];
  const mimeLower = input.fileType.toLowerCase().trim();

  if (!extType) {
    return { valid: false, error: 'Only .pdf and .epub book files are supported.' };
  }

  // Some browsers send empty or octet-stream MIME for .epub files
  const resolvedMime =
    extType === 'pdf'
      ? 'application/pdf'
      : 'application/epub+zip';

  if (
    mimeLower &&
    mimeLower !== 'application/octet-stream' &&
    ALLOWED_BOOK_MIME_TYPES[mimeLower] !== extType
  ) {
    return {
      valid: false,
      error: `Invalid MIME type (${mimeLower}) for .${ext} file.`,
    };
  }

  if (!Number.isFinite(input.fileSize) || input.fileSize <= 0) {
    return { valid: false, error: 'File appears to be empty.' };
  }

  if (input.fileSize > maxBookBytes) {
    return {
      valid: false,
      error: `Book file exceeds the maximum allowed limit of ${formatFileSize(maxBookBytes)}.`,
    };
  }

  return {
    valid: true,
    normalizedFileType: extType,
    mimeType: resolvedMime,
  };
}

export function validateCoverUploadMeta(
  input: { fileName: string; fileType: string; fileSize: number },
  maxCoverBytes: number
): { valid: true; mimeType: string } | { valid: false; error: string } {
  const ext = getFileExtension(input.fileName);
  const mimeLower = input.fileType.toLowerCase().trim();

  if (!ALLOWED_COVER_EXTENSIONS.has(ext) || !ALLOWED_COVER_MIME_TYPES.has(mimeLower)) {
    return {
      valid: false,
      error: 'Cover image must be a valid JPG, PNG, or WebP image.',
    };
  }

  if (!Number.isFinite(input.fileSize) || input.fileSize <= 0) {
    return { valid: false, error: 'Cover image appears to be empty.' };
  }

  if (input.fileSize > maxCoverBytes) {
    return {
      valid: false,
      error: `Cover image exceeds the maximum allowed limit of ${formatFileSize(maxCoverBytes)}.`,
    };
  }

  const normalizedMime = mimeLower === 'image/jpg' ? 'image/jpeg' : mimeLower;
  return { valid: true, mimeType: normalizedMime };
}

export const signUploadSchema = z.object({
  kind: z.enum(['book', 'cover']),
  fileName: z.string().trim().min(1).max(255),
  fileType: z.string().trim().max(150),
  fileSize: z.number().int().positive(),
});

export const createBookSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(250),
  author: z.string().trim().min(2, 'Author name must be at least 2 characters').max(200),
  description: z.string().trim().min(5, 'Description must be at least 5 characters').max(5000),
  subject: z.string().trim().min(2, 'Subject must be at least 2 characters').max(150),
  category_id: z.string().uuid('Please select a valid category'),
  publisher: z.string().trim().max(200).optional().nullable(),
  publication_year: z
    .union([z.number().int().min(1400).max(2100), z.null()])
    .optional(),
  isbn: z.string().trim().max(40).optional().nullable(),
  language: z.string().trim().min(2).max(60).default('English'),
  page_count: z.union([z.number().int().min(1).max(20000), z.null()]).optional(),
  cover_image_path: z.string().trim().max(500).optional().nullable(),
  cover_mime_type: z.string().trim().max(100).optional().nullable(),
  cover_file_size: z.number().int().positive().optional().nullable(),
  cover_original_name: z.string().trim().max(255).optional().nullable(),
  file_storage_path: z.string().trim().min(5, 'Book file upload is required').max(500),
  file_name: z.string().trim().min(1).max(255),
  file_type: z.enum(['pdf', 'epub']),
  mime_type: z.string().trim().min(3).max(150),
  file_size: z.number().int().positive(),
  allow_download: z.boolean().default(true),
  is_featured: z.boolean().default(false),
});

export const updateBookSchema = createBookSchema.partial().extend({
  remove_cover: z.boolean().optional(),
});

export const categorySchema = z.object({
  category_name: z.string().trim().min(2, 'Category name is required').max(100),
  description: z.string().trim().max(500).default(''),
  icon_name: z.string().trim().min(2).max(50).default('BookOpen'),
});

export const createAdminSchema = z
  .object({
    name: z.string().trim().min(2, 'Full name is required').max(120),
    email: z.string().trim().email('Valid email address is required').toLowerCase(),
    role: z.enum(['admin', 'editor']),
    mode: z.enum(['password', 'invite']),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128).optional(),
  })
  .refine((data) => data.mode !== 'password' || Boolean(data.password && data.password.length >= 8), {
    message: 'A temporary password of at least 8 characters is required when creating directly.',
    path: ['password'],
  });

export const updateAdminSchema = z.object({
  role: z.enum(['admin', 'editor']).optional(),
  is_active: z.boolean().optional(),
  name: z.string().trim().min(2).max(120).optional(),
});

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Primary Admin',
  admin: 'Department Admin',
  editor: 'Library Curator',
};

export function canDeleteBooks(role: AdminRole): boolean {
  return role === 'super_admin' || role === 'admin';
}

export function canManageCategoriesDelete(role: AdminRole): boolean {
  return role === 'super_admin' || role === 'admin';
}

export function canManageAdmins(role: AdminRole): boolean {
  return role === 'super_admin';
}
