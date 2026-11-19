/**
 * Dispur College - Department of Professional Studies Digital Library
 * Supabase Edge Function: Automated Book Return Reminders
 *
 * Designed for Deno runtime in Supabase Edge Functions.
 * Triggered periodically via Supabase Cron (pg_cron + pg_net) or authenticated HTTP.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
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

serve(async (req: Request) => {
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
        .eq('reminder_type', 'due_soon_24h')
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
          subject: 'Important: Your Library Book Return Deadline Is Approaching',
          html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <div style="background-color: #1e3a8a; color: white; padding: 20px; text-align: center; border-radius: 6px;">
              <h2 style="margin: 0;">Dispur College Digital Library</h2>
              <p style="margin: 5px 0 0; font-size: 13px;">Department of Professional Studies</p>
            </div>
            <div style="padding: 20px 10px;">
              <p>Dear <strong>${studentName}</strong>,</p>
              <p>This is a 24-hour advance notice that your borrowed library book return deadline is approaching.</p>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 6px; margin: 15px 0;">
                <p style="margin: 4px 0;"><strong>Book Title:</strong> ${bookTitle}</p>
                <p style="margin: 4px 0;"><strong>Issue Date:</strong> ${formattedIssueDate}</p>
                <p style="margin: 4px 0; color: #dc2626;"><strong>Return Deadline:</strong> ${formattedDueDate}</p>
                <p style="margin: 4px 0;"><strong>Overdue Fine:</strong> &#8377;${finePerDay.toFixed(2)}/day after deadline</p>
              </div>
              <p>Please return the book to the library counter before the deadline to avoid late fines.</p>
              <p><a href="${siteUrl}/dashboard" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">View Dashboard</a></p>
            </div>
            <div style="font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center;">
              Dispur College Library &bull; Ganeshguri, Guwahati - 781006, Assam
            </div>
          </div>`,
          text: `Dispur College Digital Library\nImportant: Book Return Deadline Approaching\n\nDear ${studentName},\n\nYour borrowed book "${bookTitle}" is due for return on ${formattedDueDate}.\nPlease return the book to the library counter on or before the due date.\n\nDispur College Library, Guwahati, Assam`,
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
            })
            .eq('id', existing.id);
        } else {
          await supabase.from('book_return_reminders').insert({
            issue_id: issue.id,
            student_id: issue.student_id,
            book_id: issue.book_id,
            due_date: issue.due_date,
            reminder_type: 'due_soon_24h',
            status: 'sent',
            recipient_email: studentEmail,
            student_name: studentName,
            book_title: bookTitle,
            email_id: emailId,
            sent_at: new Date().toISOString(),
            retry_count: 0,
          });
        }
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

        if (existing) {
          await supabase
            .from('book_return_reminders')
            .update({
              status: 'failed',
              last_error: emailError,
              retry_count: existing.retry_count + 1,
            })
            .eq('id', existing.id);
        } else {
          await supabase.from('book_return_reminders').insert({
            issue_id: issue.id,
            student_id: issue.student_id,
            book_id: issue.book_id,
            due_date: issue.due_date,
            reminder_type: 'due_soon_24h',
            status: 'failed',
            recipient_email: studentEmail,
            student_name: studentName,
            book_title: bookTitle,
            last_error: emailError,
            retry_count: 1,
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
