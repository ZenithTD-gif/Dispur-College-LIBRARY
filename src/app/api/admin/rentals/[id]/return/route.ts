import { NextRequest, NextResponse } from 'next/server';
import { recordAuditLog, requireAdminApi } from '@/lib/auth/admin';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { calculateRentalDetails, returnBookSchema } from '@/lib/validation';
import { syncBookInventory } from '@/lib/services/inventory-service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return auth.response;
  }

  const { id: rentalId } = await context.params;
  const { admin } = auth;
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Database client unavailable.' }, { status: 503 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // Empty body is okay, defaults will be used
  }

  const parsed = returnBookSchema.safeParse({
    rentalId,
    ...(typeof body === 'object' && body !== null ? body : {}),
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue?.message || 'Invalid return parameters.' },
      { status: 400 }
    );
  }

  // Fetch the rental record (check book_rentals first, fallback to book_issues)
  let rental: {
    id: string;
    book_id: string;
    student_id: string;
    issue_date: string;
    due_date: string;
    return_date: string | null;
    status: string;
    daily_fine_rate_snapshot?: number;
    fine_per_day?: number;
    fine_amount?: number;
    fine_paid?: boolean;
    notes?: string | null;
    book?: { id?: string; title?: string } | null;
    student?: { id?: string; full_name?: string; registration_number?: string } | null;
  } | null = null;

  const { data: rentData } = await adminClient
    .from('book_rentals')
    .select(`
      *,
      book:books(id, title),
      student:students(id, full_name, registration_number)
    `)
    .eq('id', rentalId)
    .maybeSingle();

  if (rentData) {
    rental = rentData;
  } else {
    const { data: issueData } = await adminClient
      .from('book_issues')
      .select(`
        *,
        book:books(id, title),
        student:students(id, full_name, registration_number)
      `)
      .eq('id', rentalId)
      .maybeSingle();
    if (issueData) {
      rental = issueData;
    }
  }

  if (!rental) {
    return NextResponse.json({ error: 'Rental/issue record not found.' }, { status: 404 });
  }

  // Prevent duplicate return
  if (rental.status === 'returned' || rental.return_date !== null) {
    return NextResponse.json(
      { error: 'This book has already been marked as returned.' },
      { status: 400 }
    );
  }

  // Calculate return details and fines
  const returnDateTime = parsed.data.returnDate
    ? new Date(parsed.data.returnDate)
    : new Date();

  const fineRate = Number(rental.daily_fine_rate_snapshot || rental.fine_per_day || 5);
  const details = calculateRentalDetails(
    {
      ...rental,
      fine_paid: Boolean(rental.fine_paid),
      fine_amount: Number(rental.fine_amount || 0),
      daily_fine_rate_snapshot: fineRate,
      return_date: returnDateTime.toISOString(),
      status: 'returned',
    },
    fineRate
  );

  // If admin provided custom fineAmount (such as waiving or discount), use that
  const finalFine =
    parsed.data.fineAmount !== undefined
      ? parsed.data.fineAmount
      : details.calculated_fine;

  const notesCombined = parsed.data.notes
    ? rental.notes
      ? `${rental.notes} | Return note: ${parsed.data.notes}`
      : parsed.data.notes
    : rental.notes;

  const returnPayload = {
    status: 'returned',
    return_date: returnDateTime.toISOString(),
    fine_amount: finalFine,
    fine_paid: parsed.data.finePaid,
    returned_by: admin.id,
    notes: notesCombined,
    updated_at: new Date().toISOString(),
  };

  // 1. Update book_rentals
  const { data: updatedRental, error: updateRentalErr } = await adminClient
    .from('book_rentals')
    .update(returnPayload)
    .eq('id', rentalId)
    .select('*')
    .maybeSingle();

  if (updateRentalErr) {
    console.error('Failed to update book_rentals on return:', updateRentalErr);
  }

  // 2. Synchronously update book_issues
  const { error: updateIssueErr } = await adminClient
    .from('book_issues')
    .update(returnPayload)
    .eq('id', rentalId);

  if (updateIssueErr) {
    console.error('Failed to update book_issues on return:', updateIssueErr);
  }

  // 3. Synchronize fine_records if applicable
  if (finalFine > 0) {
    const { data: fineRecord } = await adminClient
      .from('fine_records')
      .select('id')
      .eq('issue_id', rentalId)
      .maybeSingle();

    if (fineRecord) {
      await adminClient
        .from('fine_records')
        .update({
          fine_amount: finalFine,
          status: parsed.data.finePaid ? 'paid' : 'pending',
          paid_at: parsed.data.finePaid ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', fineRecord.id);
    }
  }

  // 4. CRITICAL: Synchronize and recalculate book inventory availability
  const newAvailableCopies = await syncBookInventory(adminClient, rental.book_id);

  const bookTitle = (rental.book as { title?: string } | null)?.title || 'Book';
  const studentName =
    (rental.student as { full_name?: string } | null)?.full_name || 'Student';

  // 5. Record audit log
  await recordAuditLog({
    actorId: admin.id,
    actorEmail: admin.email,
    action: 'BOOK_RETURNED',
    targetType: 'book_rental',
    targetId: rentalId,
    details: {
      bookTitle,
      studentName,
      returnDate: returnDateTime.toISOString(),
      overdueDays: details.overdue_days,
      fineAmount: finalFine,
      finePaid: parsed.data.finePaid,
      newAvailableCopies,
    },
  });

  return NextResponse.json({
    ok: true,
    message: `"${bookTitle}" returned by ${studentName}. Overdue days: ${details.overdue_days}. Fine: ₹${finalFine}. Inventory restored (${newAvailableCopies} copy/copies available).`,
    rental: updatedRental || { id: rentalId, ...returnPayload },
    overdueDays: details.overdue_days,
    fineAmount: finalFine,
    availableCopies: newAvailableCopies,
  });
}
