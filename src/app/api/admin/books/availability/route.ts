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

  // Fetch all books
  const { data: books, error: booksError } = await adminClient
    .from('books')
    .select('id, title, author, subject, category_id, file_type')
    .order('title', { ascending: true });

  if (booksError) {
    return NextResponse.json({ error: 'Failed to fetch books.' }, { status: 500 });
  }

  // Fetch currently issued rentals
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
    .eq('status', 'issued');

  if (rentalsError) {
    return NextResponse.json({ error: 'Failed to fetch active rentals.' }, { status: 500 });
  }

  const issuedMap = new Map<string, {
    rentalId: string;
    studentName: string;
    registrationNumber: string;
    rollNumber: string;
    issueDate: string;
    dueDate: string;
    isOverdue: boolean;
  }>();

  const now = new Date();
  for (const r of issuedRentals || []) {
    const student = r.student as {
      full_name?: string;
      registration_number?: string;
      college_roll_number?: string;
    } | null;
    const isOverdue = new Date(r.due_date).getTime() < now.getTime();
    issuedMap.set(r.book_id, {
      rentalId: r.id,
      studentName: student?.full_name || 'Student',
      registrationNumber: student?.registration_number || '',
      rollNumber: student?.college_roll_number || '',
      issueDate: r.issue_date,
      dueDate: r.due_date,
      isOverdue,
    });
  }

  const availabilityList = (books || []).map((b) => {
    const activeLoan = issuedMap.get(b.id);
    return {
      bookId: b.id,
      title: b.title,
      author: b.author,
      subject: b.subject,
      isAvailable: !activeLoan,
      activeLoan: activeLoan || null,
    };
  });

  const totalBooks = availabilityList.length;
  const issuedCount = issuedMap.size;
  const availableCount = totalBooks - issuedCount;

  return NextResponse.json({
    books: availabilityList,
    stats: {
      totalBooks,
      issuedCount,
      availableCount,
    },
  });
}

