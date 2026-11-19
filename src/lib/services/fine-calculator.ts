import type { SupabaseClient } from '@supabase/supabase-js';

export interface CalculatedFineResult {
  issueId: string;
  isOverdue: boolean;
  overdueDays: number;
  remainingDays: number;
  ratePerDay: number;
  fineAmount: number;
  status: 'issued' | 'overdue' | 'returned' | 'lost';
}

/**
 * Normalizes dates to calendar days for exact, fair 24-hour day calculations.
 */
function toCalendarDay(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Authoritatively calculates overdue days and fines on the server side.
 */
export function calculateServerSideFine(
  _issueDateStr: string,
  dueDateStr: string,
  returnDateStr: string | null | undefined,
  ratePerDay: number
): {
  isOverdue: boolean;
  overdueDays: number;
  remainingDays: number;
  fineAmount: number;
} {
  const now = new Date();
  const dueDate = new Date(dueDateStr);
  const effectiveEndDate = returnDateStr ? new Date(returnDateStr) : now;

  const dueCal = toCalendarDay(dueDate);
  const endCal = toCalendarDay(effectiveEndDate);
  const diffDays = Math.round((endCal - dueCal) / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    const rate = Math.max(0, Number(ratePerDay) || 5.0);
    const fineAmount = Math.round(diffDays * rate * 100) / 100;
    return {
      isOverdue: true,
      overdueDays: diffDays,
      remainingDays: 0,
      fineAmount,
    };
  }

  // Not overdue yet
  const remainingDays = Math.max(0, -diffDays);
  return {
    isOverdue: false,
    overdueDays: 0,
    remainingDays,
    fineAmount: 0.0,
  };
}

/**
 * Re-evaluates and persists fines for a specific book issue record in Supabase.
 */
export async function syncServerSideFineRecord(
  adminClient: SupabaseClient,
  issue: {
    id: string;
    student_id: string;
    book_id: string;
    issue_date: string;
    due_date: string;
    return_date?: string | null;
    status: string;
    fine_per_day: number;
    fine_paid?: boolean;
  }
): Promise<CalculatedFineResult> {
  const calc = calculateServerSideFine(
    issue.issue_date,
    issue.due_date,
    issue.return_date,
    issue.fine_per_day
  );

  const newStatus =
    issue.status === 'returned'
      ? 'returned'
      : calc.isOverdue
      ? 'overdue'
      : 'issued';

  // 1. Update book_issues
  await adminClient
    .from('book_issues')
    .update({
      fine_amount: calc.fineAmount,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', issue.id);

  // 2. Mirror update to book_rentals if row exists
  await adminClient
    .from('book_rentals')
    .update({
      fine_amount: calc.fineAmount,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', issue.id);

  // 3. Upsert fine_records audit row if overdue or fine exists
  if (calc.fineAmount > 0) {
    const { data: existingFine } = await adminClient
      .from('fine_records')
      .select('id')
      .eq('issue_id', issue.id)
      .maybeSingle();

    if (existingFine) {
      await adminClient
        .from('fine_records')
        .update({
          days_overdue: calc.overdueDays,
          rate_per_day: issue.fine_per_day,
          fine_amount: calc.fineAmount,
          status: issue.fine_paid ? 'paid' : 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingFine.id);
    } else {
      await adminClient.from('fine_records').insert({
        issue_id: issue.id,
        student_id: issue.student_id,
        book_id: issue.book_id,
        days_overdue: calc.overdueDays,
        rate_per_day: issue.fine_per_day,
        fine_amount: calc.fineAmount,
        status: issue.fine_paid ? 'paid' : 'pending',
        calculated_at: new Date().toISOString(),
      });
    }
  }

  return {
    issueId: issue.id,
    isOverdue: calc.isOverdue,
    overdueDays: calc.overdueDays,
    remainingDays: calc.remainingDays,
    ratePerDay: issue.fine_per_day,
    fineAmount: calc.fineAmount,
    status: newStatus as CalculatedFineResult['status'],
  };
}
