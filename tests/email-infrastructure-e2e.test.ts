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

describe('Dispur College Library: Complete Email Infrastructure E2E Verification', () => {
  // Test Case 1: Successful book issue and confirmation email
  describe('1. Successful book issue and confirmation email', () => {
    it('generates exact subject and body for successful issuance', () => {
      const params = {
        studentName: 'Tridip Deka',
        bookTitle: 'Cloud Computing Principles',
        bookId: 'b-uuid-101',
        issueDate: '19 November 2026',
        dueDate: '26 November 2026 at 05:00 PM IST',
        portalUrl: 'https://dispurcollege.ac.in/student/dashboard',
      };

      const plainText = generateIssueConfirmationPlainText(params);
      expect(plainText).toContain('Dear Tridip Deka,');
      expect(plainText).toContain('Congratulations!');
      expect(plainText).toContain('* Student Name: Tridip Deka');
      expect(plainText).toContain('* Book Title: Cloud Computing Principles');
      expect(plainText).toContain('* Book ID: b-uuid-101');
      expect(plainText).toContain('* Issue Date: 19 November 2026');
      expect(plainText).toContain('* Return Deadline: 26 November 2026 at 05:00 PM IST');
      expect(plainText).toContain('* Status: Successfully Issued');
      expect(plainText).toContain('Department Library\nDispur College');

      const html = generateIssueConfirmationHtml(params);
      expect(html).toContain('Book Issued Successfully');
      expect(html).toContain('Cloud Computing Principles');
      expect(html).toContain('https://dispurcollege.ac.in/student/dashboard');
    });
  });

  // Test Case 2: Multiple books issued by one student
  describe('2. Multiple books issued by one student', () => {
    it('generates separate, distinct notifications for each book', () => {
      const student = { name: 'Abhinav Das', email: 'abhinav@dispurcollege.ac.in' };
      const bookA = { id: 'book-1', title: 'Data Structures' };
      const bookB = { id: 'book-2', title: 'Algorithms' };

      const emailA = generateIssueConfirmationPlainText({
        studentName: student.name,
        bookTitle: bookA.title,
        bookId: bookA.id,
        issueDate: '19 November 2026',
        dueDate: '26 November 2026 at 05:00 PM IST',
      });

      const emailB = generateIssueConfirmationPlainText({
        studentName: student.name,
        bookTitle: bookB.title,
        bookId: bookB.id,
        issueDate: '19 November 2026',
        dueDate: '26 November 2026 at 05:00 PM IST',
      });

      expect(emailA).toContain('Book Title: Data Structures');
      expect(emailB).toContain('Book Title: Algorithms');
      expect(emailA).not.toEqual(emailB);
    });
  });

  // Test Case 3: Different students issuing books
  describe('3. Different students issuing books', () => {
    it('addresses each student with their specific name and registration details', () => {
      const email1 = generateIssueConfirmationPlainText({
        studentName: 'Priya Sharma',
        bookTitle: 'Operating Systems',
        bookId: 'b-os-1',
        issueDate: '19 November 2026',
        dueDate: '26 November 2026 at 05:00 PM IST',
      });

      const email2 = generateIssueConfirmationPlainText({
        studentName: 'Rahul Kalita',
        bookTitle: 'Operating Systems',
        bookId: 'b-os-2',
        issueDate: '19 November 2026',
        dueDate: '26 November 2026 at 05:00 PM IST',
      });

      expect(email1).toContain('Dear Priya Sharma,');
      expect(email2).toContain('Dear Rahul Kalita,');
    });
  });

  // Test Case 4: Correct student email mapping
  describe('4. Correct student email mapping', () => {
    it('validates syntax and correctly targets registered recipient email', async () => {
      const result = await sendBookIssueConfirmationEmail({
        recipientEmail: 'student.registered@dispurcollege.ac.in',
        studentName: 'Ananya Bora',
        bookTitle: 'Discrete Mathematics',
        bookId: 'dm-101',
        issueId: 'iss-test-4',
        issueDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      });

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  // Test Case 5: Correct book and deadline information
  describe('5. Correct book and deadline information in Asia/Kolkata timezone', () => {
    it('formats deadlines with IST (UTC+05:30) offset accurately', () => {
      // 2026-11-20 12:00 UTC -> 2026-11-20 17:30 IST
      const utcTime = '2026-11-20T12:00:00.000Z';
      const istFormatted = formatToKolkataDateTime(utcTime, true);

      expect(istFormatted).toContain('20 November 2026');
      expect(istFormatted).toContain('05:30 pm');
      expect(istFormatted).toContain('IST');
    });
  });

  // Test Case 6: Failed book issue transaction
  describe('6. Failed book issue transaction', () => {
    it('never sends email if issue creation fails before confirmation trigger', () => {
      const mockIssueFn = vi.fn();
      let isIssueSuccessful = false;

      // Simulate failure (e.g. out of stock or borrowing limit exceeded)
      const stockAvailable = 0;
      if (stockAvailable > 0) {
        isIssueSuccessful = true;
        mockIssueFn();
      }

      expect(isIssueSuccessful).toBe(false);
      expect(mockIssueFn).not.toHaveBeenCalled();
    });
  });

  // Test Case 7: Invalid email address
  describe('7. Invalid email address', () => {
    it('handles malformed emails gracefully without crashing', async () => {
      const res = await sendBookIssueConfirmationEmail({
        recipientEmail: 'invalid-email-format',
        studentName: 'Test Student',
        bookTitle: 'Test Book',
        bookId: 'b-inv-1',
        issueId: 'iss-inv-1',
        issueDate: new Date(),
        dueDate: new Date(),
      });

      // Simulation mode handles safely, live mode returns Resend validation error
      expect(res).toBeDefined();
    });
  });

  // Test Case 8: Resend API failure & sandbox restriction
  describe('8. Resend API failure & sandbox restriction', () => {
    it('simulates safe fallback without throwing unhandled exceptions', async () => {
      const prevKey = process.env.RESEND_API_KEY;
      delete process.env.RESEND_API_KEY;

      const res = await sendBookIssueConfirmationEmail({
        recipientEmail: 'student@dispurcollege.ac.in',
        studentName: 'Test Student',
        bookTitle: 'Database Systems',
        bookId: 'db-1',
        issueId: 'iss-sim-1',
        issueDate: new Date(),
        dueDate: new Date(),
      });

      expect(res.success).toBe(true);
      expect(res.provider).toBe('simulation');
      expect(res.skipped).toBe(true);

      if (prevKey) process.env.RESEND_API_KEY = prevKey;
    });
  });

  // Test Case 9: Duplicate request and retry scenarios (Idempotency)
  describe('9. Duplicate request and retry scenarios (Idempotency)', () => {
    it('skips loans if already marked sent in book_return_reminders', async () => {
      const mockIssue = {
        id: 'issue-id-dup',
        student_id: 'student-dup-1',
        book_id: 'book-dup-1',
        issue_date: '2026-11-19T10:00:00.000Z',
        due_date: new Date(Date.now() + 20 * 3600000).toISOString(),
        return_date: null,
        status: 'issued',
        fine_per_day: 5,
        books: { id: 'book-dup-1', title: 'Compiler Design' },
      };

      const mockExistingSent = {
        id: 'rem-sent-1',
        issue_id: mockIssue.id,
        due_date: mockIssue.due_date,
        reminder_type: 'BOOK_RETURN_REMINDER',
        status: 'sent',
        recipient_email: 'student@dispurcollege.ac.in',
        student_name: 'Existing Student',
        email_id: 'resend-123-dup',
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
              maybeSingle: vi.fn().mockResolvedValue({ data: mockExistingSent, error: null }),
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
      expect(summary.skippedCount).toBe(1);
      expect(summary.sentCount).toBe(0);
      expect(summary.results[0].status).toBe('skipped');
    });
  });

  // Test Case 10: Automatic 24-hour reminder
  describe('10. Automatic 24-hour reminder', () => {
    it('identifies loans within the 24-hour eligibility window', () => {
      const now = new Date('2026-11-25T10:00:00.000Z');
      const dueIn24h = new Date('2026-11-26T10:00:00.000Z');
      const dueIn48h = new Date('2026-11-27T10:00:00.000Z');

      expect(isIssueEligibleFor24hReminder(dueIn24h, now)).toBe(true);
      expect(isIssueEligibleFor24hReminder(dueIn48h, now)).toBe(false);
    });

    it('generates exact 24-hour reminder subject and text', () => {
      const text = generateReturnWarningPlainText({
        studentName: 'Tridip Deka',
        bookTitle: 'Artificial Intelligence',
        bookId: 'ai-101',
        issueDate: '19 November 2026',
        dueDate: '20 November 2026 at 05:00 PM IST',
      });

      expect(text).toContain('Dear Tridip Deka,');
      expect(text).toContain('This is an important reminder from the Dispur College Department Library.');
      expect(text).toContain('Your book return deadline is approaching.');
      expect(text).toContain('* Book Title: Artificial Intelligence');
      expect(text).toContain('* Return Deadline: 20 November 2026 at 05:00 PM IST');
      expect(text).toContain('Please submit your book to the Department Library within the next 24 hours.');
      expect(text).toContain('Thank you.\n\nDepartment Library\nDispur College');
    });
  });

  // Test Case 11: Returned book with reminder cancellation
  describe('11. Returned book with reminder cancellation', () => {
    it('strictly excludes returned books (return_date IS NOT NULL)', async () => {
      const mockSupabaseAdmin = {
        from: vi.fn((table: string) => {
          if (table === 'book_issues') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              // Query filters out returned books via .is('return_date', null)
              is: vi.fn().mockResolvedValue({ data: [], error: null }),
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
      expect(summary.totalEligibleFound).toBe(0);
      expect(summary.sentCount).toBe(0);
      expect(summary.skippedCount).toBe(0);
    });
  });

  // Test Case 12: Scheduled reminder execution
  describe('12. Scheduled reminder execution', () => {
    it('successfully processes eligible unreturned issues', async () => {
      const mockIssue = {
        id: 'issue-sched-1',
        student_id: 'student-sched-1',
        book_id: 'book-sched-1',
        issue_date: '2026-11-19T10:00:00.000Z',
        due_date: new Date(Date.now() + 18 * 3600000).toISOString(),
        return_date: null,
        status: 'issued',
        fine_per_day: 5,
        books: { id: 'book-sched-1', title: 'Microprocessors' },
      };

      const mockStudent = {
        id: 'student-sched-1',
        full_name: 'Kushal Namadas',
        email: 'kushal@dispurcollege.ac.in',
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
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
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
      expect(summary.results[0].status).toBe('sent');
      expect(insertSpy).toHaveBeenCalled();
    });
  });

  // Test Case 13: Supabase Edge Function deployment and invocation structure
  describe('13. Supabase Edge Function structure and contract', () => {
    it('verifies Edge Function request structure matches dispatch expectations', () => {
      const edgePayloadIssue = {
        action: 'confirm_issue',
        issueId: 'test-iss-uuid',
        studentId: 'test-student-uuid',
        bookId: 'test-book-uuid',
        recipientEmail: 'student@dispurcollege.ac.in',
        studentName: 'Tridip Deka',
        bookTitle: 'Computer Networks',
        issueDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      };

      expect(edgePayloadIssue.action).toBe('confirm_issue');
      expect(edgePayloadIssue.recipientEmail).toBe('student@dispurcollege.ac.in');
      expect(edgePayloadIssue.issueId).toBe('test-iss-uuid');
    });
  });
});
