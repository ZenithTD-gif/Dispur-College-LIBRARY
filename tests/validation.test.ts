import { describe, expect, it } from 'vitest';
import {
  canDeleteBooks,
  canManageAdmins,
  canManageCategoriesDelete,
  createAdminSchema,
  createBookSchema,
  formatFileSize,
  isValidStoragePath,
  sanitizeAdminRedirectPath,
  sanitizeSearchTerm,
  sanitizeStorageFilename,
  slugifyCategory,
  validateBookUploadMeta,
  validateCoverUploadMeta,
} from '@/lib/validation';

describe('validation & sanitization helpers', () => {
  it('slugifies category names cleanly', () => {
    expect(slugifyCategory('Accounting & Finance')).toBe('accounting-finance');
    expect(slugifyCategory('  Computer Applications / IT  ')).toBe(
      'computer-applications-it'
    );
  });

  it('sanitizes filenames against unsafe path characters', () => {
    expect(sanitizeStorageFilename('../../etc/passwd.pdf')).toBe('passwd.pdf');
    expect(sanitizeStorageFilename('Financial Management (2025).pdf')).toBe(
      'Financial-Management-2025-.pdf'
    );
  });

  it('rejects path traversal in storage paths', () => {
    expect(isValidStoragePath('books/2026/abc.pdf', 'books/')).toBe(true);
    expect(isValidStoragePath('books/../secret.pdf', 'books/')).toBe(false);
    expect(isValidStoragePath('/books/2026/abc.pdf', 'books/')).toBe(false);
    expect(isValidStoragePath('covers/2026/img.png', 'books/')).toBe(false);
  });

  it('sanitizes PostgREST filter characters in search queries', () => {
    expect(sanitizeSearchTerm('finance,title.eq.hack(1)')).toBe('finance title.eq.hack 1');
    expect(sanitizeSearchTerm('100%_profit')).toBe('100profit');
  });

  it('formats file sizes accurately', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(1024 * 1024 * 4.5)).toBe('4.5 MB');
  });
});

describe('upload file metadata validation', () => {
  const maxBookBytes = 50 * 1024 * 1024;
  const maxCoverBytes = 5 * 1024 * 1024;

  it('accepts valid PDF and EPUB book files within size limit', () => {
    const pdfRes = validateBookUploadMeta(
      { fileName: 'textbook.pdf', fileType: 'application/pdf', fileSize: 204800 },
      maxBookBytes
    );
    expect(pdfRes.valid).toBe(true);
    if (pdfRes.valid) {
      expect(pdfRes.normalizedFileType).toBe('pdf');
    }

    const epubRes = validateBookUploadMeta(
      {
        fileName: 'notes.epub',
        fileType: 'application/octet-stream',
        fileSize: 102400,
      },
      maxBookBytes
    );
    expect(epubRes.valid).toBe(true);
    if (epubRes.valid) {
      expect(epubRes.normalizedFileType).toBe('epub');
    }
  });

  it('rejects unsupported book extensions and oversized files', () => {
    const exeRes = validateBookUploadMeta(
      { fileName: 'malware.exe', fileType: 'application/x-msdownload', fileSize: 5000 },
      maxBookBytes
    );
    expect(exeRes.valid).toBe(false);

    const bigRes = validateBookUploadMeta(
      { fileName: 'huge.pdf', fileType: 'application/pdf', fileSize: maxBookBytes + 1 },
      maxBookBytes
    );
    expect(bigRes.valid).toBe(false);
  });

  it('accepts JPG/PNG/WebP covers and rejects SVG/oversized covers', () => {
    expect(
      validateCoverUploadMeta(
        { fileName: 'cover.webp', fileType: 'image/webp', fileSize: 120000 },
        maxCoverBytes
      ).valid
    ).toBe(true);

    expect(
      validateCoverUploadMeta(
        { fileName: 'xss.svg', fileType: 'image/svg+xml', fileSize: 5000 },
        maxCoverBytes
      ).valid
    ).toBe(false);

    expect(
      validateCoverUploadMeta(
        { fileName: 'big.png', fileType: 'image/png', fileSize: maxCoverBytes + 10 },
        maxCoverBytes
      ).valid
    ).toBe(false);
  });
});

describe('Zod request schemas & RBAC permissions', () => {
  it('validates createBookSchema properly', () => {
    const valid = createBookSchema.safeParse({
      title: 'Business Communication',
      author: 'Dr. P. Das',
      description: 'Comprehensive study guide for B.Com & BBA students.',
      subject: 'Communication',
      category_id: '550e8400-e29b-41d4-a716-446655440000',
      file_storage_path: 'books/2026/doc.pdf',
      file_name: 'doc.pdf',
      file_type: 'pdf',
      mime_type: 'application/pdf',
      file_size: 102400,
      allow_download: true,
      is_featured: false,
    });
    expect(valid.success).toBe(true);
  });

  it('requires password in createAdminSchema when mode is password', () => {
    const missingPass = createAdminSchema.safeParse({
      name: 'Faculty Admin',
      email: 'faculty@dispurcollege.ac.in',
      role: 'admin',
      mode: 'password',
    });
    expect(missingPass.success).toBe(false);

    const inviteMode = createAdminSchema.safeParse({
      name: 'Faculty Admin',
      email: 'faculty@dispurcollege.ac.in',
      role: 'editor',
      mode: 'invite',
    });
    expect(inviteMode.success).toBe(true);
  });

  it('enforces role permission boundaries', () => {
    expect(canManageAdmins('super_admin')).toBe(true);
    expect(canManageAdmins('admin')).toBe(false);
    expect(canManageAdmins('editor')).toBe(false);

    expect(canDeleteBooks('super_admin')).toBe(true);
    expect(canDeleteBooks('admin')).toBe(true);
    expect(canDeleteBooks('editor')).toBe(false);

    expect(canManageCategoriesDelete('editor')).toBe(false);
  });

  it('sanitizes admin redirect targets against open redirects', () => {
    expect(sanitizeAdminRedirectPath('/admin')).toBe('/admin');
    expect(sanitizeAdminRedirectPath('/admin/books')).toBe('/admin/books');
    expect(sanitizeAdminRedirectPath('/admin/update-password?flow=recovery')).toBe(
      '/admin/update-password?flow=recovery'
    );
    expect(sanitizeAdminRedirectPath('//evil.com')).toBe('/admin');
    expect(sanitizeAdminRedirectPath('/admin@evil.com')).toBe('/admin');
    expect(sanitizeAdminRedirectPath('https://evil.com/admin')).toBe('/admin');
    expect(sanitizeAdminRedirectPath('/admin\\evil')).toBe('/admin');
    expect(sanitizeAdminRedirectPath('/admin\nSet-Cookie: a=b')).toBe('/admin');
    expect(sanitizeAdminRedirectPath('/library')).toBe('/admin');
  });
});
