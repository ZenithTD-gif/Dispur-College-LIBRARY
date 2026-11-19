import { describe, expect, it } from 'vitest';
import { calculateServerSideFine } from '@/lib/services/fine-calculator';

describe('Server-Side Fine Calculation Service', () => {
  it('calculates 0 fine when book is within 7-day free borrowing period', () => {
    const issueDate = new Date();
    const dueDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days in future

    const result = calculateServerSideFine(
      issueDate.toISOString(),
      dueDate.toISOString(),
      null,
      5.0
    );

    expect(result.isOverdue).toBe(false);
    expect(result.overdueDays).toBe(0);
    expect(result.remainingDays).toBeGreaterThanOrEqual(4);
    expect(result.fineAmount).toBe(0.0);
  });

  it('calculates 0 fine on the exact due date', () => {
    const issueDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dueDate = new Date(); // due today

    const result = calculateServerSideFine(
      issueDate.toISOString(),
      dueDate.toISOString(),
      null,
      5.0
    );

    expect(result.isOverdue).toBe(false);
    expect(result.overdueDays).toBe(0);
    expect(result.fineAmount).toBe(0.0);
  });

  it('calculates exact fine when 3 days overdue at ₹5.00/day', () => {
    const issueDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const dueDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago

    const result = calculateServerSideFine(
      issueDate.toISOString(),
      dueDate.toISOString(),
      null,
      5.0
    );

    expect(result.isOverdue).toBe(true);
    expect(result.overdueDays).toBe(3);
    expect(result.remainingDays).toBe(0);
    expect(result.fineAmount).toBe(15.0);
  });

  it('calculates exact fine with custom fine rate (e.g. ₹12.50/day for 4 days)', () => {
    const issueDate = new Date(Date.now() - 11 * 24 * 60 * 60 * 1000);
    const dueDate = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);

    const result = calculateServerSideFine(
      issueDate.toISOString(),
      dueDate.toISOString(),
      null,
      12.5
    );

    expect(result.isOverdue).toBe(true);
    expect(result.overdueDays).toBe(4);
    expect(result.fineAmount).toBe(50.0);
  });

  it('stops accumulating fine on the return date when book is returned late', () => {
    const issueDate = new Date('2026-11-01T10:00:00Z');
    const dueDate = new Date('2026-11-08T10:00:00Z'); // 7 days later
    const returnDate = new Date('2026-11-10T10:00:00Z'); // returned 2 days late

    const result = calculateServerSideFine(
      issueDate.toISOString(),
      dueDate.toISOString(),
      returnDate.toISOString(),
      5.0
    );

    expect(result.isOverdue).toBe(true);
    expect(result.overdueDays).toBe(2);
    expect(result.fineAmount).toBe(10.0);
  });

  it('calculates 0 fine when returned on or before due date', () => {
    const issueDate = new Date('2026-11-01T10:00:00Z');
    const dueDate = new Date('2026-11-08T10:00:00Z');
    const returnDate = new Date('2026-11-05T10:00:00Z'); // returned early

    const result = calculateServerSideFine(
      issueDate.toISOString(),
      dueDate.toISOString(),
      returnDate.toISOString(),
      5.0
    );

    expect(result.isOverdue).toBe(false);
    expect(result.overdueDays).toBe(0);
    expect(result.fineAmount).toBe(0.0);
  });
});
