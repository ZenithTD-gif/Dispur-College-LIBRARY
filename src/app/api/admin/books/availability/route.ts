import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/admin';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

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

  // Fetch all books with copy counts
  const { data: books, error: booksError } = await adminClient
    .from('books')
    .select('id, title, author, subject, category_id, file_type, total_copies, available_copies')
    .order('title', { ascending: true });

  if (booksError) {
    return NextResponse.json({ error: 'Failed to fetch books.' }, { status: 500 });
  }

  // Fetch currently issued unreturned rentals
  const { data: issuedRentals, error: rentalsError } = await adminClient
    .from('book_rentals')
    .select(`
      id,
      book_id,
      issue_date,
      due_date,
      student:students (
        id,
        full_name,
        registration_number,
        college_roll_number
      )
    `)
    .in('status', ['issued', 'overdue'])
    .is('return_date', null);

  if (rentalsError) {
    return NextResponse.json({ error: 'Failed to fetch active rentals.' }, { status: 500 });
  }

  interface ActiveLoanItem {
    rentalId: string;
    studentName: string;
    registrationNumber: string;
    rollNumber: string;
    issueDate: string;
    dueDate: string;
    isOverdue: boolean;
  }

  const activeLoansMap = new Map<string, ActiveLoanItem[]>();
  const now = new Date();

  for (const r of issuedRentals || []) {
    const student = r.student as {
      full_name?: string;
      registration_number?: string;
      college_roll_number?: string;
    } | null;
    const isOverdue = new Date(r.due_date).getTime() < now.getTime();

    const item: ActiveLoanItem = {
      rentalId: r.id,
      studentName: student?.full_name || 'Student',
      registrationNumber: student?.registration_number || '',
      rollNumber: student?.college_roll_number || '',
      issueDate: r.issue_date,
      dueDate: r.due_date,
      isOverdue,
    };

    const existing = activeLoansMap.get(r.book_id) || [];
    existing.push(item);
    activeLoansMap.set(r.book_id, existing);
  }

  let totalAvailableCopiesAll = 0;
  let totalCopiesAll = 0;
  let totalIssuedLoansAll = 0;

  const availabilityList = (books || []).map((b) => {
    const activeLoans = activeLoansMap.get(b.id) || [];
    const totalCopies = Math.max(1, Number(b.total_copies) || 1);
    const activeIssuedCount = activeLoans.length;
    const availableCopies = Math.max(0, totalCopies - activeIssuedCount);
    const isAvailable = availableCopies > 0;

    totalCopiesAll += totalCopies;
    totalIssuedLoansAll += activeIssuedCount;
    totalAvailableCopiesAll += availableCopies;

    return {
      bookId: b.id,
      title: b.title,
      author: b.author,
      subject: b.subject,
      totalCopies,
      availableCopies,
      isAvailable,
      activeLoan: activeLoans[0] || null,
      activeLoans,
    };
  });

  return NextResponse.json({
    books: availabilityList,
    stats: {
      totalBooks: availabilityList.length,
      totalCopies: totalCopiesAll,
      issuedCount: totalIssuedLoansAll,
      availableCount: totalAvailableCopiesAll,
    },
  });
}
