import { NextResponse } from 'next/server';
import { requireStudentApi } from '@/lib/auth/student';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getPublicCoverUrl } from '@/lib/supabase/storage';
import { calculateRentalDetails } from '@/lib/validation';
import type { BookRentalWithDetails, LibrarySettings } from '@/types/library';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireStudentApi();
  if (!auth.ok) {
    return auth.response;
  }

  const { student } = auth;
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Database client unavailable.' }, { status: 503 });
  }

  // 1. Fetch library settings
  const { data: rawSettings } = await adminClient
    .from('library_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

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

  // 2. Fetch student's rentals with book details
  const { data: rentalsData, error: rentalsError } = await adminClient
    .from('book_rentals')
    .select(`
      *,
      book:books (
        id,
        title,
        author,
        subject,
        cover_image_path,
        file_type,
        allow_download
      )
    `)
    .eq('student_id', student.id)
    .order('created_at', { ascending: false });

  if (rentalsError) {
    console.error('Failed to query student rentals:', rentalsError);
    return NextResponse.json(
      { error: 'Failed to retrieve borrowing records.' },
      { status: 500 }
    );
  }

  const activeRentals: BookRentalWithDetails[] = [];
  const historyRentals: BookRentalWithDetails[] = [];
  let totalOutstandingFine = 0;
  let overdueLoanCount = 0;

  for (const raw of rentalsData || []) {
    const details = calculateRentalDetails(raw, settings.daily_fine_rate);
    const bookObj = raw.book
      ? {
          ...raw.book,
          cover_url: getPublicCoverUrl(raw.book.cover_image_path),
        }
      : null;

    const rentalWithDetails: BookRentalWithDetails = {
      ...raw,
      daily_fine_rate_snapshot: Number(raw.daily_fine_rate_snapshot),
      fine_amount: Number(raw.fine_amount),
      book: bookObj,
      remaining_days: details.remaining_days,
      overdue_days: details.overdue_days,
      calculated_fine: details.calculated_fine,
      is_overdue: details.is_overdue,
    };

    if (raw.status === 'issued') {
      activeRentals.push(rentalWithDetails);
      if (details.is_overdue) {
        overdueLoanCount++;
        totalOutstandingFine += details.calculated_fine;
      }
    } else {
      historyRentals.push(rentalWithDetails);
      if (!raw.fine_paid && details.calculated_fine > 0) {
        totalOutstandingFine += details.calculated_fine;
      }
    }
  }

  return NextResponse.json({
    student,
    activeRentals,
    historyRentals,
    totalOutstandingFine,
    activeLoanCount: activeRentals.length,
    overdueLoanCount,
    settings,
  });
}

