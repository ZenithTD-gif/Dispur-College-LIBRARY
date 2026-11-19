/**
 * Dispur College - Department of Professional Studies Digital Library
 * Automated Book Return Reminder Engine
 *
 * Scans active loans for approaching return deadlines (24-hour notice),
 * enforces idempotency, invokes the Resend email service, and persists
 * audit and delivery logs in `public.book_return_reminders`.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { sendBookReturnReminderEmail } from '@/lib/services/email-service';
import type { BookReturnReminder, ReminderType } from '@/types/library';

export interface ReminderScanItemResult {
  issueId: string;
  studentId: string;
  studentName: string;
  recipientEmail: string;
  bookTitle: string;
  dueDate: string;
  status: 'sent' | 'failed' | 'skipped';
  emailId?: string | null;
  error?: string | null;
  isRetry?: boolean;
}

export interface ReminderScanSummary {
  timestamp: string;
  totalEligibleFound: number;
  processedCount: number;
  sentCount: number;
  skippedCount: number;
  failedCount: number;
  results: ReminderScanItemResult[];
}

/**
 * Checks if an issue's due date is within the approximately 24-hour reminder window.
 *
 * A loan is eligible for the 24-hour notice if:
 * 1. Current time is at or beyond 24 hours before due date (with 2-hour early buffer for cron intervals)
 * 2. Due date has not expired by more than 4 hours (to prevent obsolete "due soon" emails if overdue)
 */
export function isIssueEligibleFor24hReminder(
  dueDateInput: string | Date,
  referenceNowInput?: string | Date
): boolean {
  const dueDate = typeof dueDateInput === 'string' ? new Date(dueDateInput) : dueDateInput;
  const now = referenceNowInput
    ? typeof referenceNowInput === 'string'
      ? new Date(referenceNowInput)
      : referenceNowInput
    : new Date();

  if (isNaN(dueDate.getTime()) || isNaN(now.getTime())) {
    return false;
  }

  const diffMs = dueDate.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  // Eligible if due within 0 to 26 hours, or up to 4 hours past due if job just ran
  return diffHours >= -4 && diffHours <= 26;
}

/**
 * Validates email format for reminder dispatch.
 */
function isValidEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const re = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return re.test(email.trim());
}

/**
 * Main engine function to scan and process 24-hour return reminders.
 * Safe to run frequently (e.g. hourly or daily via cron) - guaranteed idempotent.
 */
