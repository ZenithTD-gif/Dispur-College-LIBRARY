/**
 * Dispur College - Department of Professional Studies Digital Library
 * Email Notification Service (Powered by Resend Email API)
 *
 * Strictly formats all dates and timestamps in Asia/Kolkata (IST: UTC+05:30).
 */

import { Resend } from 'resend';

export interface SendReminderEmailParams {
  recipientEmail: string;
  studentName: string;
  bookTitle: string;
  issueId: string;
  bookId?: string;
  issueDate: string | Date;
  dueDate: string | Date;
  finePerDay?: number;
  department?: string;
}

export interface SendReminderEmailResult {
  success: boolean;
  emailId?: string | null;
  error?: string | null;
  skipped?: boolean;
  provider: 'resend' | 'simulation';
}

/**
 * Format date in Asia/Kolkata timezone with human-readable formatting.
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

/**
 * Generates responsive, institutional HTML email for book return reminders.
 */
export function generateReminderEmailHtml(params: {
  studentName: string;
  bookTitle: string;
  issueId: string;
  bookId?: string;
  formattedIssueDate: string;
  formattedDueDate: string;
  finePerDay: number;
  portalUrl: string;
}): string {
  const {
    studentName,
    bookTitle,
    issueId,
    formattedIssueDate,
    formattedDueDate,
    finePerDay,
    portalUrl,
  } = params;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Library Book Return Reminder</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f1f5f9;
      padding: 32px 16px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
      color: #ffffff;
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .header p {
      margin: 8px 0 0;
      font-size: 13px;
      color: #93c5fd;
      letter-spacing: 0.3px;
    }
    .banner {
      background-color: #fef3c7;
      border-bottom: 2px solid #f59e0b;
      padding: 12px 24px;
      text-align: center;
      font-size: 14px;
      font-weight: 600;
      color: #92400e;
    }
    .content {
      padding: 32px 28px;
    }
    .greeting {
      font-size: 16px;
      font-weight: 600;
      color: #0f172a;
      margin: 0 0 16px;
    }
    .paragraph {
      font-size: 14px;
      line-height: 1.6;
      color: #475569;
      margin: 0 0 20px;
    }
    .details-card {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      margin: 24px 0;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
    }
    .details-table td {
      padding: 8px 4px;
      font-size: 14px;
      vertical-align: top;
    }
    .details-table .label {
      color: #64748b;
      font-weight: 500;
      width: 38%;
    }
    .details-table .value {
      color: #0f172a;
      font-weight: 600;
    }
    .highlight-due {
      color: #dc2626 !important;
      font-weight: 700 !important;
    }
    .instructions-box {
      background-color: #eff6ff;
      border-left: 4px solid #3b82f6;
      border-radius: 0 8px 8px 0;
      padding: 14px 18px;
      margin: 24px 0;
      font-size: 13px;
      line-height: 1.6;
      color: #1e40af;
    }
    .cta-container {
      text-align: center;
      margin: 32px 0 16px;
    }
    .cta-button {
      display: inline-block;
      background-color: #2563eb;
      color: #ffffff !important;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      padding: 12px 28px;
      border-radius: 6px;
      box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
    }
    .footer {
      background-color: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 24px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      line-height: 1.6;
    }
    .footer a {
      color: #2563eb;
      text-decoration: none;
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
        &bull; 24-Hour Return Deadline Notice &bull;
      </div>

      <div class="content">
        <p class="greeting">Dear ${studentName},</p>
        <p class="paragraph">
          This is an automated reminder from the Dispur College Digital Library. According to our borrowing records, you have an issued book whose return deadline is approaching within the next <strong>24 hours</strong>.
        </p>

        <div class="details-card">
          <table class="details-table">
            <tr>
              <td class="label">Book Title:</td>
              <td class="value">${bookTitle}</td>
            </tr>
            <tr>
              <td class="label">Issue Reference:</td>
              <td class="value" style="font-family: monospace; font-size: 13px;">${issueId.substring(0, 8)}...</td>
            </tr>
            <tr>
              <td class="label">Date of Issue:</td>
              <td class="value">${formattedIssueDate}</td>
            </tr>
            <tr>
              <td class="label">Return Due Date:</td>
              <td class="value highlight-due">${formattedDueDate}</td>
            </tr>
            <tr>
              <td class="label">Overdue Fine Rate:</td>
              <td class="value">&#8377;${finePerDay.toFixed(2)} / day after due date</td>
            </tr>
          </table>
        </div>

        <div class="instructions-box">
          <strong>Important Return Instructions:</strong><br>
          &bull; Please return or renew this book at the Department Library circulation desk before the deadline.<br>
          &bull; Ensure the book is returned in good condition without markings or tears.<br>
          &bull; Under library rules, a late return fee of &#8377;${finePerDay.toFixed(2)} per day is automatically applied starting the day after the due date.
        </div>

        <div class="cta-container">
          <a href="${portalUrl}" class="cta-button">View My Issued Books in Dashboard</a>
        </div>

        <p class="paragraph" style="margin-top: 24px; font-size: 13px; color: #64748b;">
          If you have already handed over the book to the library staff today, please allow a short time for our team to record the physical return in the system.
        </p>
      </div>

      <div class="footer">
        <p style="margin: 0 0 6px; font-weight: 600; color: #334155;">
          Dispur College Library Management System
        </p>
        <p style="margin: 0 0 6px;">
          Ganeshguri, Guwahati - 781006, Assam, India
        </p>
        <p style="margin: 0;">
          Need assistance? Contact us at <a href="mailto:library@dispurcollege.ac.in">library@dispurcollege.ac.in</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generates clean plain text fallback for accessibility and spam protection.
 */
export function generateReminderEmailPlainText(params: {
  studentName: string;
  bookTitle: string;
  issueId: string;
  formattedIssueDate: string;
  formattedDueDate: string;
  finePerDay: number;
  portalUrl: string;
}): string {
  const {
    studentName,
    bookTitle,
    issueId,
    formattedIssueDate,
    formattedDueDate,
    finePerDay,
    portalUrl,
  } = params;

  return `DISPUR COLLEGE - DIGITAL LIBRARY
DEPARTMENT OF PROFESSIONAL STUDIES
============================================================
BOOK RETURN DEADLINE REMINDER (24-HOUR NOTICE)
============================================================

Dear ${studentName},

This is an automated reminder that your issued library book is due for return within the next 24 hours.

LOAN DETAILS:
------------------------------------------------------------
Book Title:      ${bookTitle}
Issue Reference: ${issueId}
Issue Date:      ${formattedIssueDate}
Due Date:        ${formattedDueDate}
Late Fine Rate:  Rs. ${finePerDay.toFixed(2)} per day

RETURN INSTRUCTIONS:
------------------------------------------------------------
1. Please bring the book to the Department Library circulation counter on or before the due date.
2. Under library borrowing rules, overdue fines accrue automatically at Rs. ${finePerDay.toFixed(2)} per day after the due date.
3. If you have already returned this book today, please disregard this notice while our catalog status updates.

Access your library dashboard:
${portalUrl}

============================================================
Dispur College Library
Ganeshguri, Guwahati - 781006, Assam, India
Email: library@dispurcollege.ac.in
`;
}

/**
 * Dispatches an automated book return reminder email via Resend.
 * Gracefully logs and skips if RESEND_API_KEY is not configured.
 */
export async function sendBookReturnReminderEmail(
  params: SendReminderEmailParams
): Promise<SendReminderEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    'Dispur College Library <onboarding@resend.dev>';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://localhost:3000';
  const portalUrl = `${siteUrl.replace(/\/+$/, '')}/dashboard`;

  const formattedIssueDate = formatToKolkataDateTime(params.issueDate, false);
  const formattedDueDate = formatToKolkataDateTime(params.dueDate, true);
  const finePerDay = params.finePerDay ?? 5.0;

  const subject = 'Important: Your Library Book Return Deadline Is Approaching';

  // 1. Check if RESEND_API_KEY is present
  if (!apiKey) {
    console.warn(
      `[EmailService] RESEND_API_KEY not set. Simulating reminder email delivery to: ${params.recipientEmail}`
    );
    return {
      success: true,
      emailId: `sim_${Date.now()}_${params.issueId.substring(0, 8)}`,
      skipped: true,
      provider: 'simulation',
    };
  }

  // 2. Format HTML & Plaintext
  const html = generateReminderEmailHtml({
    studentName: params.studentName,
    bookTitle: params.bookTitle,
    issueId: params.issueId,
    bookId: params.bookId,
    formattedIssueDate,
    formattedDueDate,
    finePerDay,
    portalUrl,
  });

  const text = generateReminderEmailPlainText({
    studentName: params.studentName,
    bookTitle: params.bookTitle,
    issueId: params.issueId,
    formattedIssueDate,
    formattedDueDate,
    finePerDay,
    portalUrl,
  });

  // 3. Dispatch via Resend SDK
  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: params.recipientEmail,
      subject,
      html,
      text,
    });

    if (error) {
      console.error('[EmailService] Resend API error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email via Resend API',
        provider: 'resend',
      };
    }

    return {
      success: true,
      emailId: data?.id || null,
      provider: 'resend',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[EmailService] Exception while sending reminder email:', message);
    return {
      success: false,
      error: message,
      provider: 'resend',
    };
  }
}
