import { redirect } from 'next/navigation';
import { RentalsManager } from '@/components/admin/RentalsManager';
import { getCurrentAdmin } from '@/lib/auth/admin';
import { isSupabaseConfigured } from '@/lib/env';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getPublicCoverUrl } from '@/lib/supabase/storage';
import { calculateRentalDetails } from '@/lib/validation';
import type {
  BookRentalWithDetails,
  LibrarySettings,
  RentalOverviewStats,
  Student,
} from '@/types/library';

export const dynamic = 'force-dynamic';

export default async function AdminRentalsPage() {
  if (!isSupabaseConfigured()) {
    redirect('/admin/login');
  }

  const auth = await getCurrentAdmin();
  if (!auth) {
    redirect('/admin/login');
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    redirect('/admin/login');
  }

  // 1. Fetch library settings
  const { data: rawSettings } = await adminClient
    .from('library_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  const settings: LibrarySettings = rawSettings
    ? {
        ...rawSettings,
        daily_fine_rate: Number(rawSettings.daily_fine_rate),
        borrowing_period_days: Number(rawSettings.borrowing_period_days),
        max_books_per_student: Number(rawSettings.max_books_per_student),
      }
    : {
        id: 1,
        daily_fine_rate: 5,
        borrowing_period_days: 7,
        max_books_per_student: 3,
        currency_symbol: '₹',
        updated_at: new Date().toISOString(),
        updated_by: null,
      };

  // 2. Fetch all rentals
  const { data: rawRentals } = await adminClient
    .from('book_rentals')
    .select(`
      *,
      book:books (
        id,
        title,
        author,
        subject,
        cover_image_path,
        file_type,
        allow_download
      ),
      student:students (
        id,
        full_name,
        registration_number,
        college_roll_number,
        department,
        semester,
        email,
        phone
      )
    `)
    .order('created_at', { ascending: false });

  const rentals: BookRentalWithDetails[] = [];
  let activeRentalsCount = 0;
  let overdueRentalsCount = 0;
  let returnedRentalsCount = 0;
  let totalOutstandingFines = 0;

  for (const raw of rawRentals || []) {
    const details = calculateRentalDetails(raw, settings.daily_fine_rate);
    const bookObj = raw.book
      ? {
          ...raw.book,
          cover_url: getPublicCoverUrl(raw.book.cover_image_path),
        }
      : null;

    const rental: BookRentalWithDetails = {
      ...raw,
      daily_fine_rate_snapshot: Number(raw.daily_fine_rate_snapshot),
      fine_amount: Number(raw.fine_amount),
      book: bookObj,
      student: raw.student ?? null,
      remaining_days: details.remaining_days,
      overdue_days: details.overdue_days,
      calculated_fine: details.calculated_fine,
      is_overdue: details.is_overdue,
    };

    if (raw.status === 'issued') {
      activeRentalsCount++;
      if (details.is_overdue) {
        overdueRentalsCount++;
        totalOutstandingFines += details.calculated_fine;
      }
    } else if (raw.status === 'returned') {
      returnedRentalsCount++;
      if (!raw.fine_paid && details.calculated_fine > 0) {
        totalOutstandingFines += details.calculated_fine;
      }
    }

    rentals.push(rental);
  }

  // 3. Fetch all students with loan stats
  const { data: rawStudents } = await adminClient
    .from('students')
    .select(`
      *,
      rentals:book_rentals (
        id,
        status,
        fine_amount,
        fine_paid
      )
    `)
    .order('created_at', { ascending: false });

  const studentsList = (rawStudents || []).map((s) => {
    const rList = (s.rentals as Array<{
      id: string;
      status: string;
      fine_amount: number;
      fine_paid: boolean;
    }>) || [];

    const activeLoans = rList.filter((r) => r.status === 'issued').length;
    const totalLoans = rList.length;
    const unpaidFines = rList.reduce((sum, r) => {
      if (!r.fine_paid && Number(r.fine_amount) > 0) {
        return sum + Number(r.fine_amount);
      }
      return sum;
    }, 0);

    const { rentals: omittedRentals, ...studentInfo } = s;
    void omittedRentals;
    return {
      ...(studentInfo as Student),
      active_loans: activeLoans,
      total_loans: totalLoans,
      unpaid_fines: unpaidFines,
    };
  });

  // 4. Fetch all books for dropdown
  const { data: booksData } = await adminClient
    .from('books')
    .select('id, title, author, subject')
    .order('title', { ascending: true });

  const stats: RentalOverviewStats = {
    totalRentals: rentals.length,
    activeRentals: activeRentalsCount,
    overdueRentals: overdueRentalsCount,
    returnedRentals: returnedRentalsCount,
    totalStudents: studentsList.length,
    totalOutstandingFines,
  };

  return (
    <RentalsManager
      initialRentals={rentals}
      initialStats={stats}
      initialSettings={settings}
      initialStudents={studentsList}
      booksList={booksData || []}
    />
  );
}
