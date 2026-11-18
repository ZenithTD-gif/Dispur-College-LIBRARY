import { NextRequest, NextResponse } from 'next/server';
import { recordAuditLog, requireAdminApi } from '@/lib/auth/admin';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { calculateRentalDetails, returnBookSchema } from '@/lib/validation';

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

  // Fetch the rental
  const { data: rental, error: fetchError } = await adminClient
    .from('book_rentals')
    .select(`
      *,
      book:books(id, title),
      student:students(id, full_name, registration_number)
    `)
    .eq('id', rentalId)
    .maybeSingle();

  if (fetchError || !rental) {
    return NextResponse.json({ error: 'Rental record not found.' }, { status: 404 });
  }

  if (rental.status === 'returned') {
    return NextResponse.json(
      { error: 'This book has already been marked as returned.' },
      { status: 400 }
    );
  }

  // Calculate return details and fines
  const returnDateTime = parsed.data.returnDate
    ? new Date(parsed.data.returnDate)
    : new Date();

  const details = calculateRentalDetails(
    {
      ...rental,
      return_date: returnDateTime.toISOString(),
      status: 'returned',
    },
    Number(rental.daily_fine_rate_snapshot || 5)
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

  const { data: updatedRental, error: updateError } = await adminClient
    .from('book_rentals')
    .update({
      status: 'returned',
      return_date: returnDateTime.toISOString(),
      fine_amount: finalFine,
      fine_paid: parsed.data.finePaid,
      returned_by: admin.id,
      notes: notesCombined,
    })
    .eq('id', rentalId)
    .select('*')
    .single();

  if (updateError || !updatedRental) {
    console.error('Failed to update rental on return:', updateError);
    return NextResponse.json(
      { error: 'Database error recording book return.' },
      { status: 500 }
    );
  }

  const bookTitle = (rental.book as { title?: string } | null)?.title || 'Book';
  const studentName =
    (rental.student as { full_name?: string } | null)?.full_name || 'Student';

  // Record audit log
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
    },
  });

  return NextResponse.json({
    ok: true,
    message: `"${bookTitle}" returned by ${studentName}. Overdue days: ${details.overdue_days}. Fine: ₹${finalFine}.`,
    rental: updatedRental,
    overdueDays: details.overdue_days,
    fineAmount: finalFine,
  });
}

