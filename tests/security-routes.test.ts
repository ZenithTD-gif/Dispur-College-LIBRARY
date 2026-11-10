import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetUser = vi.fn();
const mockAdminFrom = vi.fn();
const mockStorageRemove = vi.fn();
const mockCreateSignedUrl = vi.fn();
const mockCreateSignedUploadUrl = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/lib/env', () => ({
  isSupabaseConfigured: () => true,
  isSupabaseAdminConfigured: () => true,
  getPublicEnv: () => ({
    supabaseUrl: 'https://test.supabase.co',
    supabasePublishableKey: 'sb_publishable_test',
    siteUrl: 'http://localhost:3000',
  }),
  getServerSecrets: () => ({ supabaseSecretKey: 'sb_secret_test' }),
  getUploadLimits: () => ({
    maxBookMb: 50,
    maxBookBytes: 50 * 1024 * 1024,
    maxCoverMb: 5,
    maxCoverBytes: 5 * 1024 * 1024,
  }),
}));

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: async () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
  getSupabasePublicClient: () => null,
}));

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdminClient: () => ({
    from: mockAdminFrom,
    rpc: mockRpc,
    storage: {
      from: () => ({
        remove: mockStorageRemove,
        createSignedUrl: mockCreateSignedUrl,
        createSignedUploadUrl: mockCreateSignedUploadUrl,
      }),
    },
  }),
}));

import { GET as healthGet } from '@/app/api/health/route';
import { GET as downloadBookGet } from '@/app/api/books/[id]/download/route';
import { GET as streamBookGet } from '@/app/api/books/[id]/stream/route';
import { POST as createBookPost } from '@/app/api/admin/books/route';
import { DELETE as deleteBookDelete } from '@/app/api/admin/books/[id]/route';
import { DELETE as deleteCategoryDelete } from '@/app/api/admin/categories/[id]/route';
import { POST as createTeamAdminPost } from '@/app/api/admin/team/route';
import { POST as cleanupUploadPost } from '@/app/api/admin/uploads/cleanup/route';
import { POST as signUploadPost } from '@/app/api/admin/uploads/sign/route';

