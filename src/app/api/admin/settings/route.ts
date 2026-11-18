import { NextRequest, NextResponse } from 'next/server';
import { recordAuditLog, requireAdminApi } from '@/lib/auth/admin';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { librarySettingsUpdateSchema } from '@/lib/validation';
import type { LibrarySettings } from '@/types/library';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return auth.response;
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Database client unavailable.' }, { status: 503 });
  }

  const { data: rawSettings, error } = await adminClient
    .from('library_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    console.error('Failed to read library settings:', error);
    return NextResponse.json({ error: 'Failed to read library settings.' }, { status: 500 });
  }

  const settings: LibrarySettings = rawSettings
    ? {
        ...rawSettings,
        daily_fine_rate: Number(rawSettings.daily_fine_rate),
        borrowing_period_days: Number(rawSettings.borrowing_period_days),
        max_books_per_student: Number(rawSettings.max_books_per_student),
      }
    : {
        id: 1,
        daily_fine_rate: 5,
        borrowing_period_days: 7,
        max_books_per_student: 3,
        currency_symbol: '₹',
        updated_at: new Date().toISOString(),
        updated_by: null,
      };

  return NextResponse.json({ settings });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return auth.response;
  }

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

  const parsed = librarySettingsUpdateSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue?.message || 'Invalid settings values.' },
      { status: 400 }
    );
  }

  const { data: updated, error: updateError } = await adminClient
    .from('library_settings')
    .upsert({
      id: 1,
      daily_fine_rate: parsed.data.dailyFineRate,
      borrowing_period_days: parsed.data.borrowingPeriodDays,
      max_books_per_student: parsed.data.maxBooksPerStudent,
      updated_by: admin.id,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (updateError || !updated) {
    console.error('Failed to update library settings:', updateError);
    return NextResponse.json(
      { error: 'Database error updating settings.' },
      { status: 500 }
    );
  }

  await recordAuditLog({
    actorId: admin.id,
    actorEmail: admin.email,
    action: 'LIBRARY_SETTINGS_UPDATED',
    targetType: 'library_settings',
    targetId: '1',
    details: {
      dailyFineRate: parsed.data.dailyFineRate,
      borrowingPeriodDays: parsed.data.borrowingPeriodDays,
      maxBooksPerStudent: parsed.data.maxBooksPerStudent,
    },
  });

  return NextResponse.json({
    ok: true,
    message: 'Library rental settings updated successfully.',
    settings: {
      ...updated,
      daily_fine_rate: Number(updated.daily_fine_rate),
      borrowing_period_days: Number(updated.borrowing_period_days),
      max_books_per_student: Number(updated.max_books_per_student),
    },
  });
}

