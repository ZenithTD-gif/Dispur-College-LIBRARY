import { describe, expect, it } from 'vitest';
import {
  calculateRentalDetails,
  issueBookSchema,
  librarySettingsUpdateSchema,
  returnBookSchema,
  studentProfileUpdateSchema,
  studentRegistrationSchema,
} from '@/lib/validation';

describe('Student Registration Schema Validation', () => {
  const validStudent = {
    fullName: 'Rahul Sharma',
    registrationNumber: 'GU202300456',
    collegeRollNumber: 'BCA-23-014',
    department: 'Bachelor of Computer Applications (BCA)',
    semester: '3rd Semester',
    email: 'rahul.sharma@dispurcollege.ac.in',
    phone: '9876543210',
    password: 'password123',
    confirmPassword: 'password123',
  };

  it('validates a complete and correct student registration payload', () => {
    const result = studentRegistrationSchema.safeParse(validStudent);
    expect(result.success).toBe(true);
  });

  it('fails if passwords do not match', () => {
    const result = studentRegistrationSchema.safeParse({
      ...validStudent,
      confirmPassword: 'differentpassword',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Passwords do not match');
    }
  });

  it('fails if password is shorter than 6 characters', () => {
    const result = studentRegistrationSchema.safeParse({
      ...validStudent,
      password: '123',
      confirmPassword: '123',
    });
    expect(result.success).toBe(false);
  });

  it('fails if email is invalid', () => {
    const result = studentRegistrationSchema.safeParse({
      ...validStudent,
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('fails if GU Registration Number is missing or too short', () => {
    const result = studentRegistrationSchema.safeParse({
      ...validStudent,
      registrationNumber: 'ab',
    });
    expect(result.success).toBe(false);
  });

  it('fails if College Roll Number is empty', () => {
    const result = studentRegistrationSchema.safeParse({
      ...validStudent,
      collegeRollNumber: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('Student Profile Update Schema', () => {
  it('allows updating permitted fields: name, department, semester, phone', () => {
    const result = studentProfileUpdateSchema.safeParse({
      fullName: 'Rahul S. Sharma',
      department: 'Information Technology (IT)',
      semester: '4th Semester',
      phone: '9876543211',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid phone numbers', () => {
    const result = studentProfileUpdateSchema.safeParse({
      phone: 'abc',
    });
    expect(result.success).toBe(false);
  });
});

describe('Free Borrowing Policy & Automatic Fine Calculation', () => {
  it('calculates 0 fine and remaining days when book is within 7-day free borrowing period', () => {
    const now = new Date();
    // Issued 2 days ago, due in 5 days (7-day period)
    const issueDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const dueDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();

    const rental = {
      issue_date: issueDate,
      due_date: dueDate,
      return_date: null,
      status: 'issued',
      daily_fine_rate_snapshot: 5.0,
      fine_amount: 0,
      fine_paid: false,
    };

    const result = calculateRentalDetails(rental, 5.0);

    expect(result.is_overdue).toBe(false);
    expect(result.overdue_days).toBe(0);
    expect(result.calculated_fine).toBe(0);
    expect(result.remaining_days).toBeGreaterThanOrEqual(4);
    expect(result.remaining_days).toBeLessThanOrEqual(5);
  });

  it('calculates overdue days and late return fine when book exceeds 7-day period', () => {
    const now = new Date();
    // Issued 10 days ago, due 3 days ago (overdue by 3 days)
    const issueDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const dueDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();

    const rental = {
      issue_date: issueDate,
      due_date: dueDate,
      return_date: null,
      status: 'issued',
      daily_fine_rate_snapshot: 5.0,
      fine_amount: 0,
      fine_paid: false,
    };

    const result = calculateRentalDetails(rental, 5.0);

    expect(result.is_overdue).toBe(true);
    expect(result.remaining_days).toBe(0);
    expect(result.overdue_days).toBe(3);
    // At ₹5/day for 3 days = ₹15
    expect(result.calculated_fine).toBe(15);
  });

  it('adapts fine calculation to configurable daily fine rate (e.g. ₹10 per day)', () => {
    const now = new Date();
    // Issued 12 days ago, due 5 days ago (overdue by 5 days)
    const issueDate = new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString();
    const dueDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();

    const rental = {
      issue_date: issueDate,
      due_date: dueDate,
      return_date: null,
      status: 'issued',
      daily_fine_rate_snapshot: 10.0,
      fine_amount: 0,
      fine_paid: false,
    };

    // Admin configured fine rate = ₹10
    const result = calculateRentalDetails(rental, 10.0);

    expect(result.is_overdue).toBe(true);
    expect(result.overdue_days).toBe(5);
    // 5 days * ₹10 = ₹50
    expect(result.calculated_fine).toBe(50);
  });

  it('finalizes fine calculation when a book was returned after due date', () => {
    const issueDate = '2026-10-01T10:00:00.000Z';
    const dueDate = '2026-10-08T10:00:00.000Z'; // 7 days later
    const returnDate = '2026-10-12T10:00:00.000Z'; // 4 days overdue

    const rental = {
      issue_date: issueDate,
      due_date: dueDate,
      return_date: returnDate,
      status: 'returned',
      daily_fine_rate_snapshot: 5.0,
      fine_amount: 20.0, // 4 days * ₹5 = ₹20
      fine_paid: true,
    };

    const result = calculateRentalDetails(rental, 5.0);

    expect(result.is_overdue).toBe(true);
    expect(result.overdue_days).toBe(4);
    expect(result.calculated_fine).toBe(20.0);
  });

  it('records 0 fine when a book was returned on or before the due date', () => {
    const issueDate = '2026-10-01T10:00:00.000Z';
    const dueDate = '2026-10-08T10:00:00.000Z';
    const returnDate = '2026-10-06T10:00:00.000Z'; // returned in 5 days (on time)

    const rental = {
      issue_date: issueDate,
      due_date: dueDate,
      return_date: returnDate,
      status: 'returned',
      daily_fine_rate_snapshot: 5.0,
      fine_amount: 0.0,
      fine_paid: true,
    };

    const result = calculateRentalDetails(rental, 5.0);

    expect(result.is_overdue).toBe(false);
    expect(result.overdue_days).toBe(0);
    expect(result.calculated_fine).toBe(0.0);
  });
});

describe('Issue & Return Schemas', () => {
  it('validates issueBookSchema correctly', () => {
    const valid = {
      studentId: '11111111-1111-4111-8111-111111111111',
      bookId: '22222222-2222-4222-8222-222222222222',
      issueDate: '2026-11-13T10:00:00.000Z',
      borrowingPeriodDays: 7,
      notes: 'Copy in excellent shape',
    };
    expect(issueBookSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects invalid UUIDs in issueBookSchema', () => {
    const invalid = {
      studentId: 'invalid-id',
      bookId: 'not-a-uuid',
    };
    expect(issueBookSchema.safeParse(invalid).success).toBe(false);
  });

  it('validates returnBookSchema correctly', () => {
    const valid = {
      rentalId: '11111111-1111-4111-8111-111111111111',
      returnDate: '2026-11-20T10:00:00.000Z',
      fineAmount: 15,
      finePaid: true,
      notes: 'Book returned in good condition',
    };
    expect(returnBookSchema.safeParse(valid).success).toBe(true);
  });
});

describe('Library Settings Schema', () => {
  it('validates fine rate and borrowing period settings', () => {
    const valid = {
      dailyFineRate: 5.0,
      borrowingPeriodDays: 7,
      maxBooksPerStudent: 3,
    };
    expect(librarySettingsUpdateSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects negative fine rates', () => {
    const invalid = {
      dailyFineRate: -5.0,
      borrowingPeriodDays: 7,
      maxBooksPerStudent: 3,
    };
    expect(librarySettingsUpdateSchema.safeParse(invalid).success).toBe(false);
  });

  it('rejects 0 or negative borrowing period days', () => {
    const invalid = {
      dailyFineRate: 5.0,
      borrowingPeriodDays: 0,
      maxBooksPerStudent: 3,
    };
    expect(librarySettingsUpdateSchema.safeParse(invalid).success).toBe(false);
  });
});

