/**
 * Dispur College - Department of Professional Studies Digital Library
 * Email Notification Service (Powered by Resend Email API)
 *
 * Implements:
 * 1. System A: Automatic Book Issue Confirmation Email
 * 2. System B: Automatic 24-Hour Return Warning Email
 *
 * Strictly formats all dates and timestamps in Asia/Kolkata (IST: UTC+05:30).
 */

import { Resend } from 'resend';

export interface SendIssueConfirmationParams {
  recipientEmail: string;
  studentName: string;
  bookTitle: string;
  bookId: string;
  issueId: string;
  studentId?: string;
  issueDate: string | Date;
  dueDate: string | Date;
}

export interface SendReturnWarningParams {
  recipientEmail: string;
  studentName: string;
  bookTitle: string;
  bookId: string;
  issueId: string;
  issueDate: string | Date;
  dueDate: string | Date;
  finePerDay?: number;
}

// Backward-compatible alias
export type SendReminderEmailParams = SendReturnWarningParams;

export interface SendEmailResult {
  success: boolean;
  emailId?: string | null;
  error?: string | null;
  skipped?: boolean;
  provider: 'resend' | 'simulation';
  isSandboxRestricted?: boolean;
}

export type SendReminderEmailResult = SendEmailResult;

/**
 * Format date in Asia/Kolkata timezone (IST: UTC+05:30).
 */
export function formatToKolkataDateTime(
  dateInput: string | Date,
  includeTime: boolean = true
): string {
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) {
      return String(dateInput);
    }

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

    const formatted = new Intl.DateTimeFormat('en-IN', options).format(date);
    return includeTime ? `${formatted} IST` : formatted;
  } catch (err) {
    console.error('[EmailService] Timezone formatting error:', err);
    return String(dateInput);
  }
}

// ============================================================================
// SYSTEM A: BOOK ISSUE CONFIRMATION TEMPLATES
// ============================================================================

export function generateIssueConfirmationPlainText(params: {
  studentName: string;
  bookTitle: string;
  bookId: string;
  issueDate: string;
  dueDate: string;
}): string {
  const { studentName, bookTitle, bookId, issueDate, dueDate } = params;

  return `Dear ${studentName},

Congratulations!

Your book has been successfully issued from the Dispur College Department Library.

Book Details:

* Student Name: ${studentName}
* Book Title: ${bookTitle}
* Book ID: ${bookId}
* Issue Date: ${issueDate}
* Return Deadline: ${dueDate}
* Status: Successfully Issued

Please return your book on or before the specified deadline.

Late returns may attract a fine according to the existing department library rules.

Regards,
Department Library
Dispur College
`;
}

