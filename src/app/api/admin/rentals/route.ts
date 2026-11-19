import { NextRequest, NextResponse } from 'next/server';
import { recordAuditLog, requireAdminApi } from '@/lib/auth/admin';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getPublicCoverUrl } from '@/lib/supabase/storage';
import {
  calculateRentalDetails,
  issueBookSchema,
  sanitizeSearchTerm,
} from '@/lib/validation';
import {
  getAndSyncBookAvailability,
  syncBookInventory,
} from '@/lib/services/inventory-service';
import type {
  BookRentalWithDetails,
  LibrarySettings,
  RentalOverviewStats,
} from '@/types/library';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return auth.response;
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Database client unavailable.' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status') || 'all'; // 'all' | 'issued' | 'overdue' | 'returned'
  const studentId = searchParams.get('studentId');
  const q = searchParams.get('q');

  // Fetch settings
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

  let query = adminClient
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
      ),
      student:students (
        id,
        full_name,
        registration_number,
        college_roll_number,
        department,
        semester,
        email,
        phone
      )
    `)
    .order('created_at', { ascending: false });

  if (studentId) {
    query = query.eq('student_id', studentId);
  }

  const { data: rentalsData, error: rentalsError } = await query;
  if (rentalsError) {
    console.error('Failed to fetch rentals:', rentalsError);
    return NextResponse.json({ error: 'Failed to fetch rentals.' }, { status: 500 });
  }

  const cleanTerm = q ? sanitizeSearchTerm(q).toLowerCase() : '';

  const allRentals: BookRentalWithDetails[] = [];
  let activeRentalsCount = 0;
  let overdueRentalsCount = 0;
  let returnedRentalsCount = 0;
  let totalOutstandingFines = 0;

  for (const raw of rentalsData || []) {
    const details = calculateRentalDetails(raw, settings.daily_fine_rate);
    const bookObj = raw.book
      ? {
          ...raw.book,
          cover_url: getPublicCoverUrl(raw.book.cover_image_path),
        }
      : null;

    const rental: BookRentalWithDetails = {
      ...raw,
      daily_fine_rate_snapshot: Number(raw.daily_fine_rate_snapshot),
      fine_amount: Number(raw.fine_amount),
      book: bookObj,
      student: raw.student ?? null,
      remaining_days: details.remaining_days,
      overdue_days: details.overdue_days,
      calculated_fine: details.calculated_fine,
      is_overdue: details.is_overdue,
    };

    if (raw.status === 'issued') {
      activeRentalsCount++;
      if (details.is_overdue) {
        overdueRentalsCount++;
        totalOutstandingFines += details.calculated_fine;
      }
    } else if (raw.status === 'returned') {
      returnedRentalsCount++;
      if (!raw.fine_paid && details.calculated_fine > 0) {
        totalOutstandingFines += details.calculated_fine;
      }
    }

    // Filter by text search if provided
    if (cleanTerm) {
      const matchBook =
        raw.book?.title?.toLowerCase().includes(cleanTerm) ||
        raw.book?.author?.toLowerCase().includes(cleanTerm) ||
        raw.book?.subject?.toLowerCase().includes(cleanTerm);
      const matchStudent =
        raw.student?.full_name?.toLowerCase().includes(cleanTerm) ||
        raw.student?.registration_number?.toLowerCase().includes(cleanTerm) ||
        raw.student?.college_roll_number?.toLowerCase().includes(cleanTerm) ||
        raw.student?.email?.toLowerCase().includes(cleanTerm);

      if (!matchBook && !matchStudent) {
        continue;
      }
    }

    // Filter by status if requested
    if (statusFilter === 'issued') {
      if (raw.status !== 'issued') continue;
    } else if (statusFilter === 'overdue') {
      if (raw.status !== 'issued' || !details.is_overdue) continue;
    } else if (statusFilter === 'returned') {
      if (raw.status !== 'returned') continue;
    }

    allRentals.push(rental);
  }

  // Count total registered students
  const { count: studentCount } = await adminClient
    .from('students')
    .select('id', { count: 'exact', head: true });

  const stats: RentalOverviewStats = {
    totalRentals: rentalsData?.length || 0,
    activeRentals: activeRentalsCount,
    overdueRentals: overdueRentalsCount,
    returnedRentals: returnedRentalsCount,
    totalStudents: studentCount || 0,
    totalOutstandingFines,
  };

  return NextResponse.json({
    rentals: allRentals,
    stats,
    settings,
  });
}

export async function POST(request: NextRequest) {
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

  const parsed = issueBookSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue?.message || 'Invalid book issue parameters.' },
      { status: 400 }
    );
  }

  const { studentId, bookId, issueDate, borrowingPeriodDays, notes } = parsed.data;

  // 1. Fetch library settings
  const { data: rawSettings } = await adminClient
    .from('library_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  const periodDays =
    borrowingPeriodDays || Number(rawSettings?.borrowing_period_days || 7);
  const dailyFineRate = Number(rawSettings?.daily_fine_rate || 5);
  const maxBooks = Number(rawSettings?.max_books_per_student || 3);

  // 2. Verify student exists and is active
  const { data: student, error: studentError } = await adminClient
    .from('students')
    .select('id, full_name, registration_number, college_roll_number, is_active')
    .eq('id', studentId)
    .maybeSingle();

  if (studentError || !student) {
    return NextResponse.json(
      { error: 'Selected student does not exist.' },
      { status: 404 }
    );
  }

  if (!student.is_active) {
    return NextResponse.json(
      { error: 'This student account is currently deactivated.' },
      { status: 400 }
    );
  }

  // Check how many books student currently has issued
  const { count: activeStudentLoans } = await adminClient
    .from('book_rentals')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .eq('status', 'issued');

  if ((activeStudentLoans || 0) >= maxBooks) {
    return NextResponse.json(
      {
        error: `Student has reached the maximum borrowing limit of ${maxBooks} books. Please return an existing book first.`,
      },
      { status: 400 }
    );
  }

  // 3. Verify book exists
  const { data: book, error: bookError } = await adminClient
    .from('books')
    .select('id, title, author')
    .eq('id', bookId)
    .maybeSingle();

  if (bookError || !book) {
    return NextResponse.json(
      { error: 'Selected book was not found in the catalog.' },
      { status: 404 }
    );
  }

  // 4. Verify this student does not already have this book currently issued
  const { data: existingStudentRental } = await adminClient
    .from('book_rentals')
    .select('id, due_date')
    .eq('book_id', bookId)
    .eq('student_id', studentId)
    .eq('status', 'issued')
    .maybeSingle();

  if (existingStudentRental) {
    const dueDateStr = new Date(existingStudentRental.due_date).toLocaleDateString('en-IN');
    return NextResponse.json(
      {
        error: `This book is already currently issued to ${student.full_name} (Due on: ${dueDateStr}). A student cannot borrow duplicate copies of the same book simultaneously.`,
      },
      { status: 409 }
    );
  }

  // 5. Verify authoritative inventory availability
  const availability = await getAndSyncBookAvailability(adminClient, bookId);
  if (!availability.isAvailable || availability.availableCopies <= 0) {
    return NextResponse.json(
      {
        error: `"${book.title}" is currently out of stock (0 of ${availability.totalCopies} copies available). Please wait until a copy is returned.`,
      },
      { status: 409 }
    );
  }

  // 6. Calculate issue and due dates
  const issueDateTime = issueDate ? new Date(issueDate) : new Date();
  const dueDateTime = new Date(issueDateTime.getTime() + periodDays * 24 * 60 * 60 * 1000);
  const loanId = crypto.randomUUID();

  // 7. Insert new rental and issue records atomically
  const loanPayload = {
    id: loanId,
    student_id: studentId,
    book_id: bookId,
    issue_date: issueDateTime.toISOString(),
    due_date: dueDateTime.toISOString(),
    status: 'issued',
    fine_amount: 0.0,
    fine_paid: false,
    notes: notes || null,
  };

  const { data: newRental, error: insertError } = await adminClient
    .from('book_rentals')
    .insert({
      ...loanPayload,
      daily_fine_rate_snapshot: dailyFineRate,
      issued_by: admin.id,
    })
    .select('*')
    .single();

  if (insertError || !newRental) {
    console.error('Failed to issue book in book_rentals:', insertError);
    return NextResponse.json(
      { error: 'Database error issuing book. Please try again.' },
      { status: 500 }
    );
  }

  // Mirror into book_issues so student dashboard sees it
  const { error: issueInsertError } = await adminClient
    .from('book_issues')
    .insert({
      ...loanPayload,
      issue_duration_days: periodDays,
      fine_per_day: dailyFineRate,
      issued_by: admin.id,
    });

  if (issueInsertError) {
    console.error('Failed to mirror issue into book_issues:', issueInsertError);
  }

  // Synchronize and update available copies
  const updatedAvailable = await syncBookInventory(adminClient, bookId);

  // 7. Audit log
  await recordAuditLog({
    actorId: admin.id,
    actorEmail: admin.email,
    action: 'BOOK_ISSUED',
    targetType: 'book_rental',
    targetId: newRental.id,
    details: {
      studentId,
      studentName: student.full_name,
      bookId,
      bookTitle: book.title,
      issueDate: issueDateTime.toISOString(),
      dueDate: dueDateTime.toISOString(),
      borrowingPeriodDays: periodDays,
      dailyFineRate,
    },
  });

  return NextResponse.json(
    {
      ok: true,
      message: `"${book.title}" successfully issued to ${student.full_name}. Due on ${dueDateTime.toLocaleDateString('en-IN')}.`,
      rental: newRental,
      availableCopies: updatedAvailable,
    },
    { status: 201 }
  );
}

