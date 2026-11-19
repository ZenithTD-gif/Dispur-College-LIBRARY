import { describe, expect, it, vi } from 'vitest';
import {
  getAndSyncBookAvailability,
  syncBookInventory,
} from '@/lib/services/inventory-service';

describe('Inventory Availability & Book Return Synchronization', () => {
  describe('Authoritative Availability Calculation', () => {
    it('calculates available_copies = total_copies when no active loans exist', async () => {
      const mockBook = {
        id: 'book-1',
        title: 'Algorithms & Data Structures',
        total_copies: 3,
        available_copies: 0, // initially stale or un-synced
      };

      const mockSupabaseAdmin = {
        from: vi.fn((table: string) => {
          if (table === 'books') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: mockBook, error: null }),
              update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            };
          }
          if (table === 'book_issues' || table === 'book_rentals') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnThis(),
              is: vi.fn().mockResolvedValue({ data: [], error: null }), // 0 active loans
            };
          }
          return {};
        }),
      } as unknown as Parameters<typeof getAndSyncBookAvailability>[0];

      const res = await getAndSyncBookAvailability(mockSupabaseAdmin, 'book-1');

      expect(res.totalCopies).toBe(3);
      expect(res.activeIssuedCopies).toBe(0);
      expect(res.availableCopies).toBe(3);
      expect(res.isAvailable).toBe(true);
    });

    it('excludes returned issues (status = returned) from active issued count', async () => {
      const mockBook = {
        id: 'book-single',
        title: 'Single Copy Book',
        total_copies: 1,
        available_copies: 0,
      };

      const mockSupabaseAdmin = {
        from: vi.fn((table: string) => {
          if (table === 'books') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: mockBook, error: null }),
              update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            };
          }
          if (table === 'book_issues' || table === 'book_rentals') {
            // Returned issue: not matched by .is('return_date', null)
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnThis(),
              is: vi.fn().mockResolvedValue({ data: [], error: null }),
            };
          }
          return {};
        }),
      } as unknown as Parameters<typeof getAndSyncBookAvailability>[0];

      const res = await getAndSyncBookAvailability(mockSupabaseAdmin, 'book-single');

      expect(res.totalCopies).toBe(1);
      expect(res.activeIssuedCopies).toBe(0);
      expect(res.availableCopies).toBe(1);
      expect(res.isAvailable).toBe(true);
    });

    it('correctly handles multi-copy inventory transitions: 3 copies -> 2 issued -> 1 returned -> 2 available', async () => {
      const mockBook = {
        id: 'book-multi',
        title: 'Advanced Database Systems',
        total_copies: 3,
        available_copies: 1,
      };

      // Only 1 unreturned issue remaining (Student B) after Student A returned
      const activeIssuesAfterOneReturn = [{ id: 'loan-student-b' }];

      const mockSupabaseAdmin = {
        from: vi.fn((table: string) => {
          if (table === 'books') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: mockBook, error: null }),
              update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            };
          }
          if (table === 'book_issues' || table === 'book_rentals') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnThis(),
              is: vi.fn().mockResolvedValue({ data: activeIssuesAfterOneReturn, error: null }),
            };
          }
          return {};
        }),
      } as unknown as Parameters<typeof getAndSyncBookAvailability>[0];

      const res = await getAndSyncBookAvailability(mockSupabaseAdmin, 'book-multi');

      expect(res.totalCopies).toBe(3);
      expect(res.activeIssuedCopies).toBe(1);
      expect(res.availableCopies).toBe(2);
      expect(res.isAvailable).toBe(true);
    });

    it('reports isAvailable = false when all physical copies are issued', async () => {
      const mockBook = {
        id: 'book-single-issued',
        title: 'Single Copy Book In Use',
        total_copies: 1,
        available_copies: 1,
      };

      const activeIssues = [{ id: 'loan-active-1' }];

      const mockSupabaseAdmin = {
        from: vi.fn((table: string) => {
          if (table === 'books') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: mockBook, error: null }),
              update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            };
          }
          if (table === 'book_issues' || table === 'book_rentals') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnThis(),
              is: vi.fn().mockResolvedValue({ data: activeIssues, error: null }),
            };
          }
          return {};
        }),
      } as unknown as Parameters<typeof getAndSyncBookAvailability>[0];

      const res = await getAndSyncBookAvailability(mockSupabaseAdmin, 'book-single-issued');

      expect(res.totalCopies).toBe(1);
      expect(res.activeIssuedCopies).toBe(1);
      expect(res.availableCopies).toBe(0);
      expect(res.isAvailable).toBe(false);
    });

    it('syncBookInventory falls back to JavaScript calculation if RPC is unavailable', async () => {
      const mockBook = {
        id: 'book-fallback',
        title: 'Fallback Test Book',
        total_copies: 2,
        available_copies: 0,
      };

      const mockSupabaseAdmin = {
        rpc: vi.fn().mockRejectedValue(new Error('RPC function not found')),
        from: vi.fn((table: string) => {
          if (table === 'books') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: mockBook, error: null }),
              update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            };
          }
          if (table === 'book_issues' || table === 'book_rentals') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnThis(),
              is: vi.fn().mockResolvedValue({ data: [], error: null }),
            };
          }
          return {};
        }),
      } as unknown as Parameters<typeof syncBookInventory>[0];

      const available = await syncBookInventory(mockSupabaseAdmin, 'book-fallback');
      expect(available).toBe(2);
    });
  });
});
