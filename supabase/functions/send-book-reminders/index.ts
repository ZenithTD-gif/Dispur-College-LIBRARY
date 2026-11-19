/**
 * Dispur College - Department of Professional Studies Digital Library
 * Supabase Edge Function: Automated Book Return Reminders
 *
 * Designed for Deno runtime in Supabase Edge Functions.
 * Triggered periodically via Supabase Cron (pg_cron + pg_net) or authenticated HTTP.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

function formatToKolkata(dateStr: string, includeTime = true): string {
  try {
    const d = new Date(dateStr);
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

    // Verify Authorization (CRON_SECRET or Service Role Key)
    const authHeader = req.headers.get('Authorization') || '';
    const providedToken = authHeader.replace(/^Bearer\s+/i, '').trim();

    const isAuthorized =
      !cronSecret ||
      providedToken === cronSecret ||
      providedToken === serviceRoleKey;

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid cron or bearer token' }),
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
    const now = new Date();

    console.log(`[send-book-reminders] Starting scan at ${now.toISOString()}...`);

    // 1. Fetch active issues
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
      console.error('[send-book-reminders] Query error:', issuesErr);
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

      // Fetch student details
      let studentEmail = '';
      let studentName = 'Student';

      const { data: student } = await supabase
        .from('students')
        .select('full_name, email')
        .eq('id', issue.student_id)
        .maybeSingle();

      if (student?.email) {
        studentEmail = student.email;
        studentName = student.full_name || studentName;
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', issue.student_id)
          .maybeSingle();
        if (profile?.email) {
          studentEmail = profile.email;
          studentName = profile.full_name || studentName;
        }
      }

      if (!studentEmail) {
        failedCount++;
        results.push({
          issueId: issue.id,
          studentName,
          recipientEmail: 'none',
          bookTitle,
          dueDate: issue.due_date,
          status: 'failed',
          error: 'Missing student email address',
        });
        continue;
      }

      // Send email via Resend
      const formattedIssueDate = formatToKolkata(issue.issue_date, false);
      const formattedDueDate = formatToKolkata(issue.due_date, true);
      const finePerDay = Number(issue.fine_per_day) || 5.0;

      let emailId: string | null = null;
      let emailSuccess = false;
      let emailError: string | null = null;

      if (!resendApiKey) {
        console.warn(`[send-book-reminders] RESEND_API_KEY missing. Simulating send to ${studentEmail}`);
        emailSuccess = true;
        emailId = `sim_edge_${Date.now()}`;
      } else {
        const emailPayload = {
          from: fromEmail,
          to: studentEmail,
          subject: 'Reminder: Your Library Book Return Deadline Is Tomorrow',
          html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Book Return Deadline Reminder</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div style="width: 100%; background-color: #f1f5f9; padding: 32px 16px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
      <div style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); color: #ffffff; padding: 28px 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 700; text-transform: uppercase;">Dispur College</h1>
        <p style="margin: 6px 0 0; font-size: 13px; color: #93c5fd;">Department of Professional Studies &bull; Digital Library</p>
      </div>
      <div style="background-color: #fef3c7; border-bottom: 2px solid #f59e0b; padding: 10px 24px; text-align: center; font-size: 13px; font-weight: 600; color: #92400e;">
        &bull; 24-Hour Return Warning: Deadline Tomorrow &bull;
      </div>
      <div style="padding: 28px 24px;">
        <p style="font-size: 15px; font-weight: 600; margin: 0 0 12px;">Dear ${studentName},</p>
        <p style="font-size: 14px; color: #334155; margin: 0 0 16px;">
          This is an important reminder from the Dispur College Department Library.<br>
          Your book return deadline is approaching.
        </p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 4px; font-size: 13px; color: #64748b; font-weight: 500; width: 36%;">Book Title:</td>
              <td style="padding: 6px 4px; font-size: 13px; color: #0f172a; font-weight: 600;">${bookTitle}</td>
            </tr>
            <tr>
              <td style="padding: 6px 4px; font-size: 13px; color: #64748b; font-weight: 500;">Book ID:</td>
              <td style="padding: 6px 4px; font-size: 13px; color: #0f172a; font-weight: 600; font-family: monospace;">${issue.book_id}</td>
            </tr>
            <tr>
              <td style="padding: 6px 4px; font-size: 13px; color: #64748b; font-weight: 500;">Issue Date:</td>
              <td style="padding: 6px 4px; font-size: 13px; color: #0f172a; font-weight: 600;">${formattedIssueDate}</td>
            </tr>
            <tr>
              <td style="padding: 6px 4px; font-size: 13px; color: #64748b; font-weight: 500;">Return Deadline:</td>
              <td style="padding: 6px 4px; font-size: 13px; color: #b91c1c; font-weight: 700;">${formattedDueDate}</td>
            </tr>
          </table>
        </div>
        <p style="font-size: 13px; color: #475569; margin: 0 0 16px; line-height: 1.5;">
          Please submit your book to the Department Library within the next 24 hours.<br>
          Failure to return the book within the permitted deadline may result in a fine according to the existing department library rules.
        </p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${siteUrl}/student/dashboard" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 13px; font-weight: 600; text-decoration: none; padding: 10px 24px; border-radius: 6px;">View Loan in Dashboard</a>
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
</html>`,
          text: `Dear ${studentName},\n\nThis is an important reminder from the Dispur College Department Library.\n\nYour book return deadline is approaching.\n\nBook Details:\n\n* Book Title: ${bookTitle}\n* Book ID: ${issue.book_id}\n* Issue Date: ${formattedIssueDate}\n* Return Deadline: ${formattedDueDate}\n\nPlease submit your book to the Department Library within the next 24 hours.\n\nFailure to return the book within the permitted deadline may result in a fine according to the existing department library rules.\n\nThank you.\n\nDepartment Library\nDispur College\n`,
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

        if (existing) {
          await supabase
            .from('book_return_reminders')
            .update({
              status: 'sent',
              email_id: emailId,
              sent_at: new Date().toISOString(),
              last_error: null,
              retry_count: existing.retry_count + 1,
              metadata: { provider: 'resend', isSandboxRestricted: false },
            })
            .eq('id', existing.id);
        } else {
          await supabase.from('book_return_reminders').insert({
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
            retry_count: 0,
            metadata: { provider: 'resend', isSandboxRestricted: false },
          });
        }
      } else {
        failedCount++;
        const isSandboxRestricted =
          Boolean(emailError?.includes('testing emails to your own email address')) ||
          Boolean(emailError?.includes('validation_error'));

        results.push({
          issueId: issue.id,
          studentName,
          recipientEmail: studentEmail,
          bookTitle,
          dueDate: issue.due_date,
          status: 'failed',
          error: emailError,
        });

        if (existing) {
          await supabase
            .from('book_return_reminders')
            .update({
              status: 'failed',
              last_error: emailError,
              retry_count: existing.retry_count + 1,
              metadata: { provider: 'resend', isSandboxRestricted },
            })
            .eq('id', existing.id);
        } else {
          await supabase.from('book_return_reminders').insert({
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
            retry_count: 1,
            metadata: { provider: 'resend', isSandboxRestricted },
          });
        }
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
