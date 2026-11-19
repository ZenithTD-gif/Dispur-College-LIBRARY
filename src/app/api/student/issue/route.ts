import { NextRequest, NextResponse } from 'next/server';
import { requireStudentApi } from '@/lib/auth/student';
import { recordAuditLog } from '@/lib/auth/admin';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { isValidUuid } from '@/lib/validation';
import {
  getAndSyncBookAvailability,
  syncBookInventory,
} from '@/lib/services/inventory-service';
import { sendBookIssueConfirmationEmail } from '@/lib/services/email-service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await requireStudentApi();
  if (!auth.ok) {
    return auth.response;
  }

  const { student } = auth;
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json(
      { error: 'Database service is temporarily unavailable.' },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const payload = body as { bookIds?: unknown; bookId?: unknown };
  const rawIds = Array.isArray(payload.bookIds)
    ? payload.bookIds
    : payload.bookId
    ? [payload.bookId]
    : [];

  const bookIds = rawIds.filter((id): id is string => typeof id === 'string' && isValidUuid(id));

  if (bookIds.length === 0) {
    return NextResponse.json(
      { error: 'Please select at least one valid book to issue.' },
      { status: 400 }
    );
  }

  // De-duplicate book IDs
  const uniqueBookIds = Array.from(new Set(bookIds));

  // 1. Fetch library settings
  const { data: rawSettings } = await adminClient
    .from('library_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  const maxBooks = Number(rawSettings?.max_books_per_student) || 3;
  const defaultBorrowingDays = Number(rawSettings?.borrowing_period_days) || 7;
  const defaultFineRate = Number(rawSettings?.daily_fine_rate) || 5.0;

  // 2. Fetch student's currently active issues
  const [{ count: activeIssueCount }, { data: existingStudentIssues }] = await Promise.all([
    adminClient
      .from('book_issues')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', student.id)
      .eq('status', 'issued'),
    adminClient
      .from('book_issues')
      .select('book_id')
      .eq('student_id', student.id)
      .eq('status', 'issued'),
  ]);

  const currentActive = activeIssueCount || 0;
  if (currentActive + uniqueBookIds.length > maxBooks) {
    const availableSlots = Math.max(0, maxBooks - currentActive);
    return NextResponse.json(
      {
        error: `Borrowing limit exceeded. You currently have ${currentActive} active book(s). The maximum allowance is ${maxBooks} books at a time. You can only borrow ${availableSlots} more book(s).`,
      },
      { status: 400 }
    );
  }

  // Check if any of the selected books are already currently issued by this student
  const alreadyIssuedSet = new Set((existingStudentIssues || []).map((i) => i.book_id));
  const duplicateId = uniqueBookIds.find((id) => alreadyIssuedSet.has(id));
  if (duplicateId) {
    const { data: dupBook } = await adminClient
      .from('books')
      .select('title')
      .eq('id', duplicateId)
      .maybeSingle();

    return NextResponse.json(
      {
        error: `You already have "${dupBook?.title || 'this book'}" currently issued. Please return it before issuing again.`,
      },
      { status: 400 }
    );
  }

  // 3. Fetch all requested books and check availability
  const { data: books, error: booksErr } = await adminClient
    .from('books')
    .select('id, title, issue_duration_days, fine_per_day, total_copies, available_copies')
    .in('id', uniqueBookIds);

  if (booksErr || !books || books.length !== uniqueBookIds.length) {
    return NextResponse.json(
      { error: 'One or more selected books could not be found in the catalog.' },
      { status: 404 }
    );
  }

  // Check authoritative available copies
  for (const b of books) {
    const avail = await getAndSyncBookAvailability(adminClient, b.id);
    if (!avail.isAvailable || avail.availableCopies <= 0) {
      return NextResponse.json(
        {
          error: `"${b.title}" is currently out of stock. All ${avail.totalCopies} copy/copies have been issued to other students.`,
        },
        { status: 400 }
      );
    }
  }

  // 4. Issue each book
  const now = new Date();
  const createdIssues: Array<{
    id: string;
    student_id: string;
    book_id: string;
    issue_date: string;
    due_date: string;
    status: 'issued';
    issue_duration_days: number;
    fine_per_day: number;
    fine_amount: number;
    fine_paid: boolean;
  }> = [];

  for (const b of books) {
    const durationDays = b.issue_duration_days || defaultBorrowingDays;
    const fineRate = b.fine_per_day !== undefined ? Number(b.fine_per_day) : defaultFineRate;

    const dueDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const issueRecord = {
      id: crypto.randomUUID(),
      student_id: student.id,
      book_id: b.id,
      issue_date: now.toISOString(),
      due_date: dueDate.toISOString(),
      status: 'issued' as const,
      issue_duration_days: durationDays,
      fine_per_day: fineRate,
      fine_amount: 0.0,
      fine_paid: false,
    };

    // Insert into book_issues
    const { error: issueErr } = await adminClient
      .from('book_issues')
      .insert(issueRecord);

    if (issueErr) {
      console.error('Failed to insert into book_issues:', issueErr);
      return NextResponse.json(
        { error: `Database error issuing "${b.title}". Please try again.` },
        { status: 500 }
      );
    }

    // Mirror into book_rentals for backward compatibility
    await adminClient.from('book_rentals').insert({
      id: issueRecord.id,
      student_id: student.id,
      book_id: b.id,
      issue_date: issueRecord.issue_date,
      due_date: issueRecord.due_date,
      status: 'issued',
      daily_fine_rate_snapshot: fineRate,
      fine_amount: 0.0,
      fine_paid: false,
    });

    // Synchronize available copies authoritatively
    await syncBookInventory(adminClient, b.id);

    // System A: Send Automatic Book Issue Confirmation Email immediately
    try {
      if (student.email) {
        const emailResult = await sendBookIssueConfirmationEmail({
          recipientEmail: student.email,
          studentName: student.full_name,
          bookTitle: b.title,
          bookId: b.id,
          issueId: issueRecord.id,
          issueDate: issueRecord.issue_date,
          dueDate: issueRecord.due_date,
        });

        await adminClient.from('book_return_reminders').insert({
          issue_id: issueRecord.id,
          student_id: student.id,
          book_id: b.id,
          due_date: issueRecord.due_date,
          reminder_type: 'BOOK_ISSUE_CONFIRMATION',
          status: emailResult.success ? 'sent' : 'failed',
          recipient_email: student.email,
          student_name: student.full_name,
          book_title: b.title,
          email_id: emailResult.emailId || null,
          sent_at: emailResult.success ? new Date().toISOString() : null,
          last_error: emailResult.error || null,
          retry_count: emailResult.success ? 0 : 1,
          metadata: {
            provider: emailResult.provider,
            isSandboxRestricted: emailResult.isSandboxRestricted || false,
            issuedByStudent: true,
          },
        });
      }
    } catch (emailErr) {
      console.error('[StudentIssue] Non-blocking error dispatching issue confirmation email:', emailErr);
    }

    createdIssues.push(issueRecord);
  }

  // Audit log
  await recordAuditLog({
    actorId: student.id,
    actorEmail: student.email,
    action: 'book.issued_by_student',
    targetType: 'book_issue',
    targetId: createdIssues.map((i) => i.id).join(','),
    details: {
      student_name: student.full_name,
      registration_number: student.registration_number,
      book_ids: uniqueBookIds,
      book_titles: books.map((b) => b.title),
      count: createdIssues.length,
    },
  });

  return NextResponse.json(
    {
      success: true,
      message: `Successfully issued ${createdIssues.length} book(s)!`,
      issuedCount: createdIssues.length,
      issues: createdIssues,
    },
    { status: 201 }
  );
}