export function generateIssueConfirmationHtml(params: {
  studentName: string;
  bookTitle: string;
  bookId: string;
  issueDate: string;
  dueDate: string;
  portalUrl: string;
}): string {
  const { studentName, bookTitle, bookId, issueDate, dueDate, portalUrl } = params;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Book Issued Successfully</title>
  <style>
    body {
      margin: 0; padding: 0; background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
    }
    .wrapper { width: 100%; background-color: #f1f5f9; padding: 32px 16px; }
    .container {
      max-width: 600px; margin: 0 auto; background-color: #ffffff;
      border-radius: 12px; overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
      color: #ffffff; padding: 28px 24px; text-align: center;
    }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .header p { margin: 6px 0 0; font-size: 13px; color: #93c5fd; }
    .badge {
      background-color: #ecfdf5; border-bottom: 2px solid #10b981;
      padding: 10px 24px; text-align: center; font-size: 13px; font-weight: 600; color: #047857;
    }
    .content { padding: 28px 24px; }
    .details-box {
      background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
      padding: 18px; margin: 20px 0;
    }
    .details-table { width: 100%; border-collapse: collapse; }
    .details-table td { padding: 6px 4px; font-size: 13px; vertical-align: top; }
    .details-table .label { color: #64748b; font-weight: 500; width: 36%; }
    .details-table .value { color: #0f172a; font-weight: 600; }
    .btn {
      display: inline-block; background-color: #2563eb; color: #ffffff !important;
      font-size: 13px; font-weight: 600; text-decoration: none; padding: 10px 24px;
      border-radius: 6px; margin: 16px 0 8px;
    }
    .footer {
      background-color: #f8fafc; border-top: 1px solid #e2e8f0;
      padding: 20px; text-align: center; font-size: 12px; color: #64748b;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>Dispur College</h1>
        <p>Department of Professional Studies &bull; Digital Library</p>
      </div>
      <div class="badge">
        &check; Book Issued Successfully
      </div>
      <div class="content">
        <p style="font-size: 15px; font-weight: 600; margin: 0 0 12px;">Dear ${studentName},</p>
        <p style="font-size: 14px; color: #334155; margin: 0 0 16px;">
          Congratulations!<br>
          Your book has been successfully issued from the Dispur College Department Library.
        </p>

        <div class="details-box">
          <table class="details-table">
            <tr>
              <td class="label">Student Name:</td>
              <td class="value">${studentName}</td>
            </tr>
            <tr>
              <td class="label">Book Title:</td>
              <td class="value">${bookTitle}</td>
            </tr>
            <tr>
              <td class="label">Book ID:</td>
              <td class="value" style="font-family: monospace;">${bookId}</td>
            </tr>
            <tr>
              <td class="label">Issue Date:</td>
              <td class="value">${issueDate}</td>
            </tr>
            <tr>
              <td class="label">Return Deadline:</td>
              <td class="value" style="color: #b91c1c;">${dueDate}</td>
            </tr>
            <tr>
              <td class="label">Status:</td>
              <td class="value" style="color: #047857;">Successfully Issued</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 13px; color: #475569; margin: 0 0 16px; line-height: 1.5;">
          Please return your book on or before the specified deadline.<br>
          Late returns may attract a fine according to the existing department library rules.
        </p>

        <div style="text-align: center; margin: 20px 0;">
          <a href="${portalUrl}" class="btn">View in Student Dashboard</a>
        </div>

        <p style="font-size: 13px; color: #334155; margin: 24px 0 0;">
          Regards,<br>
          <strong>Department Library</strong><br>
          Dispur College
        </p>
      </div>
      <div class="footer">
        Dispur College Digital Library &bull; Ganeshguri, Guwahati - 781006, Assam
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ============================================================================
// SYSTEM B: 24-HOUR RETURN WARNING TEMPLATES
// ============================================================================

export function generateReturnWarningPlainText(params: {
  studentName: string;
  bookTitle: string;
  bookId: string;
  issueDate: string;
  dueDate: string;
}): string {
  const { studentName, bookTitle, bookId, issueDate, dueDate } = params;

  return `Dear ${studentName},

This is an important reminder from the Dispur College Department Library.

Your book return deadline is approaching.

Book Details:

* Book Title: ${bookTitle}
* Book ID: ${bookId}
* Issue Date: ${issueDate}
* Return Deadline: ${dueDate}

Please submit your book to the Department Library within the next 24 hours.

Failure to return the book within the permitted deadline may result in a fine according to the existing department library rules.

Thank you.

Department Library
Dispur College
`;
}

export function generateReturnWarningHtml(params: {
  studentName: string;
  bookTitle: string;
  bookId: string;
  issueDate: string;
  dueDate: string;
  portalUrl: string;
}): string {
  const { studentName, bookTitle, bookId, issueDate, dueDate, portalUrl } = params;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Book Return Deadline Reminder</title>
  <style>
    body {
      margin: 0; padding: 0; background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
    }
    .wrapper { width: 100%; background-color: #f1f5f9; padding: 32px 16px; }
    .container {
      max-width: 600px; margin: 0 auto; background-color: #ffffff;
      border-radius: 12px; overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
      color: #ffffff; padding: 28px 24px; text-align: center;
    }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .header p { margin: 6px 0 0; font-size: 13px; color: #93c5fd; }
    .banner {
      background-color: #fef3c7; border-bottom: 2px solid #f59e0b;
      padding: 10px 24px; text-align: center; font-size: 13px; font-weight: 600; color: #92400e;
    }
    .content { padding: 28px 24px; }
    .details-box {
      background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
      padding: 18px; margin: 20px 0;
    }
    .details-table { width: 100%; border-collapse: collapse; }
    .details-table td { padding: 6px 4px; font-size: 13px; vertical-align: top; }
    .details-table .label { color: #64748b; font-weight: 500; width: 36%; }
    .details-table .value { color: #0f172a; font-weight: 600; }
    .btn {
      display: inline-block; background-color: #2563eb; color: #ffffff !important;
      font-size: 13px; font-weight: 600; text-decoration: none; padding: 10px 24px;
      border-radius: 6px; margin: 16px 0 8px;
    }
    .footer {
      background-color: #f8fafc; border-top: 1px solid #e2e8f0;
      padding: 20px; text-align: center; font-size: 12px; color: #64748b;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>Dispur College</h1>
        <p>Department of Professional Studies &bull; Digital Library</p>
      </div>
      <div class="banner">
        &bull; 24-Hour Return Warning: Deadline Tomorrow &bull;
      </div>
      <div class="content">
        <p style="font-size: 15px; font-weight: 600; margin: 0 0 12px;">Dear ${studentName},</p>
        <p style="font-size: 14px; color: #334155; margin: 0 0 16px;">
          This is an important reminder from the Dispur College Department Library.<br>
          Your book return deadline is approaching.
        </p>

        <div class="details-box">
          <table class="details-table">
            <tr>
              <td class="label">Book Title:</td>
              <td class="value">${bookTitle}</td>
            </tr>
            <tr>
              <td class="label">Book ID:</td>
              <td class="value" style="font-family: monospace;">${bookId}</td>
            </tr>
            <tr>
              <td class="label">Issue Date:</td>
              <td class="value">${issueDate}</td>
            </tr>
            <tr>
              <td class="label">Return Deadline:</td>
              <td class="value" style="color: #b91c1c; font-weight: 700;">${dueDate}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 13px; color: #475569; margin: 0 0 16px; line-height: 1.5;">
          Please submit your book to the Department Library within the next 24 hours.<br>
          Failure to return the book within the permitted deadline may result in a fine according to the existing department library rules.
        </p>

        <div style="text-align: center; margin: 20px 0;">
          <a href="${portalUrl}" class="btn">View Loan in Dashboard</a>
        </div>

        <p style="font-size: 13px; color: #334155; margin: 24px 0 0;">
          Thank you.<br><br>
          <strong>Department Library</strong><br>
          Dispur College
        </p>
      </div>
      <div class="footer">
        Dispur College Digital Library &bull; Ganeshguri, Guwahati - 781006, Assam
      </div>
    </div>
  </div>
</body>
</html>`;
}

// Backward compatible aliases for existing tests
export const generateReminderEmailHtml = (params: {
  studentName: string;
  bookTitle: string;
  issueId: string;
  bookId?: string;
  formattedIssueDate: string;
  formattedDueDate: string;
  finePerDay: number;
  portalUrl: string;
}) =>
  generateReturnWarningHtml({
    studentName: params.studentName,
    bookTitle: params.bookTitle,
    bookId: params.bookId || params.issueId,
    issueDate: params.formattedIssueDate,
    dueDate: params.formattedDueDate,
    portalUrl: params.portalUrl,
  });

export const generateReminderEmailPlainText = (params: {
  studentName: string;
  bookTitle: string;
  issueId: string;
  bookId?: string;
  formattedIssueDate: string;
  formattedDueDate: string;
  finePerDay: number;
  portalUrl: string;
}) =>
  generateReturnWarningPlainText({
    studentName: params.studentName,
    bookTitle: params.bookTitle,
    bookId: params.bookId || params.issueId,
    issueDate: params.formattedIssueDate,
    dueDate: params.formattedDueDate,
  });

// ============================================================================
// CORE DISPATCHER ENGINE
// ============================================================================

async function dispatchEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    'Dispur College Library <onboarding@resend.dev>';

  if (!apiKey) {
    console.warn(
      `[EmailService] RESEND_API_KEY not configured. Simulating delivery to: ${params.to}`
    );
    return {
      success: true,
      emailId: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      skipped: true,
      provider: 'simulation',
    };
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    if (error) {
      console.error('[EmailService] Resend API error:', error);
      const isSandboxRestricted =
        error.message?.includes('testing emails to your own email address') ||
        error.name === 'validation_error';

      return {
        success: false,
        error: error.message || 'Resend API dispatch failed',
        provider: 'resend',
        isSandboxRestricted,
      };
    }

    return {
      success: true,
      emailId: data?.id || null,
      provider: 'resend',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[EmailService] Exception dispatching email:', message);
    return {
      success: false,
      error: message,
      provider: 'resend',
    };
  }
}

/**
 * SYSTEM A: Dispatches immediate Book Issue Confirmation Email.
 * Attempts Supabase Edge Function execution first; seamlessly falls back
 * to direct server-side Resend SDK dispatch if Edge Function is not yet deployed.
 */
export async function sendBookIssueConfirmationEmail(
  params: SendIssueConfirmationParams
): Promise<SendEmailResult> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://localhost:3000';
  const portalUrl = `${siteUrl.replace(/\/+$/, '')}/student/dashboard`;

  const issueDateFormatted = formatToKolkataDateTime(params.issueDate, false);
  const dueDateFormatted = formatToKolkataDateTime(params.dueDate, true);

  // 1. Attempt invocation via Supabase Edge Function (send-book-reminders)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceKey) {
    try {
      const edgeUrl = `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/send-book-reminders`;
      const edgeRes = await fetch(edgeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          action: 'confirm_issue',
          issueId: params.issueId,
          studentId: params.studentId,
          bookId: params.bookId,
          recipientEmail: params.recipientEmail,
          studentName: params.studentName,
          bookTitle: params.bookTitle,
          issueDate: params.issueDate,
          dueDate: params.dueDate,
        }),
      });

      if (edgeRes.ok) {
        const edgeData = await edgeRes.json();
        if (edgeData.success) {
          return {
            success: true,
            emailId: edgeData.emailId,
            provider: 'resend',
          };
        }
      }
    } catch {
      // Non-blocking fallback to direct server dispatch
    }
  }

  // 2. Direct server-side Resend SDK dispatch fallback
  const subject = 'Book Issued Successfully – Dispur College Department Library';

  const text = generateIssueConfirmationPlainText({
    studentName: params.studentName,
    bookTitle: params.bookTitle,
    bookId: params.bookId,
    issueDate: issueDateFormatted,
    dueDate: dueDateFormatted,
  });

  const html = generateIssueConfirmationHtml({
    studentName: params.studentName,
    bookTitle: params.bookTitle,
    bookId: params.bookId,
    issueDate: issueDateFormatted,
    dueDate: dueDateFormatted,
    portalUrl,
  });

  return dispatchEmail({
    to: params.recipientEmail,
    subject,
    html,
    text,
  });
}

/**
 * SYSTEM B: Dispatches 24-Hour Return Warning Email.
 */
export async function sendBookReturnWarningEmail(
  params: SendReturnWarningParams
): Promise<SendEmailResult> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://localhost:3000';
  const portalUrl = `${siteUrl.replace(/\/+$/, '')}/student/dashboard`;

  const issueDateFormatted = formatToKolkataDateTime(params.issueDate, false);
  const dueDateFormatted = formatToKolkataDateTime(params.dueDate, true);

  const subject = 'Reminder: Your Library Book Return Deadline Is Tomorrow';

  const text = generateReturnWarningPlainText({
    studentName: params.studentName,
    bookTitle: params.bookTitle,
    bookId: params.bookId,
    issueDate: issueDateFormatted,
    dueDate: dueDateFormatted,
  });

  const html = generateReturnWarningHtml({
    studentName: params.studentName,
    bookTitle: params.bookTitle,
    bookId: params.bookId,
    issueDate: issueDateFormatted,
    dueDate: dueDateFormatted,
    portalUrl,
  });

  return dispatchEmail({
    to: params.recipientEmail,
    subject,
    html,
    text,
  });
}

// Backward-compatible alias
export const sendBookReturnReminderEmail = sendBookReturnWarningEmail;
