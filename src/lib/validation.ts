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
  issue_duration_days: z.number().int().min(1, 'Issue duration must be at least 1 day').max(365).default(7),
  fine_per_day: z.number().min(0, 'Fine per day cannot be negative').max(1000).default(5.00),
  total_copies: z.number().int().min(1, 'Total copies must be at least 1').max(500).default(1),
  available_copies: z.number().int().min(0).max(500).optional(),
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

/**
 * Restricts post-auth callback redirects strictly to internal `/admin` paths.
 */
export function sanitizeAdminRedirectPath(
  raw: string | null | undefined,
  fallback = '/admin'
): string {
  if (!raw) return fallback;
  if (/[\u0000-\u001f\\]/.test(raw) || raw.includes('//')) {
    return fallback;
  }
  if (raw === '/admin' || raw.startsWith('/admin/') || raw.startsWith('/admin?')) {
    return raw;
  }
  return fallback;
}

/**
 * Restricts post-auth callback redirects to allowed internal paths (/admin, /student, /library).
 */
export function sanitizeAuthRedirectPath(
  raw: string | null | undefined,
  fallback = '/admin'
): string {
  if (!raw) return fallback;
  if (/[\u0000-\u001f\\]/.test(raw) || raw.includes('//')) {
    return fallback;
  }
  if (
    raw === '/admin' ||
    raw.startsWith('/admin/') ||
    raw.startsWith('/admin?') ||
    raw === '/student' ||
    raw.startsWith('/student/') ||
    raw.startsWith('/student?') ||
    raw === '/library' ||
    raw.startsWith('/library/') ||
    raw.startsWith('/library?')
  ) {
    return raw;
  }
  return fallback;
}

export const studentRegistrationSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(120, 'Full name is too long'),
    registrationNumber: z
      .string()
      .trim()
      .min(3, 'GU Registration number must be at least 3 characters')
      .max(50, 'Registration number is too long'),
    collegeRollNumber: z
      .string()
      .trim()
      .min(1, 'College roll number is required')
      .max(50, 'College roll number is too long'),
    department: z
      .string()
      .trim()
      .min(2, 'Department is required')
      .max(100),
    semester: z
      .string()
      .trim()
      .min(1, 'Semester is required')
      .max(50),
    email: z
      .string()
      .trim()
      .email('Please enter a valid email address')
      .toLowerCase(),
    phone: z
      .string()
      .trim()
      .min(7, 'Mobile phone number must be at least 7 digits')
      .max(20, 'Mobile phone number is too long')
      .regex(/^[0-9+\s\-()]{7,20}$/, 'Please enter a valid mobile number'),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .max(128, 'Password cannot exceed 128 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export const studentLoginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const studentProfileUpdateSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(120)
    .optional(),
  department: z
    .string()
    .trim()
    .min(2, 'Department is required')
    .max(100)
    .optional(),
  semester: z
    .string()
    .trim()
    .min(1, 'Semester is required')
    .max(50)
    .optional(),
  phone: z
    .string()
    .trim()
    .min(7, 'Mobile number must be at least 7 digits')
    .max(20)
    .regex(/^[0-9+\s\-()]{7,20}$/, 'Please enter a valid mobile number')
    .optional(),
});

export const issueBookSchema = z.object({
  studentId: z.string().uuid('Please select a valid registered student'),
  bookId: z.string().uuid('Please select a valid book to issue'),
  issueDate: z.string().optional(),
  borrowingPeriodDays: z.number().int().min(1).max(90).optional(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const returnBookSchema = z.object({
  rentalId: z.string().uuid('Invalid rental ID'),
  returnDate: z.string().optional(),
  fineAmount: z.number().min(0).optional(),
  finePaid: z.boolean().default(false),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const updateFineStatusSchema = z.object({
  rentalId: z.string().uuid('Invalid rental ID'),
  finePaid: z.boolean(),
  fineAmount: z.number().min(0).optional(),
});

export const librarySettingsUpdateSchema = z.object({
  dailyFineRate: z.number().min(0, 'Fine rate cannot be negative').max(1000),
  borrowingPeriodDays: z.number().int().min(1, 'Borrowing period must be at least 1 day').max(90),
  maxBooksPerStudent: z.number().int().min(1, 'Maximum books must be at least 1').max(20),
});

export function calculateRentalDetails(
  rental: {
    issue_date: string;
    due_date: string;
    return_date: string | null;
    status: string;
    daily_fine_rate_snapshot: number;
    fine_amount: number;
    fine_paid: boolean;
  },
  currentDailyRate?: number
) {
  const now = new Date();
  const dueDate = new Date(rental.due_date);
  const isReturned = rental.status === 'returned' && Boolean(rental.return_date);
  const effectiveEndDate = isReturned ? new Date(rental.return_date!) : now;

  const rate =
    currentDailyRate !== undefined
      ? currentDailyRate
      : Number(rental.daily_fine_rate_snapshot || 5);

  let overdueDays = 0;
  let remainingDays = 0;
  let calculatedFine = 0;
  let isOverdue = false;

  // Calendar day calculation based on dates for exact day counts
  const endDay = new Date(
    effectiveEndDate.getFullYear(),
    effectiveEndDate.getMonth(),
    effectiveEndDate.getDate()
  );
  const dueDay = new Date(
    dueDate.getFullYear(),
    dueDate.getMonth(),
    dueDate.getDate()
  );

  const diffMs = endDay.getTime() - dueDay.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    overdueDays = diffDays;
    isOverdue = true;
    remainingDays = 0;
    if (isReturned && Number(rental.fine_amount) > 0) {
      calculatedFine = Number(rental.fine_amount);
    } else {
      calculatedFine = overdueDays * rate;
    }
  } else {
    remainingDays = Math.max(0, -diffDays);
    overdueDays = 0;
    isOverdue = false;
    calculatedFine = isReturned ? Number(rental.fine_amount || 0) : 0;
  }

  return {
    remaining_days: remainingDays,
    overdue_days: overdueDays,
    calculated_fine: calculatedFine,
    is_overdue: isOverdue,
  };
}
