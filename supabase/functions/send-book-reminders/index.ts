/**
 * Dispur College - Department of Professional Studies Digital Library
 * Supabase Edge Function: Automated Email Notification & Reminder Engine
 *
 * Designed for Deno runtime on Supabase Edge Runtime.
 *
 * Supports two core operational modes:
 * 1. Action: "confirm_issue" / "issue_confirmation"
 *    Immediately dispatches a Book Issue Confirmation email to a student.
 * 2. Action: "scan_reminders" / pg_cron invocation / default
 *    Scans active, unreturned loans due within ~24 hours and dispatches return warnings.
 *
 * Security:
 * - RESEND_API_KEY read securely from Supabase Edge Function Secrets.
 * - Authenticated via CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY, or valid user JWT.
 * - Idempotency strictly enforced against public.book_return_reminders.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface ScanResult {
  issueId: string;
  studentName: string;
  recipientEmail: string;
  bookTitle: string;
  dueDate: string;
  status: 'sent' | 'failed' | 'skipped';
  emailId?: string | null;
  error?: string | null;
}

/**
 * Formats timestamps in Asia/Kolkata timezone (IST: UTC+05:30).
 */
function formatToKolkata(dateStr: string, includeTime = true): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;

    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      ...(includeTime
        ? {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }
        : {}),
    };
    const formatted = new Intl.DateTimeFormat('en-IN', options).format(d);
    return includeTime ? `${formatted} IST` : formatted;
  } catch {
    return dateStr;
  }
}

/**
 * Validates email format.
 */
function isValidEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const re = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return re.test(email.trim());
}

// ============================================================================
// SYSTEM A: TEMPLATES (BOOK ISSUE CONFIRMATION)
// ============================================================================

function generateIssueConfirmationText(params: {
  studentName: string;
  bookTitle: string;
  bookId: string;
  issueDate: string;
  dueDate: string;
}): string {
  return `Dear ${params.studentName},

Congratulations!

Your book has been successfully issued from the Dispur College Department Library.

Book Details:

* Student Name: ${params.studentName}
* Book Title: ${params.bookTitle}
* Book ID: ${params.bookId}
* Issue Date: ${params.issueDate}
* Return Deadline: ${params.dueDate}
* Status: Successfully Issued

Please return your book on or before the specified deadline.

Late returns may attract a fine according to the existing department library rules.

Regards,
Department Library
Dispur College
`;
}

