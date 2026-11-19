import { describe, expect, it, vi } from 'vitest';
import {
  formatToKolkataDateTime,
  generateIssueConfirmationHtml,
  generateIssueConfirmationPlainText,
  generateReturnWarningHtml,
  generateReturnWarningPlainText,
  sendBookIssueConfirmationEmail,
  sendBookReturnWarningEmail,
} from '@/lib/services/email-service';
import {
  isIssueEligibleFor24hReminder,
  processDueSoonReminders,
} from '@/lib/services/reminder-service';

describe('Dispur College Book Notification & Reminder Systems', () => {
  describe('Timezone & Date Formatting (Asia/Kolkata)', () => {
    it('formats UTC ISO timestamp into Asia/Kolkata IST date and time', () => {
      // 2026-11-26T12:00:00Z -> In IST (UTC+5:30), this is 2026-11-26 17:30 (5:30 PM)
      const isoUtc = '2026-11-26T12:00:00.000Z';
      const formatted = formatToKolkataDateTime(isoUtc, true);

      expect(formatted).toContain('26 November 2026');
      expect(formatted).toContain('05:30 pm');
      expect(formatted).toContain('IST');
    });

    it('formats date-only cleanly when includeTime is false', () => {
      const isoUtc = '2026-11-26T12:00:00.000Z';
      const formatted = formatToKolkataDateTime(isoUtc, false);

      expect(formatted).toContain('26 November 2026');
      expect(formatted).not.toContain('IST');
    });

    it('gracefully handles invalid date string without throwing', () => {
      const invalid = 'not-a-valid-date';
      const formatted = formatToKolkataDateTime(invalid);
      expect(formatted).toBe('not-a-valid-date');
    });
  });

  describe('24-Hour Reminder Eligibility Window', () => {
    it('identifies an issue exactly 24 hours before due date as eligible', () => {
      const referenceNow = new Date('2026-11-25T10:00:00.000Z');
      const dueDate = new Date('2026-11-26T10:00:00.000Z'); // Exactly 24h later

      const eligible = isIssueEligibleFor24hReminder(dueDate, referenceNow);
      expect(eligible).toBe(true);
    });

    it('identifies an issue 12 hours before due date as eligible', () => {
      const referenceNow = new Date('2026-11-25T22:00:00.000Z');
      const dueDate = new Date('2026-11-26T10:00:00.000Z'); // 12h later

      const eligible = isIssueEligibleFor24hReminder(dueDate, referenceNow);
      expect(eligible).toBe(true);
    });

    it('allows slight cron buffer of up to 26 hours early', () => {
      const referenceNow = new Date('2026-11-25T08:00:00.000Z');
      const dueDate = new Date('2026-11-26T10:00:00.000Z'); // 26h later

      const eligible = isIssueEligibleFor24hReminder(dueDate, referenceNow);
      expect(eligible).toBe(true);
    });

    it('rejects an issue that is 3 days away from due date', () => {
      const referenceNow = new Date('2026-11-20T10:00:00.000Z');
      const dueDate = new Date('2026-11-26T10:00:00.000Z'); // 6 days later

      const eligible = isIssueEligibleFor24hReminder(dueDate, referenceNow);
      expect(eligible).toBe(false);
    });

    it('rejects an issue that is long past due (e.g. 5 days overdue)', () => {
      const referenceNow = new Date('2026-12-01T10:00:00.000Z');
      const dueDate = new Date('2026-11-26T10:00:00.000Z'); // 5 days in past

      const eligible = isIssueEligibleFor24hReminder(dueDate, referenceNow);
      expect(eligible).toBe(false);
    });

    it('returns false for corrupted or invalid date strings', () => {
      expect(isIssueEligibleFor24hReminder('invalid-due-date')).toBe(false);
    });
  });

  describe('System A: Automatic Book Issue Confirmation Email', () => {
    const sampleParams = {
      studentName: 'Tridip Deka',
      bookTitle: 'Advanced Database Systems',
      bookId: 'book-uuid-999',
      issueDate: '19 November 2026',
      dueDate: '26 November 2026 at 05:00 PM IST',
      portalUrl: 'https://dispurcollege.ac.in/student/dashboard',
    };

    it('generates exact plain text format as specified in Master prompt', () => {
      const text = generateIssueConfirmationPlainText(sampleParams);

      expect(text).toContain('Dear Tridip Deka,');
      expect(text).toContain('Congratulations!');
      expect(text).toContain('Your book has been successfully issued from the Dispur College Department Library.');
      expect(text).toContain('* Student Name: Tridip Deka');
      expect(text).toContain('* Book Title: Advanced Database Systems');
      expect(text).toContain('* Book ID: book-uuid-999');
      expect(text).toContain('* Issue Date: 19 November 2026');
      expect(text).toContain('* Return Deadline: 26 November 2026 at 05:00 PM IST');
      expect(text).toContain('* Status: Successfully Issued');
      expect(text).toContain('Please return your book on or before the specified deadline.');
      expect(text).toContain('Late returns may attract a fine according to the existing department library rules.');
      expect(text).toContain('Regards,\nDepartment Library\nDispur College');
    });

    it('generates rich responsive HTML email with institutional branding', () => {
      const html = generateIssueConfirmationHtml(sampleParams);

      expect(html).toContain('Dispur College');
      expect(html).toContain('Department of Professional Studies');
      expect(html).toContain('Book Issued Successfully');
      expect(html).toContain('Dear Tridip Deka,');
      expect(html).toContain('Advanced Database Systems');
      expect(html).toContain('book-uuid-999');
      expect(html).toContain('19 November 2026');
      expect(html).toContain('26 November 2026 at 05:00 PM IST');
      expect(html).toContain('Successfully Issued');
      expect(html).toContain(sampleParams.portalUrl);
      expect(html).toContain('Ganeshguri, Guwahati - 781006, Assam');
    });
  });

  describe('System B: Automatic 24-Hour Return Warning Email', () => {
    const sampleParams = {
      studentName: 'Tridip Deka',
      bookTitle: 'Advanced Database Systems',
      bookId: 'book-uuid-999',
      issueDate: '19 November 2026',
      dueDate: '26 November 2026 at 05:00 PM IST',
      portalUrl: 'https://dispurcollege.ac.in/student/dashboard',
    };

    it('generates exact plain text format as specified in Master prompt', () => {
      const text = generateReturnWarningPlainText(sampleParams);

      expect(text).toContain('Dear Tridip Deka,');
      expect(text).toContain('This is an important reminder from the Dispur College Department Library.');
      expect(text).toContain('Your book return deadline is approaching.');
      expect(text).toContain('* Book Title: Advanced Database Systems');
      expect(text).toContain('* Book ID: book-uuid-999');
      expect(text).toContain('* Issue Date: 19 November 2026');
      expect(text).toContain('* Return Deadline: 26 November 2026 at 05:00 PM IST');
      expect(text).toContain('Please submit your book to the Department Library within the next 24 hours.');
      expect(text).toContain('Failure to return the book within the permitted deadline may result in a fine according to the existing department library rules.');
      expect(text).toContain('Thank you.\n\nDepartment Library\nDispur College');
    });

    it('generates rich responsive HTML warning email with 24-hour banner', () => {
      const html = generateReturnWarningHtml(sampleParams);

      expect(html).toContain('Dispur College');
      expect(html).toContain('Department of Professional Studies');
      expect(html).toContain('24-Hour Return Warning: Deadline Tomorrow');
      expect(html).toContain('Dear Tridip Deka,');
      expect(html).toContain('Advanced Database Systems');
      expect(html).toContain('book-uuid-999');
      expect(html).toContain('26 November 2026 at 05:00 PM IST');
      expect(html).toContain('within the next 24 hours');
      expect(html).toContain(sampleParams.portalUrl);
      expect(html).toContain('Ganeshguri, Guwahati - 781006, Assam');
    });
  });

  describe('Email Dispatcher Simulation & Resend Handling', () => {
    it('simulates safe issue confirmation dispatch when RESEND_API_KEY is unset', async () => {
      const origKey = process.env.RESEND_API_KEY;
      delete process.env.RESEND_API_KEY;

      const result = await sendBookIssueConfirmationEmail({
        recipientEmail: 'student@dispurcollege.ac.in',
        studentName: 'Tridip Deka',
        bookTitle: 'Cloud Computing Architecture',
        bookId: 'book-cc-101',
        issueId: 'iss-abc-123',
        issueDate: '2026-11-19T00:00:00.000Z',
        dueDate: '2026-11-26T00:00:00.000Z',
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('simulation');
      expect(result.skipped).toBe(true);
      expect(result.emailId).toContain('sim_');

      if (origKey) process.env.RESEND_API_KEY = origKey;
    });

    it('simulates safe return warning dispatch when RESEND_API_KEY is unset', async () => {
      const origKey = process.env.RESEND_API_KEY;
      delete process.env.RESEND_API_KEY;

      const result = await sendBookReturnWarningEmail({
        recipientEmail: 'student@dispurcollege.ac.in',
        studentName: 'Tridip Deka',
        bookTitle: 'Cloud Computing Architecture',
        bookId: 'book-cc-101',
        issueId: 'iss-abc-123',
        issueDate: '2026-11-19T00:00:00.000Z',
        dueDate: '2026-11-26T00:00:00.000Z',
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('simulation');
      expect(result.skipped).toBe(true);
      expect(result.emailId).toContain('sim_');

      if (origKey) process.env.RESEND_API_KEY = origKey;
    });
  });

  describe('Reminder Processing Engine & Idempotency', () => {
    it('skips loans if already marked sent in book_return_reminders (Idempotency)', async () => {
      const mockIssue = {
        id: 'issue-id-101',
        student_id: 'student-uuid-1',
        book_id: 'book-uuid-1',
        issue_date: '2026-11-19T10:00:00.000Z',
        due_date: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(), // due in 20h
        return_date: null,
        status: 'issued',
        fine_per_day: 5,
        books: { id: 'book-uuid-1', title: 'Operating System Concepts' },
      };

      const mockExistingReminder = {
        id: 'rem-1',
        issue_id: 'issue-id-101',
        due_date: mockIssue.due_date,
        reminder_type: 'BOOK_RETURN_REMINDER',
        status: 'sent',
        recipient_email: 'student@dispurcollege.ac.in',
        student_name: 'Test Student',
        email_id: 'resend_email_id_previously_sent',
      };

      const mockSupabaseAdmin = {
        from: vi.fn((table: string) => {
          if (table === 'book_issues') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              is: vi.fn().mockResolvedValue({ data: [mockIssue], error: null }),
            };
          }
          if (table === 'book_return_reminders') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: mockExistingReminder, error: null }),
              insert: vi.fn().mockResolvedValue({ data: null, error: null }),
              update: vi.fn().mockReturnThis(),
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }),
      } as unknown as Parameters<typeof processDueSoonReminders>[0];

      const summary = await processDueSoonReminders(mockSupabaseAdmin);

      expect(summary.totalEligibleFound).toBe(1);
      expect(summary.processedCount).toBe(1);
      expect(summary.sentCount).toBe(0);
      expect(summary.skippedCount).toBe(1);
      expect(summary.results[0].status).toBe('skipped');
    });

    it('processes eligible loan and records successful reminder with BOOK_RETURN_REMINDER type', async () => {
      const mockIssue = {
        id: 'issue-id-202',
        student_id: 'student-uuid-2',
        book_id: 'book-uuid-2',
        issue_date: '2026-11-19T10:00:00.000Z',
        due_date: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(), // due in 18h
        return_date: null,
        status: 'issued',
        fine_per_day: 5,
        books: { id: 'book-uuid-2', title: 'Data Structures with C++' },
      };

      const mockStudent = {
        id: 'student-uuid-2',
        full_name: 'Rahul Sarma',
        email: 'rahul.sarma@dispurcollege.ac.in',
      };

      const insertSpy = vi.fn().mockResolvedValue({ data: null, error: null });

      const mockSupabaseAdmin = {
        from: vi.fn((table: string) => {
          if (table === 'book_issues') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              is: vi.fn().mockResolvedValue({ data: [mockIssue], error: null }),
            };
          }
          if (table === 'book_return_reminders') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }), // No prior reminder
              insert: insertSpy,
            };
          }
          if (table === 'students') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: mockStudent, error: null }),
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }),
      } as unknown as Parameters<typeof processDueSoonReminders>[0];

      const summary = await processDueSoonReminders(mockSupabaseAdmin);

      expect(summary.totalEligibleFound).toBe(1);
      expect(summary.processedCount).toBe(1);
      expect(summary.sentCount).toBe(1);
      expect(summary.skippedCount).toBe(0);
      expect(summary.results[0].status).toBe('sent');
      expect(summary.results[0].recipientEmail).toBe('rahul.sarma@dispurcollege.ac.in');
      expect(insertSpy).toHaveBeenCalledTimes(1);
      const insertedArg = insertSpy.mock.calls[0][0];
      expect(insertedArg.reminder_type).toBe('BOOK_RETURN_REMINDER');
      expect(insertedArg.recipient_email).toBe('rahul.sarma@dispurcollege.ac.in');
    });
  });
});