export async function processDueSoonReminders(
  supabaseAdmin: SupabaseClient
): Promise<ReminderScanSummary> {
  const scanTime = new Date();
  const scanTimeIso = scanTime.toISOString();

  const summary: ReminderScanSummary = {
    timestamp: scanTimeIso,
    totalEligibleFound: 0,
    processedCount: 0,
    sentCount: 0,
    skippedCount: 0,
    failedCount: 0,
    results: [],
  };

  // 1. Fetch active book issues that are currently issued and not returned
  const { data: activeIssues, error: issuesError } = await supabaseAdmin
    .from('book_issues')
    .select(`
      id,
      student_id,
      book_id,
      issue_date,
      due_date,
      return_date,
      status,
      fine_per_day,
      books (
        id,
        title,
        isbn
      )
    `)
    .eq('status', 'issued')
    .is('return_date', null);

  if (issuesError || !activeIssues) {
    console.error('[ReminderEngine] Error fetching active book issues:', issuesError);
    return summary;
  }

  // 2. Filter for issues falling inside the 24-hour reminder window
  const eligibleIssues = activeIssues.filter((issue) =>
    isIssueEligibleFor24hReminder(issue.due_date, scanTime)
  );

  summary.totalEligibleFound = eligibleIssues.length;
  if (eligibleIssues.length === 0) {
    return summary;
  }

  // 3. Process each eligible issue with idempotency protection
  const reminderType: ReminderType = 'due_soon_24h';

  for (const issue of eligibleIssues) {
    summary.processedCount++;

    const book = Array.isArray(issue.books) ? issue.books[0] : issue.books;
    const bookTitle = book?.title || 'Library Book';
    const bookId = issue.book_id;

    // A. Check for existing reminder record for this issue, due_date and reminder_type
    const { data: existingReminder } = await supabaseAdmin
      .from('book_return_reminders')
      .select('*')
      .eq('issue_id', issue.id)
      .eq('due_date', issue.due_date)
      .eq('reminder_type', reminderType)
      .maybeSingle<BookReturnReminder>();

    // If already sent successfully, skip (idempotency guarantee)
    if (existingReminder && existingReminder.status === 'sent') {
      summary.skippedCount++;
      summary.results.push({
        issueId: issue.id,
        studentId: issue.student_id,
        studentName: existingReminder.student_name,
        recipientEmail: existingReminder.recipient_email,
        bookTitle,
        dueDate: issue.due_date,
        status: 'skipped',
        emailId: existingReminder.email_id,
        error: 'Reminder already sent previously for this deadline.',
      });
      continue;
    }

    // If failed and exceeded maximum retry attempts (e.g. 3), skip
    if (existingReminder && existingReminder.status === 'failed' && existingReminder.retry_count >= 3) {
      summary.skippedCount++;
      summary.results.push({
        issueId: issue.id,
        studentId: issue.student_id,
        studentName: existingReminder.student_name,
        recipientEmail: existingReminder.recipient_email,
        bookTitle,
        dueDate: issue.due_date,
        status: 'skipped',
        error: `Exceeded maximum retries (${existingReminder.retry_count}).`,
      });
      continue;
    }

    // B. Retrieve recipient student details from students table (with fallback to profiles)
    let recipientEmail = '';
    let studentName = 'Student';

    const { data: studentRecord } = await supabaseAdmin
      .from('students')
      .select('full_name, email')
      .eq('id', issue.student_id)
      .maybeSingle();

    if (studentRecord?.email) {
      recipientEmail = studentRecord.email.trim();
      studentName = studentRecord.full_name?.trim() || studentName;
    } else {
      const { data: profileRecord } = await supabaseAdmin
        .from('profiles')
        .select('full_name, email')
        .eq('id', issue.student_id)
        .maybeSingle();

      if (profileRecord?.email) {
        recipientEmail = profileRecord.email.trim();
        studentName = profileRecord.full_name?.trim() || studentName;
      }
    }

    // If no valid email address is found, record skipped/failed log
    if (!isValidEmail(recipientEmail)) {
      summary.failedCount++;
      summary.results.push({
        issueId: issue.id,
        studentId: issue.student_id,
        studentName,
        recipientEmail: recipientEmail || 'unknown@invalid',
        bookTitle,
        dueDate: issue.due_date,
        status: 'failed',
        error: 'No valid recipient email found for student account.',
      });

      if (!existingReminder) {
        await supabaseAdmin.from('book_return_reminders').insert({
          issue_id: issue.id,
          student_id: issue.student_id,
          book_id: bookId,
          due_date: issue.due_date,
          reminder_type: reminderType,
          status: 'failed',
          recipient_email: recipientEmail || 'no-email@dispurcollege.ac.in',
          student_name: studentName,
          book_title: bookTitle,
          last_error: 'Invalid or missing student email address.',
          retry_count: 1,
        });
      }
      continue;
    }

    // C. Dispatch email through Resend Email Service
    const emailResult = await sendBookReturnReminderEmail({
      recipientEmail,
      studentName,
      bookTitle,
      issueId: issue.id,
      bookId,
      issueDate: issue.issue_date,
      dueDate: issue.due_date,
      finePerDay: Number(issue.fine_per_day) || 5.0,
    });

    const isRetry = Boolean(existingReminder && existingReminder.status === 'failed');
    const newRetryCount = existingReminder ? existingReminder.retry_count + 1 : 0;

    if (emailResult.success) {
      summary.sentCount++;
      summary.results.push({
        issueId: issue.id,
        studentId: issue.student_id,
        studentName,
        recipientEmail,
        bookTitle,
        dueDate: issue.due_date,
        status: 'sent',
        emailId: emailResult.emailId,
        isRetry,
      });

      if (existingReminder) {
        await supabaseAdmin
          .from('book_return_reminders')
          .update({
            status: 'sent',
            email_id: emailResult.emailId,
            sent_at: new Date().toISOString(),
            last_error: null,
            retry_count: newRetryCount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingReminder.id);
      } else {
        await supabaseAdmin.from('book_return_reminders').insert({
          issue_id: issue.id,
          student_id: issue.student_id,
          book_id: bookId,
          due_date: issue.due_date,
          reminder_type: reminderType,
          status: 'sent',
          recipient_email: recipientEmail,
          student_name: studentName,
          book_title: bookTitle,
          email_id: emailResult.emailId,
          sent_at: new Date().toISOString(),
          retry_count: 0,
        });
      }
    } else {
      summary.failedCount++;
      summary.results.push({
        issueId: issue.id,
        studentId: issue.student_id,
        studentName,
        recipientEmail,
        bookTitle,
        dueDate: issue.due_date,
        status: 'failed',
        error: emailResult.error || 'Failed to dispatch email.',
        isRetry,
      });

      if (existingReminder) {
        await supabaseAdmin
          .from('book_return_reminders')
          .update({
            status: 'failed',
            last_error: emailResult.error,
            retry_count: newRetryCount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingReminder.id);
      } else {
        await supabaseAdmin.from('book_return_reminders').insert({
          issue_id: issue.id,
          student_id: issue.student_id,
          book_id: bookId,
          due_date: issue.due_date,
          reminder_type: reminderType,
          status: 'failed',
          recipient_email: recipientEmail,
          student_name: studentName,
          book_title: bookTitle,
          last_error: emailResult.error,
          retry_count: 1,
        });
      }
    }
  }

  return summary;
}

/**
 * Fetches recent reminder logs for administrative monitoring.
 */
export async function getReminderLogs(
  supabaseAdmin: SupabaseClient,
  limit: number = 50
): Promise<BookReturnReminder[]> {
  const { data, error } = await supabaseAdmin
    .from('book_return_reminders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[ReminderEngine] Error fetching reminder logs:', error);
    return [];
  }

  return (data as BookReturnReminder[]) || [];
}

/**
 * Fetches the reminder status for a specific issue record (used for student dashboard).
 */
export async function getReminderStatusForIssue(
  supabaseAdmin: SupabaseClient,
  issueId: string
): Promise<BookReturnReminder | null> {
  const { data, error } = await supabaseAdmin
    .from('book_return_reminders')
    .select('*')
    .eq('issue_id', issueId)
    .maybeSingle<BookReturnReminder>();

  if (error) {
    return null;
  }

  return data;
}