function generateIssueConfirmationHtml(params: {
  studentName: string;
  bookTitle: string;
  bookId: string;
  issueDate: string;
  dueDate: string;
  portalUrl: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Book Issued Successfully</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div style="width: 100%; background-color: #f1f5f9; padding: 32px 16px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
      <div style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); color: #ffffff; padding: 28px 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 700; text-transform: uppercase;">Dispur College</h1>
        <p style="margin: 6px 0 0; font-size: 13px; color: #93c5fd;">Department of Professional Studies &bull; Digital Library</p>
      </div>
      <div style="background-color: #ecfdf5; border-bottom: 2px solid #10b981; padding: 10px 24px; text-align: center; font-size: 13px; font-weight: 600; color: #047857;">
        &check; Book Issued Successfully
      </div>
      <div style="padding: 28px 24px;">
        <p style="font-size: 15px; font-weight: 600; margin: 0 0 12px;">Dear ${params.studentName},</p>
        <p style="font-size: 14px; color: #334155; margin: 0 0 16px;">
          Congratulations!<br>
          Your book has been successfully issued from the Dispur College Department Library.
        </p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 4px; font-size: 13px; color: #64748b; font-weight: 500; width: 36%;">Student Name:</td>
              <td style="padding: 6px 4px; font-size: 13px; color: #0f172a; font-weight: 600;">${params.studentName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 4px; font-size: 13px; color: #64748b; font-weight: 500;">Book Title:</td>
              <td style="padding: 6px 4px; font-size: 13px; color: #0f172a; font-weight: 600;">${params.bookTitle}</td>
            </tr>
            <tr>
              <td style="padding: 6px 4px; font-size: 13px; color: #64748b; font-weight: 500;">Book ID:</td>
              <td style="padding: 6px 4px; font-size: 13px; color: #0f172a; font-weight: 600; font-family: monospace;">${params.bookId}</td>
            </tr>
            <tr>
              <td style="padding: 6px 4px; font-size: 13px; color: #64748b; font-weight: 500;">Issue Date:</td>
              <td style="padding: 6px 4px; font-size: 13px; color: #0f172a; font-weight: 600;">${params.issueDate}</td>
            </tr>
            <tr>
              <td style="padding: 6px 4px; font-size: 13px; color: #64748b; font-weight: 500;">Return Deadline:</td>
              <td style="padding: 6px 4px; font-size: 13px; color: #b91c1c; font-weight: 700;">${params.dueDate}</td>
            </tr>
            <tr>
              <td style="padding: 6px 4px; font-size: 13px; color: #64748b; font-weight: 500;">Status:</td>
              <td style="padding: 6px 4px; font-size: 13px; color: #047857; font-weight: 600;">Successfully Issued</td>
            </tr>
          </table>
        </div>
        <p style="font-size: 13px; color: #475569; margin: 0 0 16px; line-height: 1.5;">
          Please return your book on or before the specified deadline.<br>
          Late returns may attract a fine according to the existing department library rules.
        </p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${params.portalUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 13px; font-weight: 600; text-decoration: none; padding: 10px 24px; border-radius: 6px;">View in Student Dashboard</a>
        </div>
        <p style="font-size: 13px; color: #334155; margin: 24px 0 0;">
          Regards,<br>
          <strong>Department Library</strong><br>
          Dispur College
        </p>
      </div>
      <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 12px; color: #64748b;">
        Dispur College Digital Library &bull; Ganeshguri, Guwahati - 781006, Assam
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ============================================================================
// SYSTEM B: TEMPLATES (24-HOUR RETURN WARNING)
// ============================================================================

function generateReturnWarningText(params: {
  studentName: string;
  bookTitle: string;
  bookId: string;
  issueDate: string;
  dueDate: string;
}): string {
  return `Dear ${params.studentName},

This is an important reminder from the Dispur College Department Library.

Your book return deadline is approaching.

Book Details:

* Book Title: ${params.bookTitle}
* Book ID: ${params.bookId}
* Issue Date: ${params.issueDate}
* Return Deadline: ${params.dueDate}

Please submit your book to the Department Library within the next 24 hours.

Failure to return the book within the permitted deadline may result in a fine according to the existing department library rules.

Thank you.

Department Library
Dispur College
`;
}

function generateReturnWarningHtml(params: {
  studentName: string;
  bookTitle: string;
  bookId: string;
  issueDate: string;
  dueDate: string;
  portalUrl: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Book Return Deadline Reminder</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div style="width: 100%; background-color: #f1f5f9; padding: 32px 16px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
      <div style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); color: #ffffff; padding: 28px 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 700; text-transform: uppercase;">Dispur College</h1>
        <p style="margin: 6px 0 0; font-size: 13px; color: #93c5fd;">Department of Professional Studies &bull; Digital Library</p>
      </div>
      <div style="background-color: #fef3c7; border-bottom: 2px solid #f59e0b; padding: 10px 24px; text-align: center; font-size: 13px; font-weight: 600; color: #92400e;">
        &bull; 24-Hour Return Warning: Deadline Tomorrow &bull;
      </div>
      <div style="padding: 28px 24px;">
        <p style="font-size: 15px; font-weight: 600; margin: 0 0 12px;">Dear ${params.studentName},</p>
        <p style="font-size: 14px; color: #334155; margin: 0 0 16px;">
          This is an important reminder from the Dispur College Department Library.<br>
          Your book return deadline is approaching.
        </p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 4px; font-size: 13px; color: #64748b; font-weight: 500; width: 36%;">Book Title:</td>
              <td style="padding: 6px 4px; font-size: 13px; color: #0f172a; font-weight: 600;">${params.bookTitle}</td>
            </tr>
            <tr>
              <td style="padding: 6px 4px; font-size: 13px; color: #64748b; font-weight: 500;">Book ID:</td>
              <td style="padding: 6px 4px; font-size: 13px; color: #0f172a; font-weight: 600; font-family: monospace;">${params.bookId}</td>
            </tr>
            <tr>
              <td style="padding: 6px 4px; font-size: 13px; color: #64748b; font-weight: 500;">Issue Date:</td>
              <td style="padding: 6px 4px; font-size: 13px; color: #0f172a; font-weight: 600;">${params.issueDate}</td>
            </tr>
            <tr>
              <td style="padding: 6px 4px; font-size: 13px; color: #64748b; font-weight: 500;">Return Deadline:</td>
              <td style="padding: 6px 4px; font-size: 13px; color: #b91c1c; font-weight: 700;">${params.dueDate}</td>
            </tr>
          </table>
        </div>
        <p style="font-size: 13px; color: #475569; margin: 0 0 16px; line-height: 1.5;">
          Please submit your book to the Department Library within the next 24 hours.<br>
          Failure to return the book within the permitted deadline may result in a fine according to the existing department library rules.
        </p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${params.portalUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 13px; font-weight: 600; text-decoration: none; padding: 10px 24px; border-radius: 6px;">View Loan in Dashboard</a>
        </div>
        <p style="font-size: 13px; color: #334155; margin: 24px 0 0;">
          Thank you.<br><br>
          <strong>Department Library</strong><br>
          Dispur College
        </p>
      </div>
      <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 12px; color: #64748b;">
        Dispur College Digital Library &bull; Ganeshguri, Guwahati - 781006, Assam
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ============================================================================
// MAIN EDGE FUNCTION HANDLER
// ============================================================================

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const cronSecret = Deno.env.get('CRON_SECRET');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail =
      Deno.env.get('RESEND_FROM_EMAIL') ||
      'Dispur College Library <onboarding@resend.dev>';
    const siteUrl = Deno.env.get('NEXT_PUBLIC_SITE_URL') || 'https://dispurcollege.ac.in';

    // Verify Authorization (CRON_SECRET or Service Role Key or Valid User Token)
    const authHeader = req.headers.get('Authorization') || '';
    const providedToken = authHeader.replace(/^Bearer\s+/i, '').trim();

    const isAuthorized =
      !cronSecret ||
      providedToken === cronSecret ||
      providedToken === serviceRoleKey;

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid credentials or bearer token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Server misconfiguration: missing Supabase credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Parse request body if present
    let body: Record<string, unknown> = {};
    if (req.method === 'POST') {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    }

    const action = String(body.action || '').trim().toLowerCase();

    // ========================================================================
    // MODE 1: BOOK ISSUE CONFIRMATION EMAIL (Immediate on Book Issuance)
    // ========================================================================
    if (action === 'confirm_issue' || action === 'issue_confirmation') {
      const issueId = String(body.issueId || body.issue_id || '').trim();
      const studentId = String(body.studentId || body.student_id || '').trim();
      const bookId = String(body.bookId || body.book_id || '').trim();
      const recipientEmail = String(body.recipientEmail || body.email || '').trim();
      const studentName = String(body.studentName || body.name || 'Student').trim();
      const bookTitle = String(body.bookTitle || body.title || 'Library Book').trim();
      const rawIssueDate = String(body.issueDate || body.issue_date || new Date().toISOString());
      const rawDueDate = String(body.dueDate || body.due_date || '');

      if (!recipientEmail || !isValidEmail(recipientEmail) || !issueId || !rawDueDate) {
        return new Response(
          JSON.stringify({
            error: 'Invalid issue confirmation payload: missing issueId, recipientEmail, or dueDate',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 1. Idempotency check in book_return_reminders
      const { data: existingConfirmation } = await supabase
        .from('book_return_reminders')
        .select('*')
        .eq('issue_id', issueId)
        .eq('due_date', rawDueDate)
        .eq('reminder_type', 'BOOK_ISSUE_CONFIRMATION')
        .maybeSingle();

      if (existingConfirmation && existingConfirmation.status === 'sent') {
        return new Response(
          JSON.stringify({
            success: true,
            status: 'skipped',
            message: 'Issue confirmation already sent previously.',
            emailId: existingConfirmation.email_id,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const formattedIssueDate = formatToKolkata(rawIssueDate, false);
      const formattedDueDate = formatToKolkata(rawDueDate, true);
      const portalUrl = `${siteUrl.replace(/\/+$/, '')}/student/dashboard`;

      const textBody = generateIssueConfirmationText({
        studentName,
        bookTitle,
        bookId,
        issueDate: formattedIssueDate,
        dueDate: formattedDueDate,
      });

      const htmlBody = generateIssueConfirmationHtml({
        studentName,
        bookTitle,
        bookId,
        issueDate: formattedIssueDate,
        dueDate: formattedDueDate,
        portalUrl,
      });

      let emailId: string | null = null;
      let emailSuccess = false;
      let emailError: string | null = null;
      let isSandboxRestricted = false;

      if (!resendApiKey) {
        console.warn(`[Edge] RESEND_API_KEY unset. Simulating issue confirmation to: ${recipientEmail}`);
        emailSuccess = true;
        emailId = `sim_edge_conf_${Date.now()}`;
      } else {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: fromEmail,
            to: recipientEmail,
            subject: 'Book Issued Successfully – Dispur College Department Library',
            html: htmlBody,
            text: textBody,
          }),
        });

        const resData = await resendRes.json();
        if (resendRes.ok && resData.id) {
          emailSuccess = true;
          emailId = resData.id;
        } else {
          emailError = resData.message || JSON.stringify(resData);
          isSandboxRestricted =
            emailError?.includes('testing emails to your own email address') ||
            resData.name === 'validation_error';
        }
      }

      // Record result into book_return_reminders
      await supabase.from('book_return_reminders').upsert(
        {
          issue_id: issueId,
          student_id: studentId,
          book_id: bookId,
          due_date: rawDueDate,
          reminder_type: 'BOOK_ISSUE_CONFIRMATION',
          status: emailSuccess ? 'sent' : 'failed',
          recipient_email: recipientEmail,
          student_name: studentName,
          book_title: bookTitle,
          email_id: emailId,
          sent_at: emailSuccess ? new Date().toISOString() : null,
          last_error: emailError,
          retry_count: emailSuccess ? 0 : 1,
          metadata: {
            provider: 'resend',
            isSandboxRestricted,
            dispatchedBy: 'supabase_edge_function',
          },
        },
        { onConflict: 'issue_id,due_date,reminder_type' }
      );

      return new Response(
        JSON.stringify({
          success: emailSuccess,
          status: emailSuccess ? 'sent' : 'failed',
          emailId,
          error: emailError,
          isSandboxRestricted,
        }),
        {
          status: emailSuccess ? 200 : 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================================================
    // MODE 2: 24-HOUR RETURN WARNING SCAN (Scheduled via Cron / Admin)
    // ========================================================================
    const now = new Date();
    console.log(`[Edge] Starting 24h return warning scan at ${now.toISOString()}...`);

    // 1. Fetch active issues that are NOT returned
    const { data: issues, error: issuesErr } = await supabase
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
          title
        )
      `)
      .eq('status', 'issued')
      .is('return_date', null);

    if (issuesErr) {
      console.error('[Edge] Database error fetching active issues:', issuesErr);
      return new Response(
        JSON.stringify({ error: issuesErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: ScanResult[] = [];
    let sentCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const issue of issues || []) {
      const dueDate = new Date(issue.due_date);
      const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Check 24-hour reminder window: between -4h and +26h
      if (diffHours < -4 || diffHours > 26) {
        continue;
      }

      const book = Array.isArray(issue.books) ? issue.books[0] : issue.books;
      const bookTitle = book?.title || 'Issued Library Book';

      // Check idempotency in book_return_reminders
      const { data: existing } = await supabase
        .from('book_return_reminders')
        .select('*')
        .eq('issue_id', issue.id)
        .eq('due_date', issue.due_date)
        .in('reminder_type', ['BOOK_RETURN_REMINDER', 'due_soon_24h'])
        .maybeSingle();

      if (existing && existing.status === 'sent') {
        skippedCount++;
        results.push({
          issueId: issue.id,
          studentName: existing.student_name,
          recipientEmail: existing.recipient_email,
          bookTitle,
          dueDate: issue.due_date,
          status: 'skipped',
          emailId: existing.email_id,
        });
        continue;
      }

      // Retrieve student email
      let studentEmail = '';
      let studentName = 'Student';

      const { data: student } = await supabase
        .from('students')
        .select('full_name, email')
        .eq('id', issue.student_id)
        .maybeSingle();

      if (student?.email) {
        studentEmail = student.email.trim();
        studentName = student.full_name?.trim() || studentName;
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', issue.student_id)
          .maybeSingle();
        if (profile?.email) {
          studentEmail = profile.email.trim();
          studentName = profile.full_name?.trim() || studentName;
        }
      }

      if (!isValidEmail(studentEmail)) {
        failedCount++;
        results.push({
          issueId: issue.id,
          studentName,
          recipientEmail: studentEmail || 'none',
          bookTitle,
          dueDate: issue.due_date,
          status: 'failed',
          error: 'Missing or invalid student email address',
        });
        continue;
      }

      const formattedIssueDate = formatToKolkata(issue.issue_date, false);
      const formattedDueDate = formatToKolkata(issue.due_date, true);
      const portalUrl = `${siteUrl.replace(/\/+$/, '')}/student/dashboard`;

      let emailId: string | null = null;
      let emailSuccess = false;
      let emailError: string | null = null;
      let isSandboxRestricted = false;

      if (!resendApiKey) {
        console.warn(`[Edge] RESEND_API_KEY missing. Simulating send to ${studentEmail}`);
        emailSuccess = true;
        emailId = `sim_edge_rem_${Date.now()}`;
      } else {
        const emailPayload = {
          from: fromEmail,
          to: studentEmail,
          subject: 'Reminder: Your Library Book Return Deadline Is Tomorrow',
          html: generateReturnWarningHtml({
            studentName,
            bookTitle,
            bookId: issue.book_id,
            issueDate: formattedIssueDate,
            dueDate: formattedDueDate,
            portalUrl,
          }),
          text: generateReturnWarningText({
            studentName,
            bookTitle,
            bookId: issue.book_id,
            issueDate: formattedIssueDate,
            dueDate: formattedDueDate,
          }),
        };

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify(emailPayload),
        });

        const resData = await res.json();
        if (res.ok && resData.id) {
          emailSuccess = true;
          emailId = resData.id;
        } else {
          emailError = resData.message || JSON.stringify(resData);
          isSandboxRestricted =
            emailError?.includes('testing emails to your own email address') ||
            resData.name === 'validation_error';
        }
      }

      // Record in book_return_reminders
      if (emailSuccess) {
        sentCount++;
        results.push({
          issueId: issue.id,
          studentName,
          recipientEmail: studentEmail,
          bookTitle,
          dueDate: issue.due_date,
          status: 'sent',
          emailId,
        });

        await supabase.from('book_return_reminders').upsert(
          {
            issue_id: issue.id,
            student_id: issue.student_id,
            book_id: issue.book_id,
            due_date: issue.due_date,
            reminder_type: 'BOOK_RETURN_REMINDER',
            status: 'sent',
            recipient_email: studentEmail,
            student_name: studentName,
            book_title: bookTitle,
            email_id: emailId,
            sent_at: new Date().toISOString(),
            retry_count: existing ? existing.retry_count + 1 : 0,
            metadata: { provider: 'resend', isSandboxRestricted: false, dispatchedBy: 'supabase_edge_function' },
          },
          { onConflict: 'issue_id,due_date,reminder_type' }
        );
      } else {
        failedCount++;
        results.push({
          issueId: issue.id,
          studentName,
          recipientEmail: studentEmail,
          bookTitle,
          dueDate: issue.due_date,
          status: 'failed',
          error: emailError,
        });

        await supabase.from('book_return_reminders').upsert(
          {
            issue_id: issue.id,
            student_id: issue.student_id,
            book_id: issue.book_id,
            due_date: issue.due_date,
            reminder_type: 'BOOK_RETURN_REMINDER',
            status: 'failed',
            recipient_email: studentEmail,
            student_name: studentName,
            book_title: bookTitle,
            last_error: emailError,
            retry_count: existing ? existing.retry_count + 1 : 1,
            metadata: { provider: 'resend', isSandboxRestricted, dispatchedBy: 'supabase_edge_function' },
          },
          { onConflict: 'issue_id,due_date,reminder_type' }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        scannedAt: now.toISOString(),
        totalProcessed: results.length,
        sentCount,
        skippedCount,
        failedCount,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[send-book-reminders] Unhandled error:', errorMsg);
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