describe('API route security & authorization enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorageRemove.mockResolvedValue({ data: [], error: null });
    mockRpc.mockResolvedValue({ data: null, error: null });
  });

  it('health endpoint responds ok without leaking secrets', async () => {
    const res = await healthGet();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.supabaseConfigured).toBe(true);
    expect(JSON.stringify(body)).not.toContain('sb_secret');
  });

  it('blocks unauthenticated requests to admin book creation with 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const req = new NextRequest('http://localhost:3000/api/admin/books', {
      method: 'POST',
      body: JSON.stringify({ title: 'Unauthorized Book' }),
    });

    const res = await createBookPost(req);
    expect(res.status).toBe(401);
  });

  it('blocks inactive or non-admin users with 403', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockAdminFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    });

    const req = new NextRequest('http://localhost:3000/api/admin/books', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await createBookPost(req);
    expect(res.status).toBe(403);
  });

  it('prevents non-super-admin (editor or admin) from adding new administrators', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'admin-2' } },
      error: null,
    });

    mockAdminFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: 'admin-2',
              name: 'Dept Admin',
              email: 'dept@dispurcollege.ac.in',
              role: 'admin',
              is_active: true,
            },
            error: null,
          }),
        }),
      }),
    });

    const req = new NextRequest('http://localhost:3000/api/admin/team', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Another Admin',
        email: 'other@dispurcollege.ac.in',
        role: 'editor',
        mode: 'invite',
      }),
    });

    const res = await createTeamAdminPost(req);
    expect(res.status).toBe(403);
  });

  it('prevents editor role from deleting books (403) while allowing admin role (200) and cleaning storage', async () => {
    const bookUuid = '550e8400-e29b-41d4-a716-446655440000';

    // Case 1: editor blocked
    mockGetUser.mockResolvedValue({ data: { user: { id: 'editor-1' } }, error: null });
    mockAdminFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: 'editor-1',
              name: 'Curator',
              email: 'curator@dispurcollege.ac.in',
              role: 'editor',
              is_active: true,
            },
            error: null,
          }),
        }),
      }),
    });

    const editorReq = new NextRequest(`http://localhost:3000/api/admin/books/${bookUuid}`, {
      method: 'DELETE',
    });
    const editorRes = await deleteBookDelete(editorReq, {
      params: Promise.resolve({ id: bookUuid }),
    });
    expect(editorRes.status).toBe(403);

    // Case 2: admin allowed & removes cloud storage files
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null });
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'admin_users') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: 'admin-1',
                  name: 'Dept Admin',
                  email: 'admin@dispurcollege.ac.in',
                  role: 'admin',
                  is_active: true,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'books') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: bookUuid,
                  title: 'Test Book',
                  file_storage_path: 'books/2026/file.pdf',
                  cover_image_path: 'covers/2026/cover.jpg',
                },
                error: null,
              }),
            }),
          }),
          delete: () => ({
            eq: async () => ({ error: null }),
          }),
        };
      }
      return {
        insert: async () => ({ error: null }),
      };
    });

    const adminReq = new NextRequest(`http://localhost:3000/api/admin/books/${bookUuid}`, {
      method: 'DELETE',
    });
    const adminRes = await deleteBookDelete(adminReq, {
      params: Promise.resolve({ id: bookUuid }),
    });
    expect(adminRes.status).toBe(200);
    expect(mockStorageRemove).toHaveBeenCalledTimes(2);
    expect(mockStorageRemove).toHaveBeenCalledWith(['books/2026/file.pdf']);
    expect(mockStorageRemove).toHaveBeenCalledWith(['covers/2026/cover.jpg']);
  });

  it('denies book download with 403 when allow_download is false', async () => {
    const bookUuid = '550e8400-e29b-41d4-a716-446655440001';

    mockAdminFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: bookUuid,
              title: 'Restricted Textbook',
              file_storage_path: 'books/2026/restricted.pdf',
              file_name: 'restricted.pdf',
              file_type: 'pdf',
              allow_download: false,
            },
            error: null,
          }),
        }),
      }),
    });

    const req = new NextRequest(`http://localhost:3000/api/books/${bookUuid}/download`);
    const res = await downloadBookGet(req, {
      params: Promise.resolve({ id: bookUuid }),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('disabled');
  });

  it('redirects to signed download URL when allow_download is true', async () => {
    const bookUuid = '550e8400-e29b-41d4-a716-446655440002';

    mockAdminFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: bookUuid,
              title: 'Open Textbook',
              file_storage_path: 'books/2026/open.pdf',
              file_name: 'open.pdf',
              file_type: 'pdf',
              allow_download: true,
            },
            error: null,
          }),
        }),
      }),
    });

    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://test.supabase.co/storage/v1/object/sign/book-files/open.pdf?token=abc' },
      error: null,
    });

    const req = new NextRequest(`http://localhost:3000/api/books/${bookUuid}/download`);
    const res = await downloadBookGet(req, {
      params: Promise.resolve({ id: bookUuid }),
    });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('https://test.supabase.co');
  });

  it('validates upload signing requests and issues signed URL for valid PDF', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null });
    mockAdminFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: 'admin-1',
              name: 'Dept Admin',
              email: 'admin@dispurcollege.ac.in',
              role: 'admin',
              is_active: true,
            },
            error: null,
          }),
        }),
      }),
    });
    mockCreateSignedUploadUrl.mockResolvedValue({
      data: {
        signedUrl: 'https://test.supabase.co/storage/v1/object/upload/sign/book-files/books/2026/a.pdf?token=xyz',
        token: 'xyz',
        path: 'books/2026/a.pdf',
      },
      error: null,
    });

    const badReq = new NextRequest('http://localhost:3000/api/admin/uploads/sign', {
      method: 'POST',
      body: JSON.stringify({
        kind: 'book',
        fileName: 'script.js',
        fileType: 'application/javascript',
        fileSize: 1024,
      }),
    });
    const badRes = await signUploadPost(badReq);
    expect(badRes.status).toBe(400);

    const okReq = new NextRequest('http://localhost:3000/api/admin/uploads/sign', {
      method: 'POST',
      body: JSON.stringify({
        kind: 'book',
        fileName: 'textbook.pdf',
        fileType: 'application/pdf',
        fileSize: 102400,
      }),
    });
    const okRes = await signUploadPost(okReq);
    expect(okRes.status).toBe(200);
    const body = await okRes.json();
    expect(body.bucket).toBe('book-files');
    expect(body.fileType).toBe('pdf');
  });

  it('prevents cleanup of storage objects already attached to saved books (409)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null });
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'admin_users') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: 'admin-1', role: 'admin', is_active: true },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { id: 'asset-1' }, error: null }),
          }),
        }),
      };
    });

    const req = new NextRequest('http://localhost:3000/api/admin/uploads/cleanup', {
      method: 'POST',
      body: JSON.stringify({
        bucket: 'book-files',
        path: 'books/2026/attached.pdf',
      }),
    });
    const res = await cleanupUploadPost(req);
    expect(res.status).toBe(409);
    expect(mockStorageRemove).not.toHaveBeenCalled();
  });

  it('blocks deleting a category when books are still assigned to it (409)', async () => {
    const catUuid = '550e8400-e29b-41d4-a716-446655440010';
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null });
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'admin_users') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: 'admin-1', role: 'admin', is_active: true },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: async () => ({ count: 3, error: null }),
        }),
      };
    });

    const req = new NextRequest(`http://localhost:3000/api/admin/categories/${catUuid}`, {
      method: 'DELETE',
    });
    const res = await deleteCategoryDelete(req, {
      params: Promise.resolve({ id: catUuid }),
    });
    expect(res.status).toBe(409);
  });

  it('streams private PDF chunks inline with Range header support (206)', async () => {
    const bookUuid = '550e8400-e29b-41d4-a716-446655440011';
    mockAdminFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: bookUuid,
              file_storage_path: 'books/2026/sample.pdf',
              file_name: 'sample.pdf',
              mime_type: 'application/pdf',
              file_size: 1024,
            },
            error: null,
          }),
        }),
      }),
    });
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://test.supabase.co/storage/v1/object/sign/book-files/sample.pdf?token=xyz' },
      error: null,
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([37, 80, 68, 70]), {
        status: 206,
        headers: {
          'content-length': '4',
          'content-range': 'bytes 0-3/1024',
        },
      })
    ) as unknown as typeof fetch;

    try {
      const req = new NextRequest(`http://localhost:3000/api/books/${bookUuid}/stream`, {
        headers: { range: 'bytes=0-3' },
      });
      const res = await streamBookGet(req, {
        params: Promise.resolve({ id: bookUuid }),
      });
      expect(res.status).toBe(206);
      expect(res.headers.get('content-disposition')).toContain('inline');
      expect(res.headers.get('content-range')).toBe('bytes 0-3/1024');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

