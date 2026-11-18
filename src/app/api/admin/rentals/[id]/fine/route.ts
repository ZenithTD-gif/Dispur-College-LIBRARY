import { NextRequest, NextResponse } from 'next/server';
import { recordAuditLog, requireAdminApi } from '@/lib/auth/admin';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { updateFineStatusSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function PATCH(
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const parsed = updateFineStatusSchema.safeParse({
    rentalId,
    ...(typeof body === 'object' && body !== null ? body : {}),
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue?.message || 'Invalid fine parameters.' },
      { status: 400 }
    );
  }

  const updates: { fine_paid: boolean; fine_amount?: number } = {
    fine_paid: parsed.data.finePaid,
  };
  if (parsed.data.fineAmount !== undefined) {
    updates.fine_amount = parsed.data.fineAmount;
  }

  const { data: updatedRental, error: updateError } = await adminClient
    .from('book_rentals')
    .update(updates)
    .eq('id', rentalId)
    .select('*')
    .single();

  if (updateError || !updatedRental) {
    console.error('Failed to update fine:', updateError);
    return NextResponse.json(
      { error: 'Database error updating fine status.' },
      { status: 500 }
    );
  }

  await recordAuditLog({
    actorId: admin.id,
    actorEmail: admin.email,
    action: 'RENTAL_FINE_UPDATED',
    targetType: 'book_rental',
    targetId: rentalId,
    details: {
      finePaid: parsed.data.finePaid,
      fineAmount: updates.fine_amount ?? updatedRental.fine_amount,
    },
  });

  return NextResponse.json({
    ok: true,
    message: 'Fine status updated successfully.',
    rental: updatedRental,
  });
}

