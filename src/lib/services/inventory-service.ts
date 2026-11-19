/**
 * Dispur College - Department of Professional Studies Digital Library
 * Centralized Book Inventory & Availability Synchronization Service
 *
 * Enforces the core rule:
 * Available Copies = Total Copies - Currently Active Unreturned Issued Copies
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface BookAvailabilityResult {
  bookId: string;
  title: string;
  totalCopies: number;
  activeIssuedCopies: number;
  availableCopies: number;
  isAvailable: boolean;
}

/**
 * Calculates authoritative book availability from the database
 * and ensures `books.available_copies` is in sync.
 */
export async function getAndSyncBookAvailability(
  supabaseAdmin: SupabaseClient,
  bookId: string
): Promise<BookAvailabilityResult> {
  // 1. Fetch book record
  const { data: book, error: bookErr } = await supabaseAdmin
    .from('books')
    .select('id, title, total_copies, available_copies')
    .eq('id', bookId)
    .maybeSingle();

  if (bookErr || !book) {
    throw new Error(`Book ${bookId} not found.`);
  }

  const totalCopies = Math.max(1, Number(book.total_copies) || 1);

  // 2. Fetch active unreturned issues from both tracking tables
  const [{ data: activeIssues }, { data: activeRentals }] = await Promise.all([
    supabaseAdmin
      .from('book_issues')
      .select('id')
      .eq('book_id', bookId)
      .in('status', ['issued', 'overdue'])
      .is('return_date', null),
    supabaseAdmin
      .from('book_rentals')
      .select('id')
      .eq('book_id', bookId)
      .in('status', ['issued', 'overdue'])
      .is('return_date', null),
  ]);

  // Combine unique active loan IDs across both tables
  const activeIds = new Set<string>();
  for (const row of activeIssues || []) {
    activeIds.add(row.id);
  }
  for (const row of activeRentals || []) {
    activeIds.add(row.id);
  }

  const activeIssuedCopies = activeIds.size;
  const calculatedAvailable = Math.max(0, totalCopies - activeIssuedCopies);

  // 3. If stored available_copies differs from authoritative count, update it
  if (book.available_copies !== calculatedAvailable) {
    await supabaseAdmin
      .from('books')
      .update({
        available_copies: calculatedAvailable,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookId);
  }

  return {
    bookId: book.id,
    title: book.title,
    totalCopies,
    activeIssuedCopies,
    availableCopies: calculatedAvailable,
    isAvailable: calculatedAvailable > 0,
  };
}

/**
 * Synchronizes inventory for a book after an issue or return operation.
 */
export async function syncBookInventory(
  supabaseAdmin: SupabaseClient,
  bookId: string
): Promise<number> {
  try {
    // Try native PostgreSQL RPC function if migration 202611190003 is applied
    const { data: rpcAvailable, error: rpcErr } = await supabaseAdmin.rpc(
      'sync_book_inventory',
      { p_book_id: bookId }
    );

    if (!rpcErr && typeof rpcAvailable === 'number') {
      return rpcAvailable;
    }
  } catch {
    // Fallback to JS calculation below
  }

  const result = await getAndSyncBookAvailability(supabaseAdmin, bookId);
  return result.availableCopies;
}
